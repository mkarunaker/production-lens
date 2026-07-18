# Secure ZIP ingestion contract

Status: approved hosted-ingestion contract; metadata inspection, bounded in-memory content materialization, and the quarantine/security-scan lifecycle boundary are implemented for the evaluated fixture set. A separate localhost-only development UI exercises bounded materialization but is not a hosted upload implementation. Deployment-backed quarantine, a real malware/secret scanner, hosted-route authentication, and a hosted upload UI are not implemented.

## Scope

The hosted Production Lens MVP will accept one repository only as a ZIP archive. It will not accept a server filesystem path, browser directory upload, Git URL, cloud-storage link, nested archive, or any other archive format.

The ingestion boundary must convert an accepted archive into the existing bounded `RepositoryFile[]` representation. Repository content remains untrusted data and is never imported, executed, installed, built, rendered, or sent to a model.

## Initial limits

| Control | Limit |
| --- | ---: |
| Compressed upload size | 10 MiB |
| Declared total expanded size | 50 MiB |
| Archive entries | 500 |
| Individual expanded file | 512 KiB |
| Normalized relative path length | 240 characters |
| Directory depth | 12 segments |
| Per-file compression ratio | 100:1 |
| Overall compression ratio | 30:1 |
| Nested archives | Rejected |
| Encrypted entries | Rejected |

Limits are evaluated from archive metadata before extraction and enforced again while reading bounded content. A missing, inconsistent, overflowing, or unverifiable size is a rejection, not permission to continue.

## Accepted container

An input is accepted for inspection only when:

- The filename ends in `.zip`.
- The leading bytes and end-of-central-directory structure identify a ZIP archive.
- The complete central directory is available within the compressed-size limit.
- Every entry uses an explicitly supported ZIP compression method.
- The archive is not split, multi-disk, encrypted, password-protected, or self-extracting.
- Central-directory and local-header metadata agree for every accepted entry.

File extension and content signature must agree. A renamed non-ZIP file is rejected.

## Entry inspection before extraction

The entire archive is rejected before any entry is materialized if an entry:

- Has an empty, absolute, UNC, URL-like, or Windows drive-prefixed path.
- Contains a backslash, NUL byte, `.` segment, `..` segment, empty segment, or ambiguous separator.
- Escapes the logical archive root after path normalization.
- Is a symbolic link, hard link, device, socket, FIFO, or other special file.
- Is encrypted or uses an unsupported compression method.
- Is itself an archive or has a supported archive signature regardless of filename.
- Exceeds file-size, path-length, depth, or compression-ratio limits.
- Causes total entry-count, expanded-size, or overall-ratio limits to be exceeded.

Directory entries may be represented logically but are never trusted as extraction targets.

## Collision handling

The entire archive is rejected if two entries collide under any of these comparisons:

- Exact normalized path
- Unicode NFC-normalized path
- Unicode NFKC-normalized path
- Locale-independent case-folded path
- Platform-neutral trailing-dot or trailing-space normalization

This fail-closed rule prevents duplicate overwrite, case-confusion, and cross-platform extraction inconsistencies.

## Approved repository files

After archive validation, only regular files with the scanner’s centralized approved extensions are eligible for bounded text reading:

- `.ts`, `.tsx`, `.js`, `.jsx`
- `.json`, `.lock`
- `.sql`
- `.md`, `.txt`
- `.yml`, `.yaml`

Unsupported files are not scanned. Binary decoding failures, embedded NUL bytes, or invalid text encodings reject the affected archive rather than producing partial or ambiguous evidence.

The ingestion layer must also apply the scanner’s stricter file-count, per-file, aggregate-size, path, and redaction controls before deterministic analysis.

## Isolation and lifecycle

No uploaded bytes may be written into the application source tree, working repository, deployment bundle, or a location served by the web application.

When temporary storage is introduced, each upload must use an unpredictable owner-scoped quarantine location with restrictive permissions. The ingestion worker must have:

- No authority to execute repository content.
- No package-manager or build authority.
- No outbound network access.
- No model access.
- No access to another user’s quarantine objects.
- No write access outside its quarantine and bounded output location.

Temporary data must be deleted after success, rejection, timeout, cancellation, and internal failure. Cleanup failure is an operational security event and blocks a successful completion response.

## Failure behavior

Archive validation is atomic and fail closed:

- One invalid entry rejects the entire archive.
- No partial scan result is returned.
- No rejected source excerpt is written to ordinary logs.
- User-facing errors use stable, non-sensitive reason codes.
- Internal logs contain only redacted event metadata, owner/scan identifiers, limit name, and outcome.
- Parser crashes, timeouts, or malware-scanner unavailability produce rejection.

Initial reason-code families:

- `ZIP_SIGNATURE_INVALID`
- `ZIP_STRUCTURE_INVALID`
- `ZIP_FEATURE_UNSUPPORTED`
- `ZIP_ENTRY_TYPE_REJECTED`
- `ZIP_PATH_REJECTED`
- `ZIP_COLLISION_REJECTED`
- `ZIP_NESTED_ARCHIVE_REJECTED`
- `ZIP_LIMIT_EXCEEDED`
- `ZIP_TEXT_INVALID`
- `ZIP_SECURITY_SCAN_UNAVAILABLE`
- `ZIP_CLEANUP_FAILED`

