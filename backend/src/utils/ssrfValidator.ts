import { URL } from 'url';

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // Cloud metadata service (AWS/GCP/Azure)
  'metadata.google.internal'
]);

export function isSafeExternalUrl(rawUrl: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(rawUrl);

    // Only allow HTTP/HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: `Unsafe protocol: '${parsed.protocol}'. Only http: and https: are allowed.` };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check blocked exact hostnames
    if (BLOCKED_HOSTNAMES.has(hostname)) {
      return { safe: false, reason: `Blocked internal hostname: '${hostname}'.` };
    }

    // Check private RFC1918 IPv4 ranges
    const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const b0 = parseInt(ipv4Match[1], 10);
      const b1 = parseInt(ipv4Match[2], 10);

      // 10.0.0.0/8
      if (b0 === 10) return { safe: false, reason: 'Private network IP range (10.0.0.0/8) blocked.' };
      // 172.16.0.0/12
      if (b0 === 172 && b1 >= 16 && b1 <= 31) return { safe: false, reason: 'Private network IP range (172.16.0.0/12) blocked.' };
      // 192.168.0.0/16
      if (b0 === 192 && b1 === 168) return { safe: false, reason: 'Private network IP range (192.168.0.0/16) blocked.' };
      // 127.0.0.0/8
      if (b0 === 127) return { safe: false, reason: 'Loopback IP range (127.0.0.0/8) blocked.' };
      // 169.254.0.0/16 (link-local)
      if (b0 === 169 && b1 === 254) return { safe: false, reason: 'Link-local IP range (169.254.0.0/16) blocked.' };
    }

    return { safe: true };
  } catch (err: any) {
    return { safe: false, reason: `Malformed URL: ${err.message}` };
  }
}
