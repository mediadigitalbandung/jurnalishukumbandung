"use client";

import { useEffect } from "react";

/**
 * ZoomCompensator detects browser zoom level and applies a CSS
 * custom property (--zoom-compensate) on \<html\> to reduce
 * the effective sizing when the user zooms in beyond 110%.
 *
 * At 100% zoom → --zoom-compensate: 1
 * At 125% zoom → --zoom-compensate: ~0.88
 * At 150% zoom → --zoom-compensate: ~0.78
 * At 175% zoom → --zoom-compensate: ~0.7
 * At 200% zoom → --zoom-compensate: ~0.65
 *
 * This allows the font-size on \<html\> to shrink proportionally,
 * keeping the layout more like the 100% view.
 */
export default function ZoomCompensator() {
  useEffect(() => {
    function applyZoomCompensation() {
      // Detect zoom ratio (works in most desktop browsers)
      const zoomRatio = Math.round((window.outerWidth / window.innerWidth) * 100) / 100;

      // Only compensate when zoom > 110%
      if (zoomRatio > 1.1) {
        // Damped compensation: don't fully counteract zoom, but soften it
        // At 175% zoom (ratio=1.75): scale = 1 / (1 + (1.75-1)*0.55) ≈ 0.71
        const compensate = 1 / (1 + (zoomRatio - 1) * 0.5);
        document.documentElement.style.setProperty(
          "--zoom-compensate",
          compensate.toFixed(4)
        );
        document.documentElement.classList.add("zoom-compensated");
      } else {
        document.documentElement.style.removeProperty("--zoom-compensate");
        document.documentElement.classList.remove("zoom-compensated");
      }
    }

    applyZoomCompensation();
    window.addEventListener("resize", applyZoomCompensation);
    return () => window.removeEventListener("resize", applyZoomCompensation);
  }, []);

  return null;
}
