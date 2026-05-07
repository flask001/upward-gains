// src/App.jsx
import React, { useEffect, useState, useRef } from "react";

const STAT_CONFIG = [
  { id: "deposit", label: "TOTAL DEPOSIT", initial: 98650000000, image: "https://cdn-icons-png.flaticon.com/512/3135/3135706.png" },
  { id: "withdrawal", label: "TOTAL WITHDRAWAL", initial: 35600000000, image: "https://cdn-icons-png.flaticon.com/512/3064/3064197.png" },
  { id: "members", label: "TOTAL MEMBERS", initial: 995000, image: "https://cdn-icons-png.flaticon.com/512/847/847969.png" },
  { id: "visitors", label: "AVERAGE VISITORS", initial: 645000, image: "https://cdn-icons-png.flaticon.com/512/1828/1828884.png" },
  { id: "active", label: "ACTIVE MEMBERS", initial: 777000, image: "https://cdn-icons-png.flaticon.com/512/1828/1828640.png" },
  { id: "referrals", label: "MEMBERS REFERRED", initial: 573000, image: "https://cdn-icons-png.flaticon.com/512/565/565547.png" },
];

const formatNumber = (num) => {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(0) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(0) + "K";
  return num;
};

const getStartValue = (value) => {
  if (value >= 1e9) return 1e9;
  if (value >= 1e6) return 1e6;
  if (value >= 1e3) return 1e3;
  return 0;
};

const easeOutExpo = (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x));

const AnimatedNumber = ({ value, start }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!start) return;

    const startValue = getStartValue(value);
    let startTime = null;
    const duration = 40000;

    const animate = (time) => {
      if (!startTime) startTime = time;

      const progress = Math.min((time - startTime) / duration, 1);
      const eased = easeOutExpo(progress);

      const current = startValue + (value - startValue) * eased;

      setDisplay(current);

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value, start]);

  return (
    <h2
      className="text-2xl font-semibold my-2 tracking-wider"
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {formatNumber(Math.floor(display))}
    </h2>
  );
};

// Blockchain particles background
const BlockchainBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let width = window.innerWidth;
    let height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    const HEX_SIZE = 6;

    const nodes = Array.from({ length: 55 }).map(() => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      angle: Math.random() * Math.PI,
    }));

    const drawHex = (x, y, size, angle) => {
      ctx.beginPath();

      for (let i = 0; i < 6; i++) {
        const a = angle + (i * Math.PI) / 3;
        const px = x + size * Math.cos(a);
        const py = y + size * Math.sin(a);

        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }

      ctx.closePath();

      ctx.fillStyle = "#34d399";
      ctx.shadowColor = "#34d399";
      ctx.shadowBlur = 8;

      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;
        n.angle += 0.002;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        drawHex(n.x, n.y, HEX_SIZE, n.angle);
      });

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);

            ctx.strokeStyle = `rgba(52,211,153, ${1 - dist / 130})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(draw);
    };

    draw();

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 bg-gradient-to-bl from-emerald-950 via-black to-black"
    />
  );
};

export default function App() {
  const [stats] = useState(
    STAT_CONFIG.map((s) => ({ ...s, value: s.initial }))
  );

  const [startCount, setStartCount] = useState(false);
  const sectionRef = useRef(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          setStartCount(true);
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);

    const fallback = setTimeout(() => {
      if (!startedRef.current) {
        startedRef.current = true;
        setStartCount(true);
      }
    }, 800);

    return () => {
      observer.disconnect();
      clearTimeout(fallback);
    };
  }, []);

  return (
    <div className="min-h-screen text-white p-10 text-center relative">
      <BlockchainBackground />

      <h1 className="text-3xl font-bold mb-8 text-emerald-500">
       <span className="text-white">Our</span> Statistics
      </h1>

      <div
        ref={sectionRef}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10"
      >
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="bg-emerald-950/80 backdrop-blur p-8 rounded-xl hover:-translate-y-1 transition-transform border-2 border-emerald-800/95 cursor-pointer"
          >
            <img src={stat.image} alt="" className="w-14 mx-auto mb-4" />

            <AnimatedNumber value={stat.value} start={startCount} />

            <p className="opacity-70">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}