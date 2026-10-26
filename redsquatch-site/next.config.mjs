/** @type {import('next').NextConfig} */
// No CSP script-src yet: the inline theme boot script + Next's inline bootstrap
// need nonce middleware. frame-ancestors covers the clickjacking half now.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // SAMEORIGIN, not DENY: PDFReaderApplet embeds a same-origin PDF in an iframe.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // camera=(self) is required by the Cocina barcode scanner.
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(), payment=()' },
  // Private tool: keep every route, including /login, out of search indexes.
  { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
]

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  eslint: { ignoreDuringBuilds: true },
  // Only the Docker build sets DOCKER_BUILD=1 (see Dockerfile). "next start" —
  // what the manual `sudo npm run build && docker restart` deploy still uses —
  // does not work with output:'standalone', so the legacy path must never see
  // this flip on.
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),
}

export default nextConfig
