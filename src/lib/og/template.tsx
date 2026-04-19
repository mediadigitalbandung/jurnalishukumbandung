import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

interface OgTemplateProps {
  title: string;
  subtitle?: string;
  badge?: string;
  accent?: string;
}

export function renderOgImage({ title, subtitle, badge, accent = "#00AA13" }: OgTemplateProps) {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFFFFF",
          backgroundImage: `radial-gradient(circle at 100% 0%, ${accent}1A 0%, #FFFFFF 50%)`,
          padding: "70px 80px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top bar with brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              backgroundColor: accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 28,
              fontWeight: 800,
            }}
          >
            JHB
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1C1C1E" }}>
              Jurnalis Hukum Bandung
            </div>
            <div style={{ fontSize: 16, color: "#6B7280" }}>
              jurnalishukumbandung.com
            </div>
          </div>
        </div>

        {/* Badge */}
        {badge && (
          <div
            style={{
              display: "flex",
              marginTop: 50,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: `${accent}1F`,
                color: accent,
                fontSize: 22,
                fontWeight: 600,
                padding: "10px 22px",
                borderRadius: 999,
              }}
            >
              {badge}
            </div>
          </div>
        )}

        {/* Title */}
        <div
          style={{
            display: "flex",
            marginTop: badge ? 28 : 70,
            fontSize: title.length > 55 ? 56 : 68,
            fontWeight: 800,
            color: "#1C1C1E",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            maxWidth: "100%",
          }}
        >
          {title.length > 130 ? title.slice(0, 127) + "…" : title}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 28,
              color: "#6B7280",
              lineHeight: 1.4,
              maxWidth: "100%",
            }}
          >
            {subtitle.length > 140 ? subtitle.slice(0, 137) + "…" : subtitle}
          </div>
        )}

        {/* Bottom strip */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 12,
            backgroundColor: accent,
          }}
        />
      </div>
    ),
    {
      ...OG_SIZE,
    }
  );
}
