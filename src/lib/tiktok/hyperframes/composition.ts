/**
 * HyperFrames Composition Generator
 *
 * Translates TiktokVideo data (clips + subtitles + overlays + backsong) into
 * a complete HTML composition file consumable by hyperframes CLI.
 *
 * Follows hyperframes contract (https://github.com/heygen-com/hyperframes):
 * - Top-level container has data-composition-id, data-start, data-duration, data-width, data-height
 * - Video elements: muted + playsinline, separate <audio> for sound
 * - Use data-track-index (NOT data-layer)
 * - Use data-duration (NOT data-end)
 * - Timeline registered via window.__timelines["compId"]
 * - GSAP timeline starts paused, framework controls playback
 * - No animation of display/visibility — only opacity/transforms
 * - Centering CSS via wrapper divs (not on animated elements directly)
 */

import type { ClipInput, MultiOverlayInput, RenderSpec, SubtitleEntryInput } from "../types";

const GSAP_CDN = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";

/** Resolve relative path / public URL to absolute URL Chrome can fetch */
function toAbsoluteUrl(urlOrPath: string): string {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) return urlOrPath;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com").replace(/\/$/, "");
  if (urlOrPath.startsWith("/")) return `${base}${urlOrPath}`;
  return `${base}/${urlOrPath}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function computeDuration(clips: ClipInput[], maxDurationSec = 60): number {
  const total = clips.reduce((sum, c) => sum + c.durationSec, 0);
  return Math.min(total, maxDurationSec);
}

/**
 * Position style for text overlay element.
 * NOTE: returns absolute positioning ON A WRAPPER element, so GSAP can transform inner element freely.
 */
function pixelWrapperPositionStyle(
  textX: number | null | undefined,
  textY: number | null | undefined,
  textPosition: string | null | undefined
): string {
  if (typeof textX === "number" && typeof textY === "number") {
    return `top: ${textY}%; left: ${textX}%; transform: translate(-50%, -50%);`;
  }
  const pos = textPosition || "bottom";
  switch (pos) {
    case "top":          return "top: 8%; left: 50%; transform: translateX(-50%);";
    case "center":       return "top: 50%; left: 50%; transform: translate(-50%, -50%);";
    case "bottom":       return "bottom: 8%; left: 50%; transform: translateX(-50%);";
    case "top-left":     return "top: 8%; left: 5%;";
    case "top-right":    return "top: 8%; right: 5%;";
    case "center-left":  return "top: 50%; left: 5%; transform: translateY(-50%);";
    case "center-right": return "top: 50%; right: 5%; transform: translateY(-50%);";
    case "bottom-left":  return "bottom: 8%; left: 5%;";
    case "bottom-right": return "bottom: 8%; right: 5%;";
    default:             return "bottom: 8%; left: 50%; transform: translateX(-50%);";
  }
}

export function buildHyperframesComposition(spec: RenderSpec): string {
  const width = spec.outputWidth || 1080;
  const height = spec.outputHeight || 1920;
  const maxDuration = spec.maxDurationSec || 60;

  const clips = [...spec.clips].sort((a, b) => a.order - b.order);
  const totalDuration = computeDuration(clips, maxDuration);

  // Sequential timing per clip
  let cursor = 0;
  const clipsWithTiming = clips.map((c) => {
    const start = cursor;
    const duration = c.durationSec;
    cursor += duration;
    return { ...c, _start: start, _duration: duration };
  });

  const subtitleEntries: SubtitleEntryInput[] = spec.subtitleEntries || [];
  const multiOverlays: MultiOverlayInput[] = spec.multiOverlays || [];
  const backsongUrl = spec.backsongUrl ? toAbsoluteUrl(spec.backsongUrl) : null;
  const backsongVolume = spec.backsongVolume ?? 0.5;
  const compId = `tiktok-${spec.videoId}`;

  // ─── Clip elements (videos + images) ─────────────────────────
  // Each clip is wrapped in a positioned div so GSAP can animate the inner without conflicting CSS transform
  const clipElements = clipsWithTiming
    .map((c, idx) => {
      const src = toAbsoluteUrl(c.sourceUrl);
      const trimStart = c.trimStart && c.trimStart > 0 ? c.trimStart : 0;
      if (c.type === "video") {
        return `<div class="clip-wrap" id="clip-wrap-${idx}"
          data-start="${c._start}"
          data-duration="${c._duration}"
          data-track-index="0">
          <video class="clip clip-video clip-${idx}" id="clip-${idx}"
            src="${escapeHtml(src)}"
            data-media-start="${trimStart}"
            muted playsinline></video>
        </div>`;
      }
      const kenBurnsClass = c.kenBurns ? "ken-burns" : "";
      return `<div class="clip-wrap" id="clip-wrap-${idx}"
        data-start="${c._start}"
        data-duration="${c._duration}"
        data-track-index="0">
        <img class="clip clip-img clip-${idx} ${kenBurnsClass}" id="clip-${idx}"
          src="${escapeHtml(src)}"
          alt="" />
      </div>`;
    })
    .join("\n      ");

  // ─── Per-clip text overlay (wrapper for positioning, inner span for animation) ───
  const textOverlayElements = clipsWithTiming
    .filter((c) => c.textOverlay && c.textOverlay.trim())
    .map((c, idx) => {
      const text = escapeHtml((c.textOverlay || "").trim().slice(0, 240));
      const color = c.textColor || "#FFFFFF";
      const fontSize = c.textFontSize || 54;
      const wrapperStyle = pixelWrapperPositionStyle(c.textX, c.textY, c.textPosition);
      return `<div class="text-overlay-wrap text-overlay-wrap-${idx}"
        data-start="${c._start}"
        data-duration="${c._duration}"
        data-track-index="${1 + idx}"
        style="${wrapperStyle}">
        <div class="text-overlay text-overlay-${idx}" style="color: ${color}; font-size: ${fontSize}px;">${text}</div>
      </div>`;
    })
    .join("\n      ");

  // ─── Subtitle entries (independent timing) ───────────────────
  const subtitleElements = subtitleEntries
    .map((s, idx) => {
      const text = escapeHtml(s.text.trim().slice(0, 240));
      const color = s.color || "#FFFFFF";
      const fontSize = s.fontSize || 54;
      const yPercent = typeof s.y === "number" ? s.y * 100 : 85;
      const duration = Math.max(0.1, s.endSec - s.startSec);
      return `<div class="subtitle-wrap subtitle-wrap-${idx}"
        data-start="${s.startSec}"
        data-duration="${duration}"
        data-track-index="${50 + idx}"
        style="top: ${yPercent}%;">
        <div class="subtitle subtitle-${idx}" style="color: ${color}; font-size: ${fontSize}px;">${text}</div>
      </div>`;
    })
    .join("\n      ");

  // ─── Multi-overlays (PNG decals positioned via x,y normalized 0-1) ─────────
  const overlayElements = multiOverlays
    .map((o, idx) => {
      const src = toAbsoluteUrl(o.imageUrl);
      const xPercent = (o.x || 0.5) * 100;
      const yPercent = (o.y || 0.5) * 100;
      const scale = o.scale || 1;
      const rotation = o.rotation || 0;
      const opacity = typeof o.opacity === "number" ? o.opacity : 1;
      const widthPercent = scale * 30;
      return `<img class="overlay overlay-${idx}"
        src="${escapeHtml(src)}"
        data-start="0"
        data-duration="${totalDuration}"
        data-track-index="${100 + idx}"
        style="top: ${yPercent}%; left: ${xPercent}%; width: ${widthPercent}%; transform: translate(-50%, -50%) rotate(${rotation}deg); opacity: ${opacity};"
        alt="" />`;
    })
    .join("\n      ");

  // ─── Backsong audio (separate <audio> per hyperframes contract) ───────────
  const audioElement = backsongUrl
    ? `<audio src="${escapeHtml(backsongUrl)}" data-start="0" data-duration="${totalDuration}" data-track-index="200" data-volume="${backsongVolume}"></audio>`
    : "";

  // ─── GSAP timeline: enter/exit per clip-wrap, kinetic subtitle animation ───
  // RULES:
  // - Animate the WRAPPER (clip-wrap) for opacity/x — never the inner clip element
  // - Subtitle wraps have their own timing window, animate inner span
  // - Avoid exit animations except on the final segment (per hyperframes contract)
  const clipAnims = clipsWithTiming
    .map((c, idx) => {
      const transition = c.transition || "none";
      const start = c._start;
      const enterDuration = 0.45;
      const lines: string[] = [];
      // Entry only (transitions handle exit)
      if (transition === "fade") {
        lines.push(`tl.from("#clip-wrap-${idx}", { opacity: 0, duration: ${enterDuration}, ease: "power2.out" }, ${start});`);
      } else if (transition === "slide") {
        lines.push(`tl.from("#clip-wrap-${idx}", { x: ${width * 0.6}, opacity: 0, duration: ${enterDuration}, ease: "power3.out" }, ${start});`);
      } else if (transition === "zoom") {
        lines.push(`tl.from("#clip-wrap-${idx}", { scale: 0.85, opacity: 0, duration: ${enterDuration}, ease: "back.out(1.5)" }, ${start});`);
      }
      return lines.join("\n        ");
    })
    .filter(Boolean)
    .join("\n        ");

  // Per-clip text overlay enter (offset 0.1s from clip start so it pops AFTER clip)
  const textOverlayAnims = clipsWithTiming
    .filter((c) => c.textOverlay && c.textOverlay.trim())
    .map((c, idx) => {
      const start = c._start + 0.15;
      return `tl.from(".text-overlay-${idx}", { y: 30, opacity: 0, scale: 0.92, duration: 0.5, ease: "back.out(1.7)" }, ${start});`;
    })
    .join("\n        ");

  // Subtitle kinetic pop (animate inner span, not wrapper — wrapper is timed by data-duration)
  const subtitleAnims = subtitleEntries
    .map((s, idx) => {
      return `tl.from(".subtitle-${idx}", { y: 40, opacity: 0, scale: 0.9, duration: 0.3, ease: "back.out(2)" }, ${s.startSec});`;
    })
    .join("\n        ");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>TikTok Render — ${escapeHtml(spec.videoId)}</title>
  <script src="${GSAP_CDN}"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; overflow: hidden; }

    #stage {
      position: relative;
      width: ${width}px;
      height: ${height}px;
      background: #000;
      overflow: hidden;
    }

    /* Clip wrappers fill the stage */
    .clip-wrap {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }
    .clip {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* Ken Burns: slow scale-up animation (CSS-driven, NOT GSAP — plays per-clip lifetime) */
    .ken-burns {
      animation: ken-burns-zoom 8s linear forwards;
    }
    @keyframes ken-burns-zoom {
      0%   { transform: scale(1.0); }
      100% { transform: scale(1.18); }
    }

    /* Text overlay wrapper holds position; inner div is what GSAP animates */
    .text-overlay-wrap {
      position: absolute;
      z-index: 5;
      max-width: 90%;
    }
    .text-overlay {
      font-weight: 800;
      text-align: center;
      padding: 12px 24px;
      background: rgba(0, 0, 0, 0.55);
      border-radius: 10px;
      line-height: 1.2;
      letter-spacing: -0.01em;
      text-shadow: 0 2px 12px rgba(0,0,0,0.7);
    }

    /* Subtitle (kinetic-style) — wrapper centered, inner animates */
    .subtitle-wrap {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      z-index: 8;
      max-width: 88%;
      width: max-content;
    }
    .subtitle {
      font-weight: 900;
      text-align: center;
      padding: 18px 36px;
      background: rgba(0, 0, 0, 0.75);
      border-radius: 14px;
      line-height: 1.15;
      letter-spacing: -0.02em;
      text-shadow: 0 4px 20px rgba(0,0,0,0.8);
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }

    /* PNG overlays (decals) */
    .overlay {
      position: absolute;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="stage"
       data-composition-id="${compId}"
       data-start="0"
       data-duration="${totalDuration}"
       data-width="${width}"
       data-height="${height}"
       data-track-index="0">

      ${clipElements}
      ${textOverlayElements}
      ${subtitleElements}
      ${overlayElements}
      ${audioElement}

    <script>
      (function() {
        const tl = gsap.timeline({ paused: true });
        ${clipAnims}
        ${textOverlayAnims}
        ${subtitleAnims}
        // Register timeline so hyperframes can seek frame-accurately
        window.__timelines = window.__timelines || {};
        window.__timelines[${JSON.stringify(compId)}] = tl;
      })();
    </script>
  </div>
</body>
</html>`;
}
