"use client";

/**
 * Starfield — CSS-only starfield background.
 *
 * Performance characteristics:
 * - 3 DOM elements total (vs 150+ in the old SparkleBackground)
 * - Zero JavaScript after mount
 * - All animations use transform + opacity only (GPU composited)
 * - box-shadow is static (computed once, never repaints)
 * - No filter:blur(), no layout thrashing, no GC pressure
 */
export default function Starfield() {
  return (
    <>
      {/* CSS starfield — fixed, pointer-events:none, behind everything */}
      <div className="starfield-container">
        <div className="stars-sm" />
        <div className="stars-md" />
        <div className="stars-lg" />
      </div>
      {/* Subtle ambient glow — single radial gradient, no animation */}
      <div className="ambient-glow" />
    </>
  );
}
