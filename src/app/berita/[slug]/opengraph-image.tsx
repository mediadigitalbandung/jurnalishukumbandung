import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const alt = "Jurnalis Hukum Bandung";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage({ params }: { params: { slug: string } }) {
  const article = await prisma.article.findUnique({
    where: { slug: params.slug },
    select: {
      title: true,
      excerpt: true,
      publishedAt: true,
      author: { select: { name: true } },
      category: { select: { name: true } },
    },
  });

  if (!article) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#1C1C1E",
            color: "#FFFFFF",
            fontSize: 48,
            fontWeight: "bold",
          }}
        >
          Jurnalis Hukum Bandung
        </div>
      ),
      { ...size }
    );
  }

  const publishDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFFFFF",
          position: "relative",
        }}
      >
        {/* Top green bar */}
        <div
          style={{
            width: "100%",
            height: "8px",
            backgroundColor: "#00AA13",
          }}
        />

        {/* Main content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "60px 70px",
          }}
        >
          {/* Category badge */}
          <div
            style={{
              display: "flex",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                backgroundColor: "#E6F9E8",
                color: "#00AA13",
                fontSize: "20px",
                fontWeight: "bold",
                padding: "8px 20px",
                borderRadius: "9999px",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              {article.category.name}
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: article.title.length > 80 ? "40px" : "48px",
              fontWeight: "800",
              color: "#1C1C1E",
              lineHeight: "1.2",
              maxHeight: "250px",
              overflow: "hidden",
              display: "flex",
            }}
          >
            {article.title.length > 120
              ? article.title.slice(0, 117) + "..."
              : article.title}
          </div>

          {/* Excerpt */}
          {article.excerpt && (
            <div
              style={{
                fontSize: "22px",
                color: "#6B7280",
                marginTop: "16px",
                lineHeight: "1.4",
                maxHeight: "65px",
                overflow: "hidden",
                display: "flex",
              }}
            >
              {article.excerpt.length > 120
                ? article.excerpt.slice(0, 117) + "..."
                : article.excerpt}
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "20px 70px",
            borderTop: "1px solid #E5E7EB",
            backgroundColor: "#F7F7F8",
          }}
        >
          {/* Logo + site name */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                backgroundColor: "#00AA13",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              J
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: "18px", fontWeight: "bold", color: "#1C1C1E" }}>
                Jurnalis Hukum Bandung
              </span>
              <span style={{ fontSize: "14px", color: "#9CA3AF" }}>
                jurnalishukumbandung.com
              </span>
            </div>
          </div>

          {/* Author + date */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <span style={{ fontSize: "16px", fontWeight: "600", color: "#1C1C1E" }}>
              {article.author.name}
            </span>
            <span style={{ fontSize: "14px", color: "#9CA3AF" }}>
              {publishDate}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
