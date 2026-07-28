export const PRODUCTION_CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "form-action 'self'",
].join("; ");

export const DEVELOPMENT_CONTENT_SECURITY_POLICY =
  PRODUCTION_CONTENT_SECURITY_POLICY.replace(
    "connect-src 'self'",
    "connect-src 'self' ws://localhost:* ws://127.0.0.1:*",
  );

export const CONTENT_SECURITY_POLICY_PLACEHOLDER = "__EDUPLANNER_CSP__";

export function applyContentSecurityPolicy(html, command) {
  const policy =
    command === "serve"
      ? DEVELOPMENT_CONTENT_SECURITY_POLICY
      : PRODUCTION_CONTENT_SECURITY_POLICY;

  if (!html.includes(CONTENT_SECURITY_POLICY_PLACEHOLDER)) {
    throw new Error("Content Security Policy placeholder is missing from index.html.");
  }

  return html.replace(CONTENT_SECURITY_POLICY_PLACEHOLDER, policy);
}
