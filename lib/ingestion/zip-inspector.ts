import { inflateRawSync } from "node:zlib";
import { isApprovedFileExtension, sanitizeFiles } from "../scanner/index";
import type { RepositoryFile } from "../scanner/types";

export const ZIP_INGESTION_LIMITS = {
  maxCompressedBytes: 10 * 1024 * 1024,
  maxExpandedBytes: 50 * 1024 * 1024,
  maxEntries: 500,
  maxFileBytes: 512 * 1024,
  maxPathCharacters: 240,
  maxDirectoryDepth: 12,
  maxFileCompressionRatio: 100,
  maxOverallCompressionRatio: 30,
} as const;

export type ZipRejectionCode =
  | "ZIP_SIGNATURE_INVALID"
  | "ZIP_STRUCTURE_INVALID"
  | "ZIP_FEATURE_UNSUPPORTED"
  | "ZIP_ENTRY_TYPE_REJECTED"
  | "ZIP_PATH_REJECTED"
  | "ZIP_COLLISION_REJECTED"
  | "ZIP_NESTED_ARCHIVE_REJECTED"
  | "ZIP_LIMIT_EXCEEDED"
  | "ZIP_TEXT_INVALID";

export class ZipInspectionError extends Error {
  constructor(public readonly code: ZipRejectionCode) {
    super(code);
    this.name = "ZipInspectionError";
  }
}

export type ZipEntryMetadata = {
  path: string;
  compressedBytes: number;
  expandedBytes: number;
  compressionMethod: 0 | 8;
  directory: boolean;
  scannerEligible: boolean;
  dataOffset: number;
  crc32: number;
};

export type ZipInspection = {
  archiveName: string;
  compressedBytes: number;
  expandedBytes: number;
  entryCount: number;
  acceptedFileCount: number;
  ignoredFileCount: number;
  entries: ZipEntryMetadata[];
};

const NESTED_ARCHIVE_EXTENSIONS = new Set([
  ".zip", ".jar", ".war", ".ear", ".tar", ".tgz", ".gz", ".bz2", ".xz", ".7z", ".rar",
]);
const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

function reject(code: ZipRejectionCode): never {
  throw new ZipInspectionError(code);
}

function u16(view: DataView, offset: number) {
  if (offset < 0 || offset + 2 > view.byteLength) reject("ZIP_STRUCTURE_INVALID");
  return view.getUint16(offset, true);
}

function u32(view: DataView, offset: number) {
  if (offset < 0 || offset + 4 > view.byteLength) reject("ZIP_STRUCTURE_INVALID");
  return view.getUint32(offset, true);
}

function findEocd(view: DataView) {
  const minimumOffset = Math.max(0, view.byteLength - 65_557);
  for (let offset = view.byteLength - 22; offset >= minimumOffset; offset -= 1) {
    if (u32(view, offset) === EOCD_SIGNATURE && offset + 22 + u16(view, offset + 20) === view.byteLength) {
      return offset;
    }
  }
  reject("ZIP_STRUCTURE_INVALID");
}

function decodePath(bytes: Uint8Array, utf8: boolean) {
  if (!utf8 && bytes.some((byte) => byte > 0x7f)) reject("ZIP_FEATURE_UNSUPPORTED");
  try {
    return new TextDecoder(utf8 ? "utf-8" : "us-ascii", { fatal: true }).decode(bytes);
  } catch {
    reject("ZIP_PATH_REJECTED");
  }
}

function extension(path: string) {
  const dot = path.lastIndexOf(".");
  return dot < 0 ? "" : path.slice(dot).toLowerCase();
}

function validatePath(rawPath: string, directory: boolean) {
  const path = directory && rawPath.endsWith("/") ? rawPath.slice(0, -1) : rawPath;
  if (
    !path ||
    path.startsWith("/") ||
    path.startsWith("//") ||
    /^[a-zA-Z]:/.test(path) ||
    /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(path) ||
    path.includes("\\") ||
    path.includes("\0")
  ) reject("ZIP_PATH_REJECTED");
  const segments = path.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) reject("ZIP_PATH_REJECTED");
  if ([...path].length > ZIP_INGESTION_LIMITS.maxPathCharacters) reject("ZIP_LIMIT_EXCEEDED");
  if (segments.length - 1 > ZIP_INGESTION_LIMITS.maxDirectoryDepth) reject("ZIP_LIMIT_EXCEEDED");
  return path;
}

