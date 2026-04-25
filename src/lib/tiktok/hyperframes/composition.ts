/**
 * HyperFrames Composition Generator
 *
 * Translates TiktokVideo data (clips + subtitles + overlays + backsong) into
 * a complete HTML composition file consumable by hyperframes CLI.
 *
 * Output structure (single root composition for full video):
 *   <html>
 *     <head>
 *       - GSAP from CDN
 *       - inline CSS (TikTok 9:16 styles)
 *     </head>
 *     <body>
 *       <div id="stage" data-composition-id="tiktok" data-start="0"
 *            data-duration="N" data-width="1080" data-height="1920"
 *            data-track-index="0">
 *         <!-- Per-clip element with absolute positioning + GSAP-driven enter/exit -->
 *         <video|img class="clip-X" data-start="..." data-duration="..." data-track-index="0" />
 *         <!-- Per-clip text overlay -->
 *         <div class="text-overlay-X" data-start="..." data-duration="..." data-track-index="1">{text}</div>
 *         <!-- Subtitle entries (absolute timing) -->
 *         <div class="subtitle subtitle-Y" data-start="..." data-duration="..." data-track-index="2">{text}</div>
 *         <!-- Multi-overlays -->
 *         <img class="overlay overlay-Z" data-start="0" data-duration="N" data-track-index="3" />
 *         <!-- Backsong audio -->
 *         <audio data-start="0" data-duration="N" data-track-index="10" data-volume="0.5" src="..." />
 *
 *         <!-- GSAP timeline drives all the visual transitions, kinetic text, etc -->
 *         <script>...</script>
 *       </div>
 *     </body>
 *   </html>
 *
 * Reference: https://github.com/heygen-com/hyperframes
 */

import type { ClipInput, MultiOverlayInput, RenderSpec, SubtitleEntryInput } from "../types";

const GSAP_CDN = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";

/** Resolve relative path / public URL to a path Chrome can fetch.
 *  When rendering from CLI, hyperframes serves the composition dir via http,
 *  so we need ABSOLUTE URLs (production domain) so assets resolve.
 */
function toAbsoluteUrl(urlOrPath: string): string {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) return urlOrPath;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://jurnalishukumbandung.com").replace(/\/$/, "");
  if (urlOrPath.startsWith("/")) return `${base}${urlOrPath}`;
  return `${base}/${urlOrPath}`;
}

/** Escape HTML for safe insertion into innerHTML / attribute values */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Compute final duration for the composition (sum of clip durations, capped at maxDurationSec) */
function computeDuration(clips: ClipInput[], maxDurationSec = 60): number {
  const total = clips.reduce((sum, c) => sum + c.durationSec, 0);
  return Math.min(total, maxDurationSec);
}

