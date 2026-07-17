export const SECURITY_HEADERS = {
  "Content-Security-Policy": [
    "default-src 'self'",
    "base-uri 'none'",
    "connect-src 'self'",
    "font-src 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data:",
    "object-src 'none'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "upgrade-insecure-requests",
  ].join("; "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
} as const;

async function sha256(source: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source));
  return btoa(String.fromCharCode(...new Uint8Array(digest)));
}

async function contentSecurityPolicy(response: Response, html?: string) {
  const basePolicy = SECURITY_HEADERS["Content-Security-Policy"];
  if (!html) return basePolicy;

  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .filter((match) => !/\ssrc\s*=/i.test(match[0]))
    .map((match) => match[1]);
  if (scripts.length === 0) return basePolicy;

  const hashes = await Promise.all(scripts.map(async (script) => `'sha256-${await sha256(script)}'`));
  return basePolicy.replace("script-src 'self'", `script-src 'self' ${[...new Set(hashes)].join(" ")}`);
}

export async function withSecurityHeaders(response: Response) {
  const isHtml = response.headers.get("content-type")?.toLowerCase().includes("text/html");
  const html = isHtml ? await response.text() : undefined;
  const secured = new Response(html ?? response.body, response);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    secured.headers.set(name, value);
  }
  secured.headers.set("Content-Security-Policy", await contentSecurityPolicy(response, html));
  return secured;
}
