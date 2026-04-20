"use client";

import Lottie from "lottie-react";
import Link from "next/link";
import astronautAnim from "@/public/animations/astronaut-404.json";

export default function NotFound() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, #0d0d1a 0%, #000000 100%)",
      }}
    >
      {/* Lottie animation */}
      <div className="w-64 h-64 sm:w-80 sm:h-80">
        <Lottie animationData={astronautAnim} loop />
      </div>

      {/* Text */}
      <h1
        className="mt-2 text-6xl sm:text-7xl font-bold tracking-wider"
        style={{
          fontFamily: "var(--font-orbitron), 'Orbitron', sans-serif",
          background: "linear-gradient(135deg, #c084fc 0%, #06b6d4 50%, #34d399 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        404
      </h1>
      <p className="mt-3 text-base sm:text-lg" style={{ color: "rgba(255,255,255,0.5)" }}>
        Lost in space — this page doesn&apos;t exist
      </p>

      {/* Back button */}
      <Link
        href="/"
        className="mt-8 px-6 py-2.5 rounded-full text-sm font-medium transition-all hover:scale-105"
        style={{
          background: "linear-gradient(135deg, rgba(192,132,252,0.2), rgba(6,182,212,0.2))",
          border: "1px solid rgba(192,132,252,0.3)",
          color: "rgba(192,132,252,0.9)",
        }}
      >
        Return to Starcyeed
      </Link>
    </div>
  );
}
