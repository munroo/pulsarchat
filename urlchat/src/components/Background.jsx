import { useEffect, useRef } from "react";

const STAR_COUNT = 120;
const PULSAR_PERIOD = 4000; // ms per pulse cycle

export default function Background() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animId;
    let stars = [];
    let prevWidth = 0;

    function resize() {
      const newWidth = window.innerWidth;
      canvas.height = window.innerHeight;
      if (newWidth !== prevWidth) {
        canvas.width = newWidth;
        prevWidth = newWidth;
        initStars();
      }
    }

    function initStars() {
      stars = [];
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          r: Math.random() * 1.2 + 0.3,
          speed: Math.random() * 0.15 + 0.02,
          phase: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.002 + 0.001,
        });
      }
    }

    function draw(time) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // ── Pulsar glow ──────────────────────────────────
      const pulseT = (Math.sin((time / PULSAR_PERIOD) * Math.PI * 2) + 1) / 2;
      const glowAlpha = 0.03 + pulseT * 0.04; // very subtle: 0.03 – 0.07
      const glowRadius = 200 + pulseT * 100;

      const glow = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height * 0.4,
        0,
        canvas.width / 2,
        canvas.height * 0.4,
        glowRadius,
      );
      glow.addColorStop(0, `rgba(110, 231, 183, ${glowAlpha})`);
      glow.addColorStop(1, "rgba(110, 231, 183, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // ── Stars ────────────────────────────────────────
      for (const s of stars) {
        // Twinkle
        const alpha =
          0.3 + Math.sin(time * s.twinkleSpeed + s.phase) * 0.35 + 0.35;

        // Slow drift upward
        s.y -= s.speed;
        if (s.y < -2) {
          s.y = canvas.height + 2;
          s.x = Math.random() * canvas.width;
        }

        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    animId = requestAnimationFrame(draw);
    window.addEventListener("resize", resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        willChange: "transform",
      }}
    />
  );
}
