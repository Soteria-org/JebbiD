"use client";

import React, { useEffect, useState } from "react";

const SLIDES = [
  { line: "Invest with purpose.", sub: "Not with impulse." },
  { line: "Start small.", sub: "Think big." },
  { line: "Own your future.", sub: "One deposit at a time." },
  { line: "We don't chase money.", sub: "We build it." },
  { line: "Discipline pays.", sub: "Consistently, quietly, on schedule." },
];

/**
 * Rotating editorial headline for the hero — cycles through short,
 * declarative statements instead of one static line. Pure CSS fade, no
 * external animation library. Respects prefers-reduced-motion via the
 * global rule in app/globals.css (which collapses all transition/animation
 * durations to ~0), so this degrades to simply showing the first slide.
 */
export function HeroRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4200);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[index];

  return (
    <div style={{ minHeight: 132 }}>
      <h1
        key={index}
        style={{
          fontFamily: "'Fraunces',serif", fontWeight: 500, fontSize: "clamp(32px, 5.2vw, 56px)",
          lineHeight: 1.14, margin: "0 auto 14px", maxWidth: 780,
          animation: "jbd-count-fade 0.6s ease",
        }}
      >
        {slide.line}
      </h1>
      <div
        key={"sub-" + index}
        style={{ fontSize: 16, color: "#D9C2A8", animation: "jbd-count-fade 0.6s ease 0.1s backwards" }}
      >
        {slide.sub}
      </div>
      <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 20 }}>
        {SLIDES.map((_, i) => (
          <div
            key={i}
            onClick={() => setIndex(i)}
            style={{
              width: i === index ? 18 : 6, height: 6, borderRadius: 3, cursor: "pointer",
              background: i === index ? "#B98A2E" : "rgba(216,189,130,0.35)", transition: "width 0.25s, background 0.25s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