/** Convert pixel-position (textX/textY 0-100% of canvas) to CSS top/left percentages. */
function pixelPositionStyle(
  textX: number | null | undefined,
  textY: number | null | undefined,
  textPosition: string | null | undefined
): string {
  // Pixel-precise wins
  if (typeof textX === "number" && typeof textY === "number") {
    return `top: ${textY}%; left: ${textX}%; transform: translate(-50%, -50%);`;
  }
  // 9-grid presets
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

/**
 * Build the HTML composition file.
 *
 * Layout philosophy: each clip is a <video> or <img> stacked at z-index 1.
 * Text overlays z-index 2-3. Subtitles z-index 5. Multi-overlays z-index 10.
 * GSAP timeline drives entry/exit (fade, slide, zoom transitions).
 */
export function buildHyperframesComposition(spec: RenderSpec): string {
  const width = spec.outputWidth || 1080;
  const height = spec.outputHeight || 1920;
  const fps = spec.outputFps || 30;
  const maxDuration = spec.maxDurationSec || 60;

  const clips = [...spec.clips].sort((a, b) => a.order - b.order);
  const totalDuration = computeDuration(clips, maxDuration);

  // Compute clip start times sequentially (each clip plays right after the previous)
  let cursor = 0;
  const clipsWithTiming = clips.map((c) => {
    const start = cursor;
    const duration = c.durationSec;
    cursor += duration;
    return { ...c, _start: start, _duration: duration };
  });

  const subtitleEntries = spec.subtitleEntries || [];
  const multiOverlays = spec.multiOverlays || [];
  const backsongUrl = spec.backsongUrl ? toAbsoluteUrl(spec.backsongUrl) : null;
  const backsongVolume = spec.backsongVolume ?? 0.5;

  // ─── Build clip elements ────────────────────────────────────
  const clipElements = clipsWithTiming
    .map((c, idx) => {
      const src = toAbsoluteUrl(c.sourceUrl);
      const trimStart = c.trimStart && c.trimStart > 0 ? c.trimStart : 0;
      if (c.type === "video") {
        return `<video class="clip clip-${idx}" id="clip-${idx}"
          src="${escapeHtml(src)}"
          data-start="${c._start}"
          data-duration="${c._duration}"
          data-media-start="${trimStart}"
          data-track-index="0"
          muted></video>`;
      }
      // image
      const kenBurnsClass = c.kenBurns ? "ken-burns" : "";
      return `<img class="clip clip-img clip-${idx} ${kenBurnsClass}" id="clip-${idx}"
        src="${escapeHtml(src)}"
        data-start="${c._start}"
        data-duration="${c._duration}"
        data-track-index="0"
        alt="" />`;
    })
    .join("\n      ");

  // ─── Per-clip text overlay ──────────────────────────────────
  const textOverlayElements = clipsWithTiming
    .filter((c) => c.textOverlay && c.textOverlay.trim())
    .map((c, idx) => {
      const text = escapeHtml((c.textOverlay || "").trim().slice(0, 240));
      const color = c.textColor || "#FFFFFF";
      const fontSize = c.textFontSize || 54;
      const positionStyle = pixelPositionStyle(c.textX, c.textY, c.textPosition);
      const rotation = c.textRotation || 0;
      return `<div class="text-overlay text-overlay-${idx}"
        data-start="${c._start}"
        data-duration="${c._duration}"
        data-track-index="1"
        style="${positionStyle} color: ${color}; font-size: ${fontSize}px; transform-origin: center; ${rotation !== 0 ? `transform: ${positionStyle.includes("translate") ? "" : ""}rotate(${rotation}deg);` : ""}"
      >${text}</div>`;
    })
    .join("\n      ");

  // ─── Subtitle entries (absolute timing) ─────────────────────
  const subtitleElements = subtitleEntries
    .map((s, idx) => {
      const text = escapeHtml(s.text.trim().slice(0, 240));
      const color = s.color || "#FFFFFF";
      const fontSize = s.fontSize || 54;
      const yPercent = typeof s.y === "number" ? s.y * 100 : 85;
      const duration = s.endSec - s.startSec;
      return `<div class="subtitle subtitle-${idx}"
        data-start="${s.startSec}"
        data-duration="${duration}"
        data-track-index="5"
        style="top: ${yPercent}%; color: ${color}; font-size: ${fontSize}px;"
      >${text}</div>`;
    })
    .join("\n      ");

  // ─── Multi-overlays (PNG / image overlays positioned via x,y normalized 0-1) ───────
  const overlayElements = multiOverlays
    .map((o: MultiOverlayInput, idx) => {
      const src = toAbsoluteUrl(o.imageUrl);
      const xPercent = (o.x || 0.5) * 100;
      const yPercent = (o.y || 0.5) * 100;
      const scale = o.scale || 1;
      const rotation = o.rotation || 0;
      const opacity = typeof o.opacity === "number" ? o.opacity : 1;
      // Width: scale × 30% of canvas
      const widthPercent = scale * 30;
      return `<img class="overlay overlay-${idx}"
        src="${escapeHtml(src)}"
        data-start="0"
        data-duration="${totalDuration}"
        data-track-index="${10 + idx}"
        style="top: ${yPercent}%; left: ${xPercent}%; width: ${widthPercent}%; transform: translate(-50%, -50%) rotate(${rotation}deg); opacity: ${opacity};"
        alt="" />`;
    })
    .join("\n      ");

  // ─── Backsong audio ─────────────────────────────────────────
  const audioElement = backsongUrl
    ? `<audio src="${escapeHtml(backsongUrl)}" data-start="0" data-duration="${totalDuration}" data-track-index="20" data-volume="${backsongVolume}"></audio>`
    : "";

  // ─── Build GSAP timeline (transitions per clip) ─────────────
  // For each clip, register an enter/exit animation based on transition type
  const gsapTimelineCode = clipsWithTiming
    .map((c, idx) => {
      const transition = c.transition || "none";
      const start = c._start;
      const dur = c._duration;
      const enterDuration = 0.4;
      const exitDuration = 0.4;
      let lines: string[] = [];

      // Entry animation
      if (transition === "fade") {
        lines.push(`tl.from("#clip-${idx}", { opacity: 0, duration: ${enterDuration}, ease: "power2.out" }, ${start});`);
      } else if (transition === "slide") {
        lines.push(`tl.from("#clip-${idx}", { x: ${width}, duration: ${enterDuration}, ease: "power3.out" }, ${start});`);
      } else if (transition === "zoom") {
        lines.push(`tl.from("#clip-${idx}", { scale: 1.3, opacity: 0, duration: ${enterDuration}, ease: "power2.out" }, ${start});`);
      }

      // Exit animation (only if not last clip — last clip should fade out video naturally)
      if (idx < clipsWithTiming.length - 1) {
        const exitStart = start + dur - exitDuration;
        if (transition === "fade") {
          lines.push(`tl.to("#clip-${idx}", { opacity: 0, duration: ${exitDuration}, ease: "power2.in" }, ${exitStart});`);
        }
      }

      return lines.join("\n        ");
    })
    .filter(Boolean)
    .join("\n        ");

  // ─── Subtitle GSAP entry/exit (pop-in pop-out kinetic style) ───
  const subtitleAnims = subtitleEntries
    .map((s, idx) => {
      const enterDur = 0.25;
      const exitDur = 0.2;
      const dur = s.endSec - s.startSec;
      const exitAt = s.startSec + dur - exitDur;
      return `tl.from(".subtitle-${idx}", { y: 50, opacity: 0, scale: 0.9, duration: ${enterDur}, ease: "back.out(2)" }, ${s.startSec});
        tl.to(".subtitle-${idx}", { y: -20, opacity: 0, duration: ${exitDur}, ease: "power2.in" }, ${exitAt});`;
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

    /* Clips fill the stage with object-fit cover (no letterbox, true vertical) */
    .clip {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      z-index: 1;
    }

    /* Ken Burns: slow scale-up over clip duration */
    .ken-burns {
      animation: ken-burns-zoom var(--clip-duration, 5s) linear forwards;
    }
    @keyframes ken-burns-zoom {
      0% { transform: scale(1.0); }
      100% { transform: scale(1.15); }
    }

    /* Text overlay (per-clip) */
    .text-overlay {
      position: absolute;
      z-index: 5;
      font-weight: 800;
      text-align: center;
      padding: 12px 24px;
      background: rgba(0, 0, 0, 0.55);
      border-radius: 8px;
      max-width: 90%;
      line-height: 1.2;
      letter-spacing: -0.01em;
      text-shadow: 0 2px 12px rgba(0,0,0,0.7);
    }

    /* Subtitle (kinetic-style) */
    .subtitle {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      z-index: 8;
      font-weight: 900;
      text-align: center;
      padding: 16px 32px;
      background: rgba(0, 0, 0, 0.7);
      border-radius: 12px;
      max-width: 88%;
      line-height: 1.15;
      letter-spacing: -0.02em;
      text-shadow: 0 4px 20px rgba(0,0,0,0.8);
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
    }

    /* Multi-overlays (PNG images placed anywhere) */
    .overlay {
      position: absolute;
      pointer-events: none;
    }
  </style>
</head>
<body>
  <div id="stage"
       data-composition-id="tiktok-${spec.videoId}"
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
        ${gsapTimelineCode}
        ${subtitleAnims}
        // Expose timeline so hyperframes can seek frame-accurately
        window.__hf_timeline__ = tl;
        tl.play();
      })();
    </script>
  </div>
</body>
</html>`;
}
