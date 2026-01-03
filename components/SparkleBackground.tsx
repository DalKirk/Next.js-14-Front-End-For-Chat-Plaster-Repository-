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
      <style jsx global>{`
        .sparkle-container {
          position: fixed;
          width: 100%;
          height: 100vh;
          z-index: -10;
          background: radial-gradient(ellipse at center, #0a0a0a 0%, #000000 100%);
          background-color: #000000;
          pointer-events: none;
        }

        .sparkle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: radial-gradient(circle at 30% 30%, #00d4ff, #0099ff 40%, #0066cc 70%, #003d7a);
          border-radius: 50%;
          pointer-events: none;
          animation: sparkle-fade 2s ease-in-out infinite;
          box-shadow:
            0 0 10px rgba(0, 212, 255, 1),
            0 0 20px rgba(0, 153, 255, 0.8),
            0 0 30px rgba(0, 102, 204, 0.5),
            inset 0 0 5px rgba(0, 212, 255, 0.8);
          filter: blur(2px);
        }

        .sparkle.small { width: 4px; height: 4px; animation-duration: 1.5s; }
        .sparkle.medium { width: 6px; height: 6px; animation-duration: 2s; }
        .sparkle.large { width: 8px; height: 8px; animation-duration: 2.5s; }

        .sparkle.star { width: 0; height: 0; background: transparent; box-shadow: none; }

        .sparkle.star::before,
        .sparkle.star::after {
          content: '';
          position: absolute;
          background: linear-gradient(90deg, #00d4ff 0%, #0099ff 20%, #0066cc 50%, #0099ff 80%, #00d4ff 100%);
          box-shadow:
            0 0 15px rgba(0, 212, 255, 1),
            0 0 25px rgba(0, 153, 255, 0.8),
            inset 0 0 3px rgba(0, 212, 255, 1);
          filter: blur(1.5px);
        }

        .sparkle.star::before { width: 14px; height: 2px; top: -1px; left: -7px; }
        .sparkle.star::after { width: 2px; height: 14px; top: -7px; left: -1px; }

        .sparkle.light {
          background: radial-gradient(circle at 30% 30%, #66e0ff, #33ccff 30%, #00aaff 60%, #0088cc);
          box-shadow:
            0 0 12px rgba(102, 224, 255, 1),
            0 0 25px rgba(51, 204, 255, 0.9),
            0 0 40px rgba(0, 170, 255, 0.6),
            inset 0 0 6px rgba(102, 224, 255, 1);
        }

        .sparkle.bright {
          background: radial-gradient(circle at 30% 30%, #80e6ff, #4dd2ff 35%, #1ab8ff 65%, #0099e6);
          box-shadow:
            0 0 12px rgba(128, 230, 255, 1),
            0 0 24px rgba(77, 210, 255, 0.9),
            0 0 38px rgba(26, 184, 255, 0.6),
            inset 0 0 5px rgba(128, 230, 255, 1);
        }

        .sparkle.neon {
          background: radial-gradient(circle at 30% 30%, #00d4ff, #00b3ff 38%, #0088dd 68%, #0055aa);
          box-shadow:
            0 0 14px rgba(0, 212, 255, 1),
            0 0 26px rgba(0, 179, 255, 0.9),
            0 0 42px rgba(0, 136, 221, 0.6),
            inset 0 0 6px rgba(0, 212, 255, 0.95);
        }

        .sparkle.electric {
          background: radial-gradient(circle at 30% 30%, #1ae4ff, #00c8ff 40%, #009acc 70%, #006699);
          box-shadow:
            0 0 12px rgba(26, 228, 255, 1),
            0 0 24px rgba(0, 200, 255, 0.9),
            0 0 38px rgba(0, 154, 204, 0.6),
            inset 0 0 5px rgba(26, 228, 255, 0.85);
        }

        .sparkle.deep {
          background: radial-gradient(circle at 30% 30%, #33b8ff, #0099ff 42%, #0077cc 72%, #004d88);
          box-shadow:
            0 0 10px rgba(51, 184, 255, 1),
            0 0 22px rgba(0, 153, 255, 0.9),
            0 0 36px rgba(0, 119, 204, 0.6),
            inset 0 0 5px rgba(51, 184, 255, 0.8);
        }

        .sparkle.star.light::before,
        .sparkle.star.light::after {
          background: linear-gradient(90deg, #66e0ff 0%, #33ccff 15%, #00aaff 50%, #33ccff 85%, #66e0ff 100%);
          box-shadow:
            0 0 18px rgba(102, 224, 255, 1),
            0 0 30px rgba(51, 204, 255, 0.9),
            inset 0 0 4px rgba(102, 224, 255, 1);
        }

        .sparkle.star.bright::before,
        .sparkle.star.bright::after {
          background: linear-gradient(90deg, #80e6ff 0%, #4dd2ff 18%, #1ab8ff 50%, #4dd2ff 82%, #80e6ff 100%);
          box-shadow:
            0 0 16px rgba(128, 230, 255, 1),
            0 0 28px rgba(77, 210, 255, 0.9),
            inset 0 0 3px rgba(128, 230, 255, 0.95);
        }

        .sparkle.star.neon::before,
        .sparkle.star.neon::after {
          background: linear-gradient(90deg, #00d4ff 0%, #00b3ff 20%, #0088dd 50%, #00b3ff 80%, #00d4ff 100%);
          box-shadow:
            0 0 17px rgba(0, 212, 255, 1),
            0 0 29px rgba(0, 179, 255, 0.9),
            inset 0 0 4px rgba(0, 212, 255, 1);
        }

        .sparkle.star.electric::before,
        .sparkle.star.electric::after {
          background: linear-gradient(90deg, #1ae4ff 0%, #00c8ff 22%, #009acc 50%, #00c8ff 78%, #1ae4ff 100%);
          box-shadow:
            0 0 15px rgba(26, 228, 255, 1),
            0 0 27px rgba(0, 200, 255, 0.9),
            inset 0 0 3px rgba(26, 228, 255, 0.9);
        }

        .sparkle.star.deep::before,
        .sparkle.star.deep::after {
          background: linear-gradient(90deg, #33b8ff 0%, #0099ff 24%, #0077cc 50%, #0099ff 76%, #33b8ff 100%);
          box-shadow:
            0 0 14px rgba(51, 184, 255, 1),
            0 0 26px rgba(0, 153, 255, 0.9),
            inset 0 0 3px rgba(51, 184, 255, 0.85);
        }

        @keyframes sparkle-fade { 0%, 100% { opacity: 0; transform: scale(0); } 50% { opacity: 1; transform: scale(1); } }
        @keyframes twinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
        @keyframes float-up { 0% { opacity: 0; transform: translateY(0) scale(0); } 50% { opacity: 1; } 100% { opacity: 0; transform: translateY(-100px) scale(1); } }
        @keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 5px currentColor; } 50% { box-shadow: 0 0 20px currentColor, 0 0 30px currentColor; } }
        .sparkle.twinkle { animation: twinkle 3s ease-in-out infinite; }
        .sparkle.float { animation: float-up 4s ease-out infinite; }
        .sparkle.pulse { animation: pulse-glow 2s ease-in-out infinite; }

        .shooting-star {
          position: absolute;
          width: 3px;
          height: 3px;
          background: radial-gradient(circle at 30% 30%, #00d4ff, #0099ff 50%, #0066cc);
          border-radius: 50%;
          box-shadow:
            0 0 18px rgba(0, 212, 255, 1),
            0 0 30px rgba(0, 153, 255, 0.9),
            0 0 45px rgba(0, 102, 204, 0.7),
            inset 0 0 4px rgba(0, 212, 255, 1);
          animation: shoot 3s linear infinite;
          filter: blur(2px);
          pointer-events: none;
        }

        @keyframes shoot { 0% { transform: translate(0,0); opacity: 1; } 100% { transform: translate(-300px, 300px); opacity: 0; } }

        .cursor-sparkle {
          position: absolute;
          width: 10px;
          height: 10px;
          background: radial-gradient(circle at 30% 30%, #00d4ff, #0099ff 45%, #0066cc);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          animation: cursor-fade 0.8s ease-out forwards;
          box-shadow:
            0 0 22px rgba(0, 212, 255, 1),
            0 0 38px rgba(0, 153, 255, 0.9),
            0 0 55px rgba(0, 102, 204, 0.7),
            inset 0 0 5px rgba(0, 212, 255, 1);
          filter: blur(2.5px);
        }

        @keyframes cursor-fade { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0); } }
      `}</style>
    </>
  );
}
