import React, { useEffect, useRef, useState } from "react";
import {
  ShieldAlert,
  LogIn,
  ArrowRight,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { motion } from "motion/react";

interface LoginScreenProps {
  onLogin: () => Promise<void>;
  onEnterOffline: () => void;
  theme: "dark" | "light";
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  spark: boolean;
  pulseSpeed: number;
  pulsePhase: number;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onLogin,
  onEnterOffline,
  theme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    const particleCount = 75;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      const isSpark = Math.random() > 0.92;
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height + canvas.height, // start below or throughout
        size: isSpark ? Math.random() * 2.5 + 2.5 : Math.random() * 1.5 + 0.8,
        speedY: isSpark
          ? -(Math.random() * 1.5 + 1.2)
          : -(Math.random() * 0.6 + 0.2),
        speedX: Math.random() * 0.4 - 0.2,
        opacity: Math.random() * 0.6 + 0.2,
        spark: isSpark,
        pulseSpeed: Math.random() * 0.05 + 0.01,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    // Keep particles spread on initial load
    particles.forEach((p) => {
      p.y = Math.random() * canvas.height;
    });

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to client center
      mouseRef.current.targetX = (e.clientX - window.innerWidth / 2) * 0.04;
      mouseRef.current.targetY = (e.clientY - window.innerHeight / 2) * 0.04;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Smooth lerp for parallax mouse shifting
      mouseRef.current.x +=
        (mouseRef.current.targetX - mouseRef.current.x) * 0.08;
      mouseRef.current.y +=
        (mouseRef.current.targetY - mouseRef.current.y) * 0.08;

      particles.forEach((p) => {
        // Apply drifting speed and slightly modulate with mouse parallax
        // Spark particles drift less with parallax to give depth (farther or closer)
        const depthFactor = p.spark ? 1.5 : 0.6;
        const renderX = p.x + mouseRef.current.x * depthFactor;
        const renderY = p.y + mouseRef.current.y * depthFactor;

        p.pulsePhase += p.pulseSpeed;
        const currentOpacity = p.opacity * (0.6 + 0.4 * Math.sin(p.pulsePhase));

        ctx.beginPath();
        ctx.arc(renderX, renderY, p.size, 0, Math.PI * 2);

        // Styling based on light or dark theme
        if (theme === "light") {
          if (p.spark) {
            ctx.fillStyle = `rgba(124, 58, 237, ${currentOpacity + 0.2})`; // Violet
            ctx.shadowBlur = 10;
            ctx.shadowColor = "rgba(124, 58, 237, 0.6)";
          } else {
            ctx.fillStyle = `rgba(14, 116, 144, ${currentOpacity})`; // Cyan
            ctx.shadowBlur = 4;
            ctx.shadowColor = "rgba(14, 116, 144, 0.3)";
          }
        } else {
          // Dark theme: glowing amber/orange and violet sparks
          if (p.spark) {
            ctx.fillStyle = `rgba(245, 158, 11, ${currentOpacity + 0.25})`; // Amber
            ctx.shadowBlur = 12;
            ctx.shadowColor = "rgba(245, 158, 11, 0.8)";
          } else {
            ctx.fillStyle = `rgba(168, 85, 247, ${currentOpacity})`; // Violet/purple
            ctx.shadowBlur = 6;
            ctx.shadowColor = "rgba(168, 85, 247, 0.4)";
          }
        }

        ctx.fill();
        ctx.shadowBlur = 0; // reset shadow for next draw

        // Move particle up
        p.y += p.speedY;
        p.x += p.speedX;

        // Reset if goes off top
        if (p.y < -10) {
          p.y = canvas.height + 10;
          p.x = Math.random() * canvas.width;
        }

        // Wrap horizontal edges
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  const handleOAuthConnect = async () => {
    setIsConnecting(true);
    try {
      await onLogin();
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen flex items-center justify-center p-4 overflow-hidden select-none transition-colors duration-500 ${
        theme === "light"
          ? "bg-gradient-to-br from-[#F8F7FC] to-[#EDE9FE] text-[#1E1B2E]"
          : "bg-black text-zinc-100"
      }`}
      id="login-container"
    >
      {/* Background Canvas for Spark Particles */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Background Glow Blobs */}
      <div
        className={`absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none mix-blend-screen opacity-10 transition-colors duration-[800ms] ${
          theme === "light" ? "bg-purple-300" : "bg-purple-600"
        }`}
      />
      <div
        className={`absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl pointer-events-none mix-blend-screen opacity-10 transition-colors duration-[800ms] ${
          theme === "light" ? "bg-cyan-300" : "bg-cyan-600"
        }`}
      />

      {/* Foreground Login Card */}
      <div className="relative z-10 w-full max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className={`w-full p-8 rounded-3xl border transition-all duration-300 ${
            theme === "light"
              ? "bg-white/80 border-[#e2e0f0] shadow-[0_20px_50px_rgba(109,40,217,0.1)] backdrop-blur-xl text-[#1E1B2E]"
              : "bg-zinc-950/40 border-zinc-850 shadow-[0_25px_60px_rgba(245,158,11,0.05)] backdrop-blur-xl text-zinc-100"
          }`}
          style={{
            boxShadow:
              theme === "light"
                ? "0 25px 60px -15px rgba(109, 40, 217, 0.12), inset 0 1px 1px rgba(255, 255, 255, 0.8)"
                : "0 25px 60px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.05)",
          }}
        >
          {/* Logo Container with continuous custom glow */}
          <div className="flex flex-col items-center text-center space-y-4">
            <motion.div
              animate={{
                boxShadow:
                  theme === "light"
                    ? [
                        "0 0 10px rgba(124, 58, 237, 0.2)",
                        "0 0 25px rgba(124, 58, 237, 0.5)",
                        "0 0 10px rgba(124, 58, 237, 0.2)",
                      ]
                    : [
                        "0 0 15px rgba(245, 158, 11, 0.3)",
                        "0 0 35px rgba(245, 158, 11, 0.7)",
                        "0 0 15px rgba(245, 158, 11, 0.3)",
                      ],
              }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                theme === "light"
                  ? "bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg text-white"
                  : "bg-gradient-to-br from-amber-500 to-orange-600 text-black"
              }`}
            >
              <ShieldAlert className="h-8 w-8 animate-pulse" />
            </motion.div>

            <div className="space-y-1.5">
              <h2
                className={`text-2xl font-extrabold tracking-tight font-display ${
                  theme === "light" ? "text-slate-900" : "text-white"
                }`}
              >
                DeadlineGenie AI
              </h2>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                Unlock tactical deadline prevention, automated agenda mapping,
                and smart calendar interception.
              </p>
            </div>
          </div>

          {/* Core Controls */}
          <div className="mt-8 space-y-3">
            {/* Primary OAuth Login */}
            <button
              onClick={handleOAuthConnect}
              disabled={isConnecting}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-lg active:scale-98 transition-all cursor-pointer disabled:opacity-60 ${
                theme === "light"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/10"
                  : "bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black shadow-orange-500/10"
              }`}
            >
              <LogIn className="h-4 w-4 shrink-0" />
              <span>
                {isConnecting
                  ? "Activating Interface..."
                  : "Connect Google Calendar"}
              </span>
            </button>

            {/* Offline Sandbox Option */}
            <button
              onClick={onEnterOffline}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                theme === "light"
                  ? "bg-[#EDE9FE]/50 text-purple-700 hover:bg-[#EDE9FE] border border-[#e2e0f0]"
                  : "bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-900/90 border border-zinc-850"
              }`}
            >
              <span>Access Local Sandbox Mode</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          {/* Secondary Footer Info */}
          <div className="mt-8 border-t border-dashed transition-colors duration-300 border-zinc-800/50 pt-5 flex items-start gap-2.5">
            <Sparkles
              className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${
                theme === "light" ? "text-purple-600" : "text-amber-500"
              }`}
            />
            <div className="text-left text-[10px] text-zinc-500 leading-normal">
              <span
                className={`font-semibold block mb-0.5 ${theme === "light" ? "text-purple-700" : "text-amber-400"}`}
              >
                Genie Intelligence Protocol:
              </span>
              Synchronize upcoming objectives with Google Workspace to enable
              autonomous scheduling, habit balancing, and hands-free vocal
              assistance.
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
