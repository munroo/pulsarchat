import { useEffect, useRef } from "react";

/**
 * Animated pulsar black hole logo.
 * - Central dark sphere
 * - Glowing accretion disk ring that slowly rotates (3D tilt via ellipse)
 * - Subtle particle shimmer around the disk
 * - Soft glow pulses
 */

export default function PulsarLogo({ size = 120 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = size * 1.6;
    const h = size * 1.2;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;

    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const cx = w / 2;
    const cy = h / 2;
    const holeRadius = size * 0.16;
    const diskA = size * 0.52; // semi-major (horizontal)
    const diskB = size * 0.14; // semi-minor (vertical tilt)

    // Particles orbiting the disk
    const PARTICLE_COUNT = 60;
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 0.85 + Math.random() * 0.35; // distance multiplier from disk center
      particles.push({
        angle,
        dist,
        speed: (0.3 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1),
        size: Math.random() * 1.2 + 0.3,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let animId;

    function draw(time) {
      const t = time / 1000;
      ctx.clearRect(0, 0, w, h);

      // ── Outer glow pulse ───────────────────────────
      const pulse = (Math.sin(t * 1.2) + 1) / 2;
      const glowR = size * 0.5 + pulse * size * 0.12;
      const glow = ctx.createRadialGradient(cx, cy, holeRadius, cx, cy, glowR);
      glow.addColorStop(0, "rgba(110, 231, 183, 0.08)");
      glow.addColorStop(0.5, "rgba(110, 231, 183, 0.03)");
      glow.addColorStop(1, "rgba(110, 231, 183, 0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // ── Back half of accretion disk (behind the hole) ──
      drawDiskHalf(ctx, cx, cy, diskA, diskB, t, "back");

      // ── Black hole sphere ──────────────────────────
      // Dark core
      const holeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, holeRadius);
      holeGrad.addColorStop(0, "#050505");
      holeGrad.addColorStop(0.8, "#0a0a0a");
      holeGrad.addColorStop(1, "#111");
      ctx.beginPath();
      ctx.arc(cx, cy, holeRadius, 0, Math.PI * 2);
      ctx.fillStyle = holeGrad;
      ctx.fill();

      // Rim highlight (gravitational lensing edge)
      const rimGrad = ctx.createRadialGradient(
        cx,
        cy,
        holeRadius * 0.85,
        cx,
        cy,
        holeRadius * 1.15,
      );
      rimGrad.addColorStop(0, "rgba(110, 231, 183, 0)");
      rimGrad.addColorStop(0.5, `rgba(110, 231, 183, ${0.15 + pulse * 0.1})`);
      rimGrad.addColorStop(1, "rgba(110, 231, 183, 0)");
      ctx.beginPath();
      ctx.arc(cx, cy, holeRadius * 1.05, 0, Math.PI * 2);
      ctx.fillStyle = rimGrad;
      ctx.fill();

      // ── Front half of accretion disk (in front of hole) ──
      drawDiskHalf(ctx, cx, cy, diskA, diskB, t, "front");

      // ── Orbiting particles ─────────────────────────
      for (const p of particles) {
        const a = p.angle + t * p.speed * 0.4;
        const px = cx + Math.cos(a) * diskA * p.dist;
        const py = cy + Math.sin(a) * diskB * p.dist;
        const twinkle = (Math.sin(t * 3 + p.phase) + 1) / 2;
        const alpha = 0.15 + twinkle * 0.4;

        // Only draw particles that are "in front" or "behind" correctly
        const isFront = Math.sin(a) > 0;
        ctx.globalAlpha = alpha * (isFront ? 1 : 0.3);
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 240, 220, 1)`;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      animId = requestAnimationFrame(draw);
    }

    function drawDiskHalf(ctx, cx, cy, a, b, t, half) {
      // Draw the accretion disk as layered ellipses with color gradient
      // "back" = top half of ellipse (behind sphere), "front" = bottom half
      const startAngle = half === "back" ? Math.PI : 0;
      const endAngle = half === "back" ? Math.PI * 2 : Math.PI;

      const layers = [
        { offset: 0, width: 8, color: "rgba(110, 231, 183, 0.03)" },
        { offset: 0, width: 5, color: "rgba(110, 231, 183, 0.06)" },
        { offset: 0, width: 3, color: "rgba(110, 231, 183, 0.15)" },
        { offset: 0, width: 1.5, color: "rgba(200, 255, 235, 0.3)" },
        { offset: 0, width: 0.7, color: "rgba(255, 255, 255, 0.5)" },
      ];

      // Slight wobble for organic feel
      const wobble = Math.sin(t * 0.8) * 0.02;

      for (const layer of layers) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(wobble);
        ctx.beginPath();
        ctx.ellipse(0, 0, a, b, 0, startAngle, endAngle);
        ctx.lineWidth = layer.width;
        ctx.strokeStyle = layer.color;
        ctx.stroke();
        ctx.restore();
      }

      // Hot spots — brighter points along the disk edge
      const hotspotCount = 3;
      for (let i = 0; i < hotspotCount; i++) {
        const baseAngle =
          (i / hotspotCount) * Math.PI + (half === "back" ? Math.PI : 0);
        const ha = baseAngle + t * 0.3;
        // Keep within the correct half
        const normA = ((ha % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const inBack = normA >= Math.PI && normA <= Math.PI * 2;
        const inFront = normA >= 0 && normA < Math.PI;
        if ((half === "back" && !inBack) || (half === "front" && !inFront))
          continue;

        const hx = cx + Math.cos(ha) * a;
        const hy = cy + Math.sin(ha) * b;
        const hotGlow = ctx.createRadialGradient(hx, hy, 0, hx, hy, 6);
        hotGlow.addColorStop(0, "rgba(200, 255, 240, 0.4)");
        hotGlow.addColorStop(1, "rgba(110, 231, 183, 0)");
        ctx.fillStyle = hotGlow;
        ctx.fillRect(hx - 6, hy - 6, 12, 12);
      }
    }

    animId = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(animId);
  }, [size]);

  return (
    <canvas ref={canvasRef} style={{ display: "block", margin: "0 auto" }} />
  );
}
