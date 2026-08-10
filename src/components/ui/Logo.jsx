import React from "react";
import Image from "next/image";

// The real Jebbidox brand mark — the actual uploaded artwork (red circular
// badge, calligraphic "J"), cropped tight to the badge and background-removed,
// hosted in the brand's Bloom asset library. Rendered as a raster image
// rather than a reconstructed vector so the mark matches the source file
// exactly, the same way the landing page's photography is sourced.
// `animated` adds a slow, deliberate breathing ring (a stamped-wax-seal cue,
// not a spinner) — off by default so it isn't sprinkled onto every small nav
// usage.
const LOGO_SRC = "https://www.trybloom.ai/img/f5c70938-f021-40a9-a5bc-a27bc044ccd1";

export function Logo({ size, animated }) {
  const s = size || 34;
  return (
    <div
      style={{
        position: "relative",
        width: s,
        height: s,
        borderRadius: "50%",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow: animated ? "0 0 0 0 rgba(232,15,40,0.35)" : "none",
        animation: animated ? "jbd-logo-breathe 3.2s ease-in-out infinite" : "none",
      }}
    >
      <Image
        src={LOGO_SRC}
        alt="Jebbidox"
        fill
        sizes={`${s}px`}
        style={{ objectFit: "cover" }}
        priority
      />
    </div>
  );
}
