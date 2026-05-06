/**
 * RFC 4122 v4 UUID generator with a non-secure-context fallback.
 *
 * `crypto.randomUUID()` only exists in secure contexts (HTTPS / localhost).
 * The prod build is currently served over plain HTTP, where it's undefined
 * and any caller crashes with "crypto.randomUUID is not a function".
 * `crypto.getRandomValues()` is available in non-secure contexts too, so we
 * use it to mint a v4 UUID by hand when the convenience method is missing.
 */
export function uuid(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
  }
  // Last resort — Math.random isn't cryptographically strong, but ids only
  // need to be unique within a project graph, not unguessable.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