function collisionKeys(path: string) {
  const trimPlatformAmbiguity = (value: string) =>
    value.split("/").map((segment) => segment.replace(/[. ]+$/g, "")).join("/");
  return [
    `exact:${path}`,
    `nfc:${path.normalize("NFC")}`,
    `nfkc:${path.normalize("NFKC")}`,
    `case:${path.toLocaleLowerCase("en-US")}`,
    `platform:${trimPlatformAmbiguity(path).toLocaleLowerCase("en-US")}`,
  ];
}

function entryType(versionMadeBy: number, externalAttributes: number, rawPath: string) {
  const hostSystem = versionMadeBy >>> 8;
  const unixMode = externalAttributes >>> 16;
  const unixType = unixMode & 0o170000;
  const dosDirectory = (externalAttributes & 0x10) !== 0;
  const namedDirectory = rawPath.endsWith("/");
  if (hostSystem === 3) {
    if (unixType === 0 || (unixType !== 0o100000 && unixType !== 0o040000)) {
      reject("ZIP_ENTRY_TYPE_REJECTED");
    }
  }
  const modeDirectory = hostSystem === 3 && unixType === 0o040000;
  if ((modeDirectory || dosDirectory) !== namedDirectory && (modeDirectory || dosDirectory || namedDirectory)) {
    reject("ZIP_STRUCTURE_INVALID");
  }
  return namedDirectory;
}

