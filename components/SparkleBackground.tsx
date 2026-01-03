"use client";

import React, { useEffect, useRef } from "react";

export default function SparkleBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const shades = ["light", "bright", "neon", "electric", "deep"]; // neon blue palette
    const sizes = ["small", "medium", "large"];
    const animations = ["", "twinkle", "float", "pulse"];

    const createSparkle = () => {
      const sparkle = document.createElement("div");
      sparkle.className = "sparkle";

      const isStarShaped = Math.random() > 0.7;
      const shade = shades[Math.floor(Math.random() * shades.length)];
      const size = sizes[Math.floor(Math.random() * sizes.length)];
      const animation = animations[Math.floor(Math.random() * animations.length)];

      if (isStarShaped) sparkle.classList.add("star");
      sparkle.classList.add(shade);
      sparkle.classList.add(size);
      if (animation) sparkle.classList.add(animation);

      sparkle.style.left = Math.random() * 100 + "%";
      sparkle.style.top = Math.random() * 100 + "%";
      sparkle.style.animationDelay = Math.random() * 3 + "s";
      container.appendChild(sparkle);
    };

    for (let i = 0; i < 100; i++) createSparkle();

    const sparkleInterval = window.setInterval(() => {
      createSparkle();
      const sparkles = container.querySelectorAll(".sparkle");
      if (sparkles.length > 150) sparkles[0].remove();
    }, 200);

    const createShootingStar = () => {
      const star = document.createElement("div");
      star.className = "shooting-star";
      star.style.left = 50 + Math.random() * 50 + "%";
      star.style.top = Math.random() * 50 + "%";
      star.style.animationDelay = Math.random() * 5 + "s";
      container.appendChild(star);
      window.setTimeout(() => star.remove(), 3000);
    };

    const shootingInterval = window.setInterval(createShootingStar, 2000);

    const createCursorSparkle = (clientX: number, clientY: number) => {
      if (Math.random() > 0.7) {
        const sparkle = document.createElement("div");
        sparkle.className = "cursor-sparkle";
        const rect = container.getBoundingClientRect();
        // For fixed container, client coordinates map directly
        const left = clientX - rect.left;
        const top = clientY - rect.top;
        sparkle.style.left = `${left}px`;
        sparkle.style.top = `${top}px`;
        container.appendChild(sparkle);
        window.setTimeout(() => sparkle.remove(), 800);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      createCursorSparkle(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        createCursorSparkle(touch.clientX, touch.clientY);
      }
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("touchmove", onTouchMove, { passive: true });

    // Disable click bursts to keep background purely visual and non-interactive

    return () => {
      window.clearInterval(sparkleInterval);
      window.clearInterval(shootingInterval);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("touchmove", onTouchMove);
      // Clean up any remaining DOM nodes we created
      container.querySelectorAll(".sparkle, .shooting-star").forEach((el) => el.remove());
      container.querySelectorAll(".cursor-sparkle").forEach((el) => el.remove());
    };
  }, []);

  return (
    <>
      <div ref={containerRef} className="sparkle-container fixed inset-0 -z-10 pointer-events-none" />
    </>
  );
}
