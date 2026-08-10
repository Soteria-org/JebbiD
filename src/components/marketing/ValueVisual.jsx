import React from "react";

const RED = "#E71920";
const INK = "#15100F";

/**
 * The landing page's one "core image" (Section 2, right column) — an original
 * flat-illustration graphic, not a stock photo, built as inline SVG so it never
 * depends on an external asset host. Two young members + an ascending
 * contribution chart, in the landing page's red/black/white system. Kept to
 * simple geometric shapes deliberately (no attempted photorealism) so it reads
 * as an intentional editorial mark rather than clipart.
 */
export function ValueVisual() {
  return (
    <svg
      viewBox="0 0 400 460"
      role="img"
      aria-labelledby="jbd-value-visual-title"
      style={{ width: "100%", height: "auto", display: "block" }}
    >
      <title id="jbd-value-visual-title">
        Two young Jebbidox members and a rising contribution chart, illustrating steady investment growth
      </title>

      {/* Ascending contribution bars */}
      <g>
        <rect x="42" y="352" width="40" height="60" rx="4" fill="#F6C7C9" />
        <rect x="102" y="322" width="40" height="90" rx="4" fill="#EF9DA0" />
        <rect x="162" y="282" width="40" height="130" rx="4" fill="#E75459" />
        <rect x="222" y="232" width="40" height="180" rx="4" fill={RED} />
      </g>
      {/* Trend line across the bar tops */}
      <polyline
        points="62,352 122,322 182,282 242,232"
        fill="none"
        stroke={INK}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1 7"
      />
      <circle cx="242" cy="232" r="5" fill={INK} />

      {/* Member figure (back) */}
      <g>
        <circle cx="120" cy="150" r="30" fill={INK} />
        <path d="M60 260 C60 205 88 182 120 182 C152 182 180 205 180 260 L180 268 L60 268 Z" fill={INK} />
      </g>

      {/* Member figure (front, red accent) */}
      <g>
        <circle cx="250" cy="128" r="34" fill={INK} />
        <path d="M182 268 C182 202 214 174 250 174 C286 174 318 202 318 268 L318 276 L182 276 Z" fill={INK} />
        <path d="M228 188 L250 232 L272 188 C263 183 257 181 250 181 C243 181 237 183 228 188 Z" fill={RED} />
      </g>

      <line x1="20" y1="412" x2="360" y2="412" stroke="#E3E3E5" strokeWidth="1.5" />
    </svg>
  );
}
