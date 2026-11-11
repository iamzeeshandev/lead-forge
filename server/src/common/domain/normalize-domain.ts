// Same rules as client/src/lib/domain.ts. The server can't trust the client, and
// the normalised domain is what Phase 6 caches and stores to avoid paying twice.
const DOMAIN_PATTERN = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/;

/**
 * "acme.com" from whatever people paste: a URL, an email address, "www.", a
 * port or mixed case. Two spellings of one company would otherwise cost two
 * Apollo credits. Returns null when no usable domain is left.
 */
export function normalizeDomain(input: string): string | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  let hostname: string;
  try {
    // The URL parser lowercases, drops paths, ports and "user@" (so emails work),
    // and converts international names to punycode.
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value)
      ? value
      : `http://${value}`;
    hostname = new URL(withProtocol).hostname;
  } catch {
    return null;
  }

  const domain = hostname.replace(/^www\d*\./, '').replace(/\.$/, '');
  return DOMAIN_PATTERN.test(domain) ? domain : null;
}
