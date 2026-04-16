/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jurnalishukumbandung.com",
      },
      {
        protocol: "http",
        hostname: "jurnalishukumbandung.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  async headers() {
    return [
      // Cache static assets aggressively
      {
        source: "/ads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
        ],
      },
      {
        source: "/logo-jhb.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, immutable" },
        ],
      },
      // Cache public pages with SWR
      {
        source: "/berita/:slug*",
        headers: [
          // Articles are mostly immutable post-publish — cache longer for faster LCP
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=86400" },
        ],
      },
      {
        source: "/kategori/:slug*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=60, stale-while-revalidate=300" },
        ],
      },
      // Security headers for all routes
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Control referrer info
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // XSS protection
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Disable dangerous browser features
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://api.deepseek.com https://trends.google.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          // Prevent DNS prefetch abuse
          { key: "X-DNS-Prefetch-Control", value: "on" },
          // HSTS — enforce HTTPS (trust signal for Google)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          // Cross-Origin policies
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
    ];
  },
  // Disable x-powered-by header
  poweredByHeader: false,
};

module.exports = nextConfig;
