"use client";

import { useEffect } from "react";

/**
 * ZoomCompensator detects browser zoom level and scales down
 * the page proportionally so elements don't blow up at high zoom.
 *
 * At 100% zoom → no change
 * At 125% zoom → font-size shrinks ~12%, layout stays compact
 * At 150% zoom → font-size shrinks ~22%
 * At 200% zoom → font-size shrinks ~35%
 */
export default function ZoomCompensator() {
  useEffect(() => {
    function applyZoomCompensation() {
      const zoomRatio = Math.round((window.outerWidth / window.innerWidth) * 100) / 100;

      if (zoomRatio > 1.1) {
        // More aggressive dampening: at 200% zoom, compensate = ~0.65
        const compensate = 1 / (1 + (zoomRatio - 1) * 0.55);
        const el = document.documentElement;
        el.style.setProperty("--zoom-compensate", compensate.toFixed(4));
        el.classList.add("zoom-compensated");

        // Also cap the root font-size so rem-based sizing shrinks
        el.style.fontSize = `${(16 * compensate).toFixed(2)}px`;
      } else {
        const el = document.documentElement;
        el.style.removeProperty("--zoom-compensate");
        el.style.removeProperty("font-size");
        el.classList.remove("zoom-compensated");
      }
    }

    applyZoomCompensation();
    window.addEventListener("resize", applyZoomCompensation);
    return () => window.removeEventListener("resize", applyZoomCompensation);
  }, []);

  return null;
}
