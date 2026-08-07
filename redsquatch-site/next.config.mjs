/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  // Only the Docker build sets DOCKER_BUILD=1 (see Dockerfile). "next start" —
  // what the manual `sudo npm run build && docker restart` deploy still uses —
  // does not work with output:'standalone', so the legacy path must never see
  // this flip on.
  ...(process.env.DOCKER_BUILD === '1' ? { output: 'standalone' } : {}),
}

export default nextConfig
