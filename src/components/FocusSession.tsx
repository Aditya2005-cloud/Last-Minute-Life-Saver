import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Play,
  Pause,
  RotateCcw,
  X,
  Check,
  Volume2,
  VolumeX,
  ChevronRight,
  Sparkles,
  Zap,
  Timer,
} from "lucide-react";
import { Task } from "../types";
import confetti from "canvas-confetti";

interface FocusSessionProps {
  task: Task;
  onClose: () => void;
  onComplete: (taskId: string, actualMinutes?: number) => void;
}

export const FocusSession: React.FC<FocusSessionProps> = ({
  task,
  onClose,
  onComplete,
}) => {
  const initialSeconds = (task.estimatedMinutes || 25) * 60;
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(true);
  const [ambientActive, setAmbientActive] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const ambientNodeRef = useRef<
    BiquadFilterNode | OscillatorNode | AudioNode | null
  >(null);

  // Lock body scroll during active Focus Session to avoid background scroll conflicts
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // Countdown clock timer logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    setIsActive(false);
    // Play a gentle alert tone
    playCompletionTone();
    // Confetti burst
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
    });
  };

  const playCompletionTone = () => {
    try {
      const ctx = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5 note
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5 note

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.8);
    } catch (e) {
      console.error("Audio error:", e);
    }
  };

  // Toggle/Configure soothing ambient white/pink noise for deep focus
  useEffect(() => {
    if (ambientActive) {
      try {
        const AudioContextClass =
          window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        // Generate pink-ish noise buffer for comforting low-distraction vibe
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0,
          b1 = 0,
          b2 = 0,
          b3 = 0,
          b4 = 0,
          b5 = 0,
          b6 = 0;

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
          output[i] *= 0.11; // low gain volume
          b6 = white * 0.115926;
        }

        const whiteNoiseSource = ctx.createBufferSource();
        whiteNoiseSource.buffer = noiseBuffer;
        whiteNoiseSource.loop = true;

        // Lowpass filter for smooth brown/pink deep-focus sound
        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(450, ctx.currentTime);

        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0.12, ctx.currentTime);

        whiteNoiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);

        whiteNoiseSource.start();
        ambientNodeRef.current = whiteNoiseSource;
      } catch (e) {
        console.error("Failed to start ambient audio:", e);
      }
    } else {
      if (ambientNodeRef.current) {
        try {
          (ambientNodeRef.current as any).stop();
        } catch (err) {}
        ambientNodeRef.current = null;
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (err) {}
        audioCtxRef.current = null;
      }
    }

    return () => {
      if (ambientNodeRef.current) {
        try {
          (ambientNodeRef.current as any).stop();
        } catch (err) {}
      }
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (err) {}
      }
    };
  }, [ambientActive]);

  const togglePlay = () => setIsActive(!isActive);
  const resetTimer = () => setTimeLeft(initialSeconds);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = ((initialSeconds - timeLeft) / initialSeconds) * 100;

  const handleStepToggle = (stepTitle: string) => {
    setCompletedSteps((prev) =>
      prev.includes(stepTitle)
        ? prev.filter((t) => t !== stepTitle)
        : [...prev, stepTitle],
    );
  };

  return (
    <div
      className="fixed inset-0 bg-zinc-950 text-white z-50 flex flex-col justify-between overflow-y-auto"
      id="focus-session-overlay"
    >
      {/* Background glow animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.02)_0%,transparent_70%)]">
        <motion.div
          animate={{
            scale: isActive ? [1, 1.05, 1] : 1,
            opacity: isActive ? [0.4, 0.6, 0.4] : 0.4,
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_top_left,rgba(245,158,11,0.04)_0%,transparent_50%)]"
        />
      </div>

      {/* Header bar */}
      <header className="border-b border-zinc-900/40 px-6 py-4 flex items-center justify-between bg-zinc-950/40 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-zinc-500">
            Active Focus Session
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Ambient noise trigger */}
          <button
            onClick={() => setAmbientActive(!ambientActive)}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition duration-200 cursor-pointer ${
              ambientActive
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                : "bg-zinc-900/60 border-zinc-850 text-zinc-400 hover:text-white"
            }`}
            title="Toggle soothing pink focus noise to suppress distractions"
            id="focus-ambient-noise-toggle"
          >
            {ambientActive ? (
              <Volume2 className="h-3.5 w-3.5 animate-bounce" />
            ) : (
              <VolumeX className="h-3.5 w-3.5" />
            )}
            <span>Pink Noise</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg border border-zinc-850 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-400 hover:text-white transition duration-150 cursor-pointer"
            id="focus-session-close-btn"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Main minimal workspace */}
      <main className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full px-6 py-8 relative z-10 gap-10">
        <div className="text-center space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
            <Zap className="h-3 w-3" />
            <span>High Priority Sprint</span>
          </div>
          <h2
            className="text-3xl sm:text-4xl font-black tracking-tight text-white font-sans"
            id="focus-task-title"
          >
            {task.title}
          </h2>
          {task.description && (
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed max-w-xl mx-auto font-sans">
              {task.description}
            </p>
          )}
        </div>

        {/* Dynamic visual progress arc / timer clock */}
        <div
          className="relative flex flex-col items-center justify-center"
          id="focus-session-timer-hud"
        >
          {/* Subtle surrounding ring */}
          <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-zinc-900/60 flex items-center justify-center relative bg-zinc-950/20 backdrop-blur-sm">
            {/* Countdown string */}
            <div className="text-center space-y-1">
              <span className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest block font-bold">
                Time Remaining
              </span>
              <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white block">
                {formatTime(timeLeft)}
              </span>
              <span className="text-[10px] text-zinc-500 font-sans block">
                Estimated: {task.estimatedMinutes}m
              </span>
            </div>

            {/* Circular stroke progress */}
            <svg className="absolute inset-0 w-full h-full -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="46%"
                className="stroke-zinc-900/40 fill-none"
                strokeWidth="4"
              />
              <motion.circle
                cx="50%"
                cy="50%"
                r="46%"
                className="stroke-amber-500 fill-none"
                strokeWidth="4"
                strokeDasharray="290%"
                strokeDashoffset={`${100 - progressPercent}%`}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </svg>
          </div>

          {/* Action buttons under countdown clock */}
          <div className="flex items-center gap-4 mt-8">
            <button
              onClick={togglePlay}
              className={`p-4 rounded-full transition-all duration-300 transform active:scale-95 cursor-pointer shadow-lg ${
                isActive
                  ? "bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-white"
                  : "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
              }`}
              title={isActive ? "Pause Session" : "Resume Session"}
              id="focus-play-pause-btn"
            >
              {isActive ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6 fill-black" />
              )}
            </button>
            <button
              onClick={resetTimer}
              className="p-3 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 text-zinc-400 hover:text-white transition active:scale-95 cursor-pointer"
              title="Reset Timer"
              id="focus-reset-btn"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Task Steps / Checklist HUD (if available) to aid step-by-step progress */}
        {task.breakdown?.tacticalSteps &&
          task.breakdown.tacticalSteps.length > 0 && (
            <div
              className="w-full max-w-xl bg-zinc-900/40 border border-zinc-900/60 rounded-2xl p-5 space-y-4 backdrop-blur-sm"
              id="focus-checklist-hud"
            >
              <div className="flex items-center justify-between border-b border-zinc-900/60 pb-3">
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Timer className="h-3.5 w-3.5 text-amber-500" />
                  <span>Action Plan</span>
                </h3>
                <span className="text-[10px] font-mono font-bold text-amber-500">
                  {completedSteps.length} /{" "}
                  {task.breakdown.tacticalSteps.length} Done
                </span>
              </div>

              <div className="space-y-2.5">
                {task.breakdown.tacticalSteps.map((step, idx) => {
                  const isStepCompleted = completedSteps.includes(step.title);
                  return (
                    <div
                      key={idx}
                      onClick={() => handleStepToggle(step.title)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                        isStepCompleted
                          ? "bg-zinc-950/40 border-emerald-500/20 text-zinc-500 line-through"
                          : "bg-zinc-950/20 border-zinc-850 hover:bg-zinc-900/40 text-zinc-300"
                      }`}
                    >
                      <button
                        className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                          isStepCompleted
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                            : "border-zinc-700 hover:border-amber-500/40"
                        }`}
                      >
                        {isStepCompleted && <Check className="h-3 w-3" />}
                      </button>
                      <div className="text-xs flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{step.title}</span>
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                            {step.durationMinutes}m
                          </span>
                        </div>
                        {step.checklist && step.checklist.length > 0 && (
                          <div className="mt-1 text-[10px] text-zinc-500 space-y-1 pl-1 line-through-none">
                            {step.checklist.map((c, cIdx) => (
                              <div
                                key={cIdx}
                                className="flex items-center gap-1"
                              >
                                <ChevronRight className="h-2.5 w-2.5 text-zinc-600 shrink-0" />
                                <span>{c}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </main>

      {/* Footer session action control */}
      <footer className="border-t border-zinc-900/40 px-6 py-5 bg-zinc-950/40 backdrop-blur-md relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-xs text-zinc-500 font-mono text-center sm:text-left">
          Currently in deep sprint. Avoid phone, social notifications, or tab
          hops.
        </div>
        <button
          onClick={() => {
            const secondsSpent = initialSeconds - timeLeft;
            const minsSpent = Math.max(1, Math.ceil(secondsSpent / 60));
            onComplete(task.id, minsSpent);
            onClose();
          }}
          className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black uppercase text-xs tracking-wider rounded-xl transition duration-150 shadow-lg shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-2"
          id="focus-session-complete-btn"
        >
          <Check className="h-4 w-4 stroke-[3]" />
          <span>Mark Task Completed</span>
        </button>
      </footer>
    </div>
  );
};
