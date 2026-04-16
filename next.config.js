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
      // Cache static assets — Cloudflare edge + browser
      {
        source: "/ads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
          { key: "CDN-Cache-Control", value: "max-age=604800" }, // Cloudflare edge: 7 days
        ],
      },
      {
        source: "/logo-jhb.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, immutable" },
          { key: "CDN-Cache-Control", value: "max-age=2592000" }, // Cloudflare edge: 30 days
        ],
      },
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=2592000" },
          { key: "CDN-Cache-Control", value: "max-age=2592000" }, // Cloudflare edge: 30 days
        ],
      },
      // Cache public pages — Cloudflare edge + browser
      {
        source: "/berita/:slug*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=86400" },
          { key: "CDN-Cache-Control", value: "max-age=300" }, // Cloudflare edge: 5 min
        ],
      },
      {
        source: "/kategori/:slug*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=120, stale-while-revalidate=600" },
          { key: "CDN-Cache-Control", value: "max-age=120" }, // Cloudflare edge: 2 min
        ],
      },
      {
        source: "/topik/:slug*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=3600" },
          { key: "CDN-Cache-Control", value: "max-age=300" },
        ],
      },
      {
        source: "/sorotan/:slug*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
          { key: "CDN-Cache-Control", value: "max-age=3600" }, // Cloudflare edge: 1 hour
        ],
      },
      {
        source: "/lokasi/:slug*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=300, stale-while-revalidate=3600" },
          { key: "CDN-Cache-Control", value: "max-age=300" },
        ],
      },
      {
        source: "/rangkuman/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, stale-while-revalidate=86400" },
          { key: "CDN-Cache-Control", value: "max-age=3600" },
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
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https: http:",
              "connect-src 'self' https://api.deepseek.com https://trends.google.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com",
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
