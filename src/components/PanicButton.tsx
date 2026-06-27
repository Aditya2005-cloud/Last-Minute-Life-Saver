import React, { useState, useEffect, useRef } from "react";
import { Task, PepTalk } from "../types";
import {
  AlertOctagon,
  Play,
  Volume2,
  VolumeX,
  Timer,
  Activity,
  CheckCircle,
  EyeOff,
  Flame,
  UserCheck,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface PanicButtonProps {
  tasks: Task[];
  onCompleteTask: (id: string) => void;
}

export default function PanicButton({
  tasks,
  onCompleteTask,
}: PanicButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("general");
  const [panicLevel, setPanicLevel] = useState(75);
  const [isLoadingProtocol, setIsLoadingProtocol] = useState(false);

  // Lock body scroll when Panic Overlay is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Protocol State
  const [protocolActive, setProtocolActive] = useState(false);
  const [pepTalkData, setPepTalkData] = useState<PepTalk | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [timerRunning, setTimerRunning] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<
    "Inhale" | "Hold" | "Exhale"
  >("Inhale");

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const activeTasks = tasks.filter((t) => !t.completed);

  // Handle Breathing Pacer loops (Box Breathing: 4s inhale, 4s hold, 4s exhale)
  useEffect(() => {
    if (!protocolActive) return;

    const interval = setInterval(() => {
      setBreathingPhase((prev) => {
        if (prev === "Inhale") return "Hold";
        if (prev === "Hold") return "Exhale";
        return "Inhale";
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [protocolActive]);

  // Real-time Countdown Timer
  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerRunning(false);
            if (timerIntervalRef.current)
              clearInterval(timerIntervalRef.current);
            // Play alert sound if available
            try {
              const audioCtx = new (
                window.AudioContext || (window as any).webkitAudioContext
              )();
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              osc.connect(gain);
              gain.connect(audioCtx.destination);
              osc.type = "sine";
              osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
              gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
              osc.start();
              osc.stop(audioCtx.currentTime + 0.3);
            } catch (e) {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning, timeLeft]);

  // Speech helper
  const speakText = (text: string) => {
    if (isMuted || !window.speechSynthesis) return;

    // Stop any running speech first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Find a good premium-sounding natural English voice if possible
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.name.includes("Google US English") ||
        v.name.includes("Google UK English Male") ||
        v.lang.startsWith("en-US"),
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 0.95; // slightly slower for reassuring pace
    utterance.pitch = 1.0;

    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Stop speech when closing protocol
  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Toggle mute
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (newMuted) {
      stopSpeech();
    } else if (pepTalkData) {
      speakText(pepTalkData.cheerSpeech);
    }
  };

  const handleLaunchProtocol = async () => {
    setIsLoadingProtocol(true);
    const selectedTask = activeTasks.find((t) => t.id === selectedTaskId);

    try {
      const response = await fetch("/api/peptalk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: selectedTask || null,
          panicIntensity: panicLevel,
        }),
      });

      const data = await response.json();
      setPepTalkData(data);
      setTimeLeft(data.tacticalSprint.durationMinutes * 60);
      setProtocolActive(true);
      setTimerRunning(true);

      // Trigger Voice Pep Talk!
      setTimeout(() => {
        speakText(data.cheerSpeech);
      }, 300);
    } catch (e) {
      console.error("Failed to trigger protocol:", e);
      // Fallback
      const mockSpeech =
        "Mute the anxiety. You are bigger than this. Focus for the next 15 minutes.";
      setPepTalkData({
        cheerSpeech: mockSpeech,
        tacticalSprint: {
          title: "15-Minute Crisis Intercept",
          durationMinutes: 15,
          focusDirectives: [
            "Silence all notifications.",
            "Open the document.",
            "Write the worst outline first.",
          ],
        },
      });
      setTimeLeft(900);
      setProtocolActive(true);
      setTimerRunning(true);
      speakText(mockSpeech);
    } finally {
      setIsLoadingProtocol(false);
    }
  };

  const handleClose = () => {
    stopSpeech();
    setIsOpen(false);
    setProtocolActive(false);
    setTimerRunning(false);
    setPepTalkData(null);
  };

  const handleCompleteSprint = () => {
    if (selectedTaskId !== "general") {
      onCompleteTask(selectedTaskId);
    }
    handleClose();
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div id="panic-button-wrapper">
      {/* CORNER LAUNCH BADGE */}
      <div className="flex justify-center my-8" id="pulse-trigger-container">
        <motion.button
          onClick={() => setIsOpen(true)}
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          className="relative inline-flex items-center gap-4 px-10 py-6 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 text-white font-bold text-lg rounded-2xl shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border border-red-400/40 group stitch-border"
          id="panic-pulse-btn"
        >
          {/* Pulsing overlay rings */}
          <span className="absolute -inset-1 bg-gradient-to-r from-red-500 to-amber-500 rounded-2xl blur-lg opacity-30 group-hover:opacity-65 transition duration-500" />

          {/* Scanning light flare */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"
            style={{ transform: "skewX(-20deg)" }}
          />

          <div className="relative z-10 flex items-center gap-3">
            <AlertOctagon
              className="h-7 w-7 text-white animate-spin shrink-0"
              style={{ animationDuration: "6s" }}
            />
            <div className="text-left">
              <span className="block text-xs font-semibold tracking-widest text-orange-200 uppercase font-mono">
                CRUNCH PROTOCOL
              </span>
              <span className="font-display font-extrabold text-base tracking-tight text-white">
                IN LAST-MINUTE PANIC? ACTIVE NOW
              </span>
            </div>
          </div>
        </motion.button>
      </div>

      {/* PANIC PROTOCOL MODAL OVERLAY */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/98 backdrop-blur-2xl flex items-center justify-center p-4 overflow-y-auto"
            id="panic-overlay-modal"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30, rotateX: 10 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 0.9, y: 30, rotateX: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 180 }}
              className="w-full max-w-3xl bg-zinc-950 border border-red-500/40 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden my-auto stitch-border-red overdrive-pulse scanline-effect"
              id="panic-modal-content"
            >
              {/* Animated HUD matrix background dots */}
              <div className="absolute inset-0 grid-dots opacity-30 pointer-events-none" />

              {/* Dynamic Crisis background glows */}
              <div className="absolute -top-48 -right-48 w-96 h-96 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-48 -left-48 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

              {!protocolActive ? (
                /* PROTOCOL CONFIGURATION STAGE */
                <div
                  className="space-y-6 relative z-10"
                  id="protocol-setup-stage"
                >
                  <div className="text-center space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold tracking-wider uppercase font-mono animate-pulse">
                      <Timer className="h-4 w-4" />
                      Tactical Intercept HUD
                    </span>
                    <h2 className="text-4xl font-extrabold tracking-tight text-white mt-1 font-display">
                      Configure Decontamination Block
                    </h2>
                    <p className="text-zinc-400 text-sm max-w-md mx-auto">
                      Let Gemini analyze your current task timeline, calm your
                      cortisol, and deploy focus-directing audio.
                    </p>
                  </div>

                  <div className="space-y-4 max-w-lg mx-auto bg-zinc-900/60 p-6 rounded-2xl border border-zinc-850/80 shadow-inner">
                    {/* TASK SELECT */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
                        Select Target Core Initiative
                      </label>
                      <select
                        value={selectedTaskId}
                        onChange={(e) => setSelectedTaskId(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500 transition-all font-semibold"
                        id="panic-task-select"
                      >
                        <option
                          value="general"
                          className="bg-zinc-900 text-white"
                        >
                          🔥 General Chaos Shield (Absolute Priority Block)
                        </option>
                        {activeTasks.map((t) => (
                          <option
                            key={t.id}
                            value={t.id}
                            className="bg-zinc-900 text-white"
                          >
                            📅 {t.title} ({t.estimatedMinutes} mins)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* PANIC LEVEL SLIDER */}
                    <div className="space-y-2.5 pt-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-400 uppercase tracking-widest font-mono">
                          Panic Threshold Level
                        </span>
                        <span className="font-mono font-extrabold text-red-400 text-sm bg-red-500/10 px-2.5 py-1 rounded border border-red-500/25 animate-pulse">
                          {panicLevel}% Overdrive
                        </span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={panicLevel}
                        onChange={(e) => setPanicLevel(Number(e.target.value))}
                        className="w-full h-1.5 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-red-500"
                        id="panic-meter-slider"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-wider font-mono">
                        <span>Looming Stress</span>
                        <span>Full Fight-or-Flight</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-4 pt-4">
                    <button
                      onClick={handleClose}
                      className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer"
                      id="cancel-panic-btn"
                    >
                      Stand Down
                    </button>
                    <button
                      onClick={handleLaunchProtocol}
                      disabled={isLoadingProtocol}
                      className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold rounded-xl text-sm shadow-xl shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
                      id="launch-survival-btn"
                    >
                      {isLoadingProtocol ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Booting Cognitive Safehouses...
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-current text-white animate-pulse" />
                          INJECT CRISIS MITIGATION
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* ACTIVE CRISIS BLOCK (SURVIVAL PROTOCOL) */
                <div
                  className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start relative z-10"
                  id="active-protocol-stage"
                >
                  {/* LEFT: TIMER & SPEECH PEP (5 cols) */}
                  <div className="md:col-span-5 flex flex-col items-center text-center space-y-6">
                    {/* Breathing Ring visualizer */}
                    <div
                      className="relative flex items-center justify-center w-44 h-44"
                      id="breathing-ring-pacer"
                    >
                      <motion.div
                        animate={{
                          scale:
                            breathingPhase === "Inhale"
                              ? [1, 1.3, 1.3]
                              : breathingPhase === "Hold"
                                ? 1.3
                                : [1.3, 1, 1],
                          opacity:
                            breathingPhase === "Inhale"
                              ? [0.15, 0.5, 0.5]
                              : breathingPhase === "Hold"
                                ? 0.5
                                : [0.5, 0.15, 0.15],
                        }}
                        transition={{
                          duration: 4,
                          ease: "easeInOut",
                          repeat: Infinity,
                        }}
                        className="absolute inset-0 bg-red-500/20 border-4 border-red-500/80 rounded-full shadow-[0_0_30px_rgba(239,68,68,0.2)]"
                      />
                      <div className="absolute text-center z-10">
                        <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-semibold block">
                          Box Breathing
                        </span>
                        <h4 className="text-2xl font-extrabold text-white mt-1 tracking-tight font-display">
                          {breathingPhase}
                        </h4>
                        <span className="text-[9px] text-amber-500/80 font-mono mt-0.5 block">
                          In 4s | Hold 4s | Out 4s
                        </span>
                      </div>
                    </div>

                    {/* COUNTDOWN */}
                    <div
                      className="bg-zinc-900/80 border border-zinc-800 rounded-2xl px-6 py-4.5 w-full relative overflow-hidden"
                      id="countdown-card"
                    >
                      <div
                        className="absolute top-0 left-0 bottom-0 bg-red-600/10 transition-all duration-1000"
                        style={{
                          width: `${(timeLeft / (pepTalkData!.tacticalSprint.durationMinutes * 60)) * 100}%`,
                        }}
                      />
                      <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-400 font-bold block mb-1">
                        Focus Block Time Remaining
                      </span>
                      <h3 className="text-4xl font-extrabold text-white font-mono tracking-tight mt-1">
                        {formatTime(timeLeft)}
                      </h3>
                      <div className="flex items-center justify-center gap-2 mt-4 relative z-10">
                        <button
                          onClick={() => setTimerRunning(!timerRunning)}
                          className="px-4 py-1.5 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs transition-all font-bold border border-zinc-800"
                        >
                          {timerRunning
                            ? "PAUSE INTERCEPT"
                            : "RESUME INTERCEPT"}
                        </button>
                        <button
                          onClick={() =>
                            setTimeLeft(
                              pepTalkData!.tacticalSprint.durationMinutes * 60,
                            )
                          }
                          className="p-2 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs transition-all border border-zinc-800"
                        >
                          <RotateCcw className="h-3 w-3" />
                        </button>
                      </div>
                    </div>

                    {/* SPEECH TOGGLE */}
                    <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800/80 rounded-xl px-4 py-3 w-full">
                      <div className="text-left">
                        <span className="text-xs text-zinc-300 font-semibold block">
                          AI Survival Coach Vocalizer
                        </span>
                        <span className="text-[9px] text-zinc-500 font-mono">
                          Google Text-to-Speech active
                        </span>
                      </div>
                      <button
                        onClick={toggleMute}
                        className={`p-2.5 rounded-lg transition-colors ${
                          isMuted
                            ? "bg-zinc-850 text-zinc-500 hover:text-white"
                            : "bg-red-500/15 text-red-400 hover:bg-red-500/30"
                        }`}
                        id="speech-toggle"
                      >
                        {isMuted ? (
                          <VolumeX className="h-4.5 w-4.5" />
                        ) : (
                          <Volume2 className="h-4.5 w-4.5 animate-bounce" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* RIGHT: TACTICAL DIRECTIVES (7 cols) */}
                  <div
                    className="md:col-span-7 space-y-6"
                    id="tactical-directives"
                  >
                    <div className="border-b border-zinc-850 pb-3">
                      <span className="inline-flex items-center gap-1.5 text-xs uppercase font-mono text-amber-400 font-bold tracking-widest">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        SURVIVAL TARGET LOCKED
                      </span>
                      <h3 className="text-2xl font-black text-white mt-1 font-display">
                        {pepTalkData?.tacticalSprint.title ||
                          "The Zero-Friction Survival block"}
                      </h3>
                    </div>

                    {/* SPEECH SUMMARY WITH ANIMATED SPEECH EQUALIZER BAR GRAPH */}
                    {pepTalkData?.cheerSpeech && (
                      <div className="bg-zinc-900/60 border border-zinc-800/80 p-5 rounded-2xl text-zinc-300 text-sm leading-relaxed italic relative">
                        <span className="absolute -top-2.5 left-4 bg-zinc-950 px-3 py-0.5 border border-zinc-800 rounded text-[9px] text-zinc-400 font-mono font-bold uppercase tracking-wider">
                          AI Coach Reassurance
                        </span>
                        <p className="relative z-10 leading-relaxed font-medium">
                          "{pepTalkData.cheerSpeech}"
                        </p>

                        {/* Interactive sound equalizer bars */}
                        {!isMuted && (
                          <div
                            className="flex gap-1 items-end justify-start h-5 mt-4 opacity-80"
                            id="speech-equalizer"
                          >
                            {[...Array(12)].map((_, i) => (
                              <div
                                key={i}
                                className="w-1 bg-gradient-to-t from-red-500 to-amber-500 rounded-full"
                                style={{
                                  height: `${15 + Math.random() * 85}%`,
                                  animation: `equalizerBar ${0.5 + Math.random() * 0.8}s infinite alternate ease-in-out`,
                                }}
                              />
                            ))}
                            <style>{`
                              @keyframes equalizerBar {
                                0% { height: 15%; }
                                100% { height: 95%; }
                              }
                            `}</style>
                          </div>
                        )}
                      </div>
                    )}

                    {/* FOCUS CHEATSHEET DIRECTIVES */}
                    <div className="space-y-3">
                      <span className="text-[10px] text-zinc-400 font-bold font-mono tracking-widest uppercase block">
                        Immediate Execution Protocols:
                      </span>
                      <div className="space-y-3">
                        {pepTalkData?.tacticalSprint.focusDirectives.map(
                          (dir, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.12 }}
                              className="flex items-start gap-3 bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl hover:border-amber-500/30 transition-colors"
                            >
                              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-500/10 text-red-400 text-xs font-mono font-bold shrink-0 mt-0.5 border border-red-500/20">
                                {idx + 1}
                              </span>
                              <p className="text-xs text-zinc-300 leading-relaxed font-bold">
                                {dir}
                              </p>
                            </motion.div>
                          ),
                        )}
                      </div>
                    </div>

                    {/* CONTROL BAR */}
                    <div className="flex items-center gap-3 pt-4 border-t border-zinc-900">
                      <button
                        onClick={handleClose}
                        className="flex-1 px-5 py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer border border-zinc-800"
                        id="protocol-abort"
                      >
                        Abort Protocol
                      </button>
                      <button
                        onClick={handleCompleteSprint}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                        id="protocol-complete"
                      >
                        <CheckCircle className="h-4.5 w-4.5 text-black" />
                        PROTOCOL COMPLETE
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
