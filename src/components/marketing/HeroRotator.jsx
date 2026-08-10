"use client";

import React, { useEffect, useState } from "react";

const RED = "#E71920";
const INK = "#15100F";

// Short, confident, declarative — never a paragraph. Second line is the accent
// line (rendered in brand red) so each slide reads as one punchy statement.
const SLIDES = [
  { lines: ["Invest smart.", "Grow together."] },
  { lines: ["Your money.", "Your record."] },
  { lines: ["Save. Invest.", "Grow."] },
  { lines: ["Built for", "young investors."] },
  { lines: ["Every contribution", "deserves a record."] },
];

/**
 * Editorial hero carousel — cycles short, declarative statements instead of one
 * static headline. Pure CSS fade, no external animation library. Respects
 * prefers-reduced-motion via the global rule in app/globals.css (collapses all
 * animation/transition durations to ~0), so this degrades to simply showing the
 * first slide without the fade.
 */
export function HeroRotator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4200);
    return () => clearInterval(t);
  }, []);

  const slide = SLIDES[index];

  return (
    <div style={{ minHeight: 168 }}>
      <h1
        key={index}
        style={{
          fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: "clamp(34px, 6vw, 64px)",
          lineHeight: 1.08, letterSpacing: "-0.01em", margin: "0 auto", maxWidth: 720, color: INK,
          animation: "jbd-count-fade 0.6s ease",
        }}
      >
        {slide.lines[0]}
        <br />
        <span style={{ color: RED }}>{slide.lines[1]}</span>
      </h1>
      <div style={{ display: "flex", gap: 7, justifyContent: "center", marginTop: 28 }}>
        {SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={"Show statement " + (i + 1) + " of " + SLIDES.length}
            aria-current={i === index}
            onClick={() => setIndex(i)}
            style={{
              width: i === index ? 22 : 7, height: 5, borderRadius: 3, cursor: "pointer", padding: 0,
              border: "none", background: i === index ? RED : "#E3D9DA", transition: "width 0.25s, background 0.25s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