function validateLocalHeader(
  view: DataView,
  bytes: Uint8Array,
  localOffset: number,
  centralOffset: number,
  expectedPathBytes: Uint8Array,
  flags: number,
  method: number,
  expectedCrc32: number,
  compressedBytes: number,
  expandedBytes: number,
) {
  if (u32(view, localOffset) !== LOCAL_SIGNATURE) reject("ZIP_STRUCTURE_INVALID");
  const localFlags = u16(view, localOffset + 6);
  const localMethod = u16(view, localOffset + 8);
  const localNameLength = u16(view, localOffset + 26);
  const localExtraLength = u16(view, localOffset + 28);
  const nameStart = localOffset + 30;
  const dataStart = nameStart + localNameLength + localExtraLength;
  if (dataStart + compressedBytes > centralOffset) reject("ZIP_STRUCTURE_INVALID");
  if (localFlags !== flags || localMethod !== method || localNameLength !== expectedPathBytes.length) {
    reject("ZIP_STRUCTURE_INVALID");
  }
  const localName = bytes.subarray(nameStart, nameStart + localNameLength);
  if (localName.some((byte, index) => byte !== expectedPathBytes[index])) reject("ZIP_STRUCTURE_INVALID");
  if ((flags & 0x08) === 0) {
    if (
      u32(view, localOffset + 14) !== expectedCrc32 ||
      u32(view, localOffset + 18) !== compressedBytes ||
      u32(view, localOffset + 22) !== expandedBytes
    ) {
      reject("ZIP_STRUCTURE_INVALID");
    }
  }
  return dataStart;
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ ((crc & 1) === 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function hasArchiveSignature(bytes: Uint8Array) {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);
  return (
    startsWith(0x50, 0x4b, 0x03, 0x04) ||
    startsWith(0x50, 0x4b, 0x05, 0x06) ||
    startsWith(0x50, 0x4b, 0x07, 0x08) ||
    startsWith(0x1f, 0x8b) ||
    startsWith(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c) ||
    startsWith(0x52, 0x61, 0x72, 0x21, 0x1a, 0x07) ||
    (bytes.length >= 262 &&
      bytes[257] === 0x75 &&
      bytes[258] === 0x73 &&
      bytes[259] === 0x74 &&
      bytes[260] === 0x61 &&
      bytes[261] === 0x72)
  );
}

function expandEntry(entry: ZipEntryMetadata, archiveBytes: Uint8Array) {
  const compressed = archiveBytes.subarray(entry.dataOffset, entry.dataOffset + entry.compressedBytes);
  let expanded: Uint8Array;
  try {
    expanded = entry.compressionMethod === 0
      ? compressed
      : inflateRawSync(compressed, { maxOutputLength: entry.expandedBytes });
  } catch {
    reject("ZIP_STRUCTURE_INVALID");
  }
  if (expanded.byteLength !== entry.expandedBytes || crc32(expanded) !== entry.crc32) {
    reject("ZIP_STRUCTURE_INVALID");
  }
  return expanded;
}

export function inspectZip(archiveName: string, archiveBytes: Uint8Array): ZipInspection {
  if (
    !archiveName.toLowerCase().endsWith(".zip") ||
    archiveName.includes("/") ||
    archiveName.includes("\\") ||
    archiveName.includes("\0")
  ) reject("ZIP_SIGNATURE_INVALID");
  if (archiveBytes.byteLength > ZIP_INGESTION_LIMITS.maxCompressedBytes) reject("ZIP_LIMIT_EXCEEDED");
  if (archiveBytes.byteLength < 22) reject("ZIP_SIGNATURE_INVALID");
  const view = new DataView(archiveBytes.buffer, archiveBytes.byteOffset, archiveBytes.byteLength);
  const firstSignature = u32(view, 0);
  if (firstSignature !== LOCAL_SIGNATURE && firstSignature !== EOCD_SIGNATURE) reject("ZIP_SIGNATURE_INVALID");

  const eocdOffset = findEocd(view);
  const disk = u16(view, eocdOffset + 4);
  const centralDisk = u16(view, eocdOffset + 6);
  const entriesOnDisk = u16(view, eocdOffset + 8);
  const entryCount = u16(view, eocdOffset + 10);
  const centralSize = u32(view, eocdOffset + 12);
  const centralOffset = u32(view, eocdOffset + 16);
  if (disk !== 0 || centralDisk !== 0 || entriesOnDisk !== entryCount) reject("ZIP_FEATURE_UNSUPPORTED");
  if (entryCount === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff) reject("ZIP_FEATURE_UNSUPPORTED");
  if (entryCount > ZIP_INGESTION_LIMITS.maxEntries) reject("ZIP_LIMIT_EXCEEDED");
  if (centralOffset + centralSize !== eocdOffset) reject("ZIP_STRUCTURE_INVALID");

  const entries: ZipEntryMetadata[] = [];
  const collisionIndex = new Set<string>();
  let cursor = centralOffset;
  let expandedTotal = 0;
  let compressedTotal = 0;

  for (let index = 0; index < entryCount; index += 1) {
    if (u32(view, cursor) !== CENTRAL_SIGNATURE) reject("ZIP_STRUCTURE_INVALID");
    const versionMadeBy = u16(view, cursor + 4);
    const flags = u16(view, cursor + 8);
    const method = u16(view, cursor + 10);
    const compressedBytes = u32(view, cursor + 20);
    const expandedBytes = u32(view, cursor + 24);
    const expectedCrc32 = u32(view, cursor + 16);
    const nameLength = u16(view, cursor + 28);
    const extraLength = u16(view, cursor + 30);
    const commentLength = u16(view, cursor + 32);
    const startingDisk = u16(view, cursor + 34);
    const externalAttributes = u32(view, cursor + 38);
    const localOffset = u32(view, cursor + 42);
    const nextCursor = cursor + 46 + nameLength + extraLength + commentLength;
    if (nextCursor > eocdOffset || startingDisk !== 0) reject("ZIP_STRUCTURE_INVALID");
    if ((flags & 0x01) !== 0) reject("ZIP_FEATURE_UNSUPPORTED");
    if (method !== 0 && method !== 8) reject("ZIP_FEATURE_UNSUPPORTED");
    if (compressedBytes === 0xffffffff || expandedBytes === 0xffffffff || localOffset === 0xffffffff) {
      reject("ZIP_FEATURE_UNSUPPORTED");
    }

    const pathBytes = archiveBytes.subarray(cursor + 46, cursor + 46 + nameLength);
    const rawPath = decodePath(pathBytes, (flags & 0x0800) !== 0);
    const directory = entryType(versionMadeBy, externalAttributes, rawPath);
    const path = validatePath(rawPath, directory);
    for (const key of collisionKeys(path)) {
      if (collisionIndex.has(key)) reject("ZIP_COLLISION_REJECTED");
      collisionIndex.add(key);
    }
    if (!directory && NESTED_ARCHIVE_EXTENSIONS.has(extension(path))) reject("ZIP_NESTED_ARCHIVE_REJECTED");
    if (directory && (compressedBytes !== 0 || expandedBytes !== 0)) reject("ZIP_STRUCTURE_INVALID");
    if (!directory && expandedBytes > ZIP_INGESTION_LIMITS.maxFileBytes) reject("ZIP_LIMIT_EXCEEDED");
    const ratio = expandedBytes === 0 ? 0 : compressedBytes === 0 ? Number.POSITIVE_INFINITY : expandedBytes / compressedBytes;
    if (ratio > ZIP_INGESTION_LIMITS.maxFileCompressionRatio) reject("ZIP_LIMIT_EXCEEDED");

    expandedTotal += expandedBytes;
    compressedTotal += compressedBytes;
    if (expandedTotal > ZIP_INGESTION_LIMITS.maxExpandedBytes) reject("ZIP_LIMIT_EXCEEDED");
    const dataOffset = validateLocalHeader(
      view,
      archiveBytes,
      localOffset,
      centralOffset,
      pathBytes,
      flags,
      method,
      expectedCrc32,
      compressedBytes,
      expandedBytes,
    );
    entries.push({
      path,
      compressedBytes,
      expandedBytes,
      compressionMethod: method,
      directory,
      scannerEligible: !directory && isApprovedFileExtension(path),
      dataOffset,
      crc32: expectedCrc32,
    });
    cursor = nextCursor;
  }

  if (cursor !== eocdOffset) reject("ZIP_STRUCTURE_INVALID");
  const overallRatio = expandedTotal === 0 ? 0 : compressedTotal === 0 ? Number.POSITIVE_INFINITY : expandedTotal / compressedTotal;
  if (overallRatio > ZIP_INGESTION_LIMITS.maxOverallCompressionRatio) reject("ZIP_LIMIT_EXCEEDED");
  return {
    archiveName,
    compressedBytes: archiveBytes.byteLength,
    expandedBytes: expandedTotal,
    entryCount,
    acceptedFileCount: entries.filter((entry) => entry.scannerEligible).length,
    ignoredFileCount: entries.filter((entry) => !entry.directory && !entry.scannerEligible).length,
    entries,
  };
}

export function materializeZip(archiveName: string, archiveBytes: Uint8Array): RepositoryFile[] {
  const inspection = inspectZip(archiveName, archiveBytes);
  const files: RepositoryFile[] = [];
  const decoder = new TextDecoder("utf-8", { fatal: true });

  for (const entry of inspection.entries) {
    if (entry.directory) continue;
    const expanded = expandEntry(entry, archiveBytes);
    if (hasArchiveSignature(expanded)) reject("ZIP_NESTED_ARCHIVE_REJECTED");
    if (!entry.scannerEligible) continue;
    let content: string;
    try {
      content = decoder.decode(expanded);
    } catch {
      reject("ZIP_TEXT_INVALID");
    }
    if (content.includes("\0")) reject("ZIP_TEXT_INVALID");
    files.push({ path: entry.path, content });
  }

  const sanitized = sanitizeFiles(files);
  if (sanitized.length !== files.length) reject("ZIP_LIMIT_EXCEEDED");
  return sanitized;
}