## Output contract

Successful ingestion returns only:

- An owner-scoped opaque scan identifier
- The normalized logical repository name
- Bounded approved `RepositoryFile[]` data for deterministic scanning
- Counts of accepted and ignored entries
- Redacted ingestion audit metadata

Raw archive bytes and repository content are not returned in logs or error responses.

## Current implementation boundary

`lib/ingestion/zip-inspector.ts` parses ZIP end-of-central-directory, central-directory, and local-header metadata directly from a bounded byte array. After complete metadata approval, it can materialize stored and raw-deflate entries in memory with bounded output, exact expanded-size and CRC-32 verification, archive-signature rejection, fatal UTF-8 decoding, embedded-NUL rejection, and final scanner-policy enforcement. It returns only approved `RepositoryFile[]` text and never writes archive content to disk.

`lib/ingestion/ingest-archive.ts` requires an owner-scoped quarantine adapter and archive security scanner. It fails closed on scanner rejection or outage, enforces cancellation and timeout around scanning, deletes quarantine content after every evaluated terminal path, and blocks success when cleanup fails. Its returned audit metadata contains counts and byte sizes, not repository content.

The lifecycle accepts a validated `Principal` and derives quarantine tenant and owner scope from it; callers cannot provide an independent owner identifier. Framework-independent authorization policy covers create, read, update, and delete, while the current process-local admission controller evaluates per-tenant/per-user rate, quota, concurrency, and replay behavior. These policy primitives are not substitutes for shared deployment state.

The lifecycle also requires audit and operational-alert sinks. Exactly one content-free completion event is attempted for each authenticated ingestion run. Scanner outage and cleanup failure require dedicated alerts. Audit or required-alert delivery failure blocks a successful result; production retry, ordering, retention, and emergency-disable behavior remain unevaluated.

`scripts/zip-demo-server.mjs` is a development-only exception to the hosted lifecycle. It binds only to `127.0.0.1`, refuses `NODE_ENV=production`, accepts one raw ZIP request body up to the compressed-size limit, materializes approved text in memory, and passes it directly to the deterministic scanner. It performs no disk extraction, persistence, repository execution, dependency installation, model call, or outbound request. Because it intentionally lacks hosted authentication, quarantine, malware scanning, and distributed controls, it must remain absent from the deployed application.

Current evaluated coverage includes valid stored and deflated text; safe Unicode paths; ignored unsupported ordinary binary files; signature, size, CRC, and header mismatch; unsafe paths; case, Unicode, and platform-normalized collisions; declared Unix symlinks and special types; ambiguous Unix entry types; nested archive filenames and disguised ZIP, gzip, 7z, RAR, and tar signatures; encryption; unsupported methods; metadata-declared compression bombs; invalid UTF-8; embedded NUL content; path, depth, file-size, and entry-count limits; scanner rejection and outage; timeout; cancellation; cleanup success; and cleanup failure.

Standard ZIP metadata has no portable, reliable hard-link identity. The fail-closed policy therefore accepts Unix-hosted entries only when their mode explicitly declares a regular file or directory; ambiguous or special Unix types are rejected. This does not establish hard-link detection for non-standard producer-specific metadata, which remains part of the adversarial corpus.

Still required in later increments: a deployment-backed private quarantine adapter, a real malware and secret scanner, cleanup alerting, shared rate/quota/concurrency/replay state, authorization enforcement at every future persisted-object route, remaining malformed/data-descriptor fixtures, and independent security validation. The lifecycle boundary does not authorize an upload route or UI.

## Required acceptance tests

Implementation cannot be enabled until tests prove acceptance of:

- A small valid repository ZIP
- Directory entries plus approved text files
- Safe Unicode filenames that do not collide
- Unsupported ordinary binary files being ignored according to policy

Implementation must reject fixtures for:

- Non-ZIP content with a `.zip` suffix
- Truncated or malformed central directory
- Local-header and central-directory disagreement
- Traversal, absolute, UNC, drive-prefixed, backslash, NUL, empty, and overlong paths
- Excessive depth, entry count, compressed size, expanded size, and file size
- Per-entry and overall compression bombs
- Symlink, hard-link, device, socket, and FIFO entries
- Exact, case-folded, Unicode-normalized, trailing-dot, and trailing-space collisions
- Nested ZIPs and disguised archive signatures
- Encrypted, split, multi-disk, and unsupported-compression archives
- Invalid text, embedded NUL content, and inconsistent size metadata
- Cleanup after success, rejection, timeout, cancellation, parser failure, and security-scanner failure

Every test must also prove that no repository code or dependency was executed and no file was written outside the isolated test quarantine.

## Enablement gates

This contract does not authorize a public upload UI.

Before uploads are exposed, Production Lens must also implement and evaluate:

1. Authenticated user and tenant ownership.
2. Object-level authorization for upload, scan, result, remediation, and deletion.
3. Private quarantine storage and retention enforcement.
4. Malware and secret scanning with fail-closed availability behavior.
5. Rate, quota, concurrency, timeout, and spending limits.
6. Structured redacted audit logging and operational alerting.
7. The complete adversarial archive fixture corpus.
8. Independent security validation before production launch.
