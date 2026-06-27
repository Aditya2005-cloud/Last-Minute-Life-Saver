import React, { useState, useEffect, useRef } from "react";
import { Lock, Unlock, ShieldAlert, Delete, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AppLockScreenProps {
  correctPin: string;
  onUnlock: () => void;
  userEmail: string | null;
}

export default function AppLockScreen({ correctPin, onUnlock, userEmail }: AppLockScreenProps) {
  const [pin, setPin] = useState<string>("");
  const [isError, setIsError] = useState<boolean>(false);
  const [unlocked, setUnlocked] = useState<boolean>(false);
  
  // Sound synthesizer for feedback
  const playTone = (freq: number, type: OscillatorType = "sine", duration: number = 0.15) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
  };

  const handleKeyPress = (digit: string) => {
    if (unlocked || isError) return;
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      playTone(500 + nextPin.length * 80, "sine", 0.08);
    }
  };

  const handleBackspace = () => {
    if (unlocked || isError) return;
    if (pin.length > 0) {
      setPin(prev => prev.slice(0, -1));
      playTone(380, "sine", 0.1);
    }
  };

  const handleClear = () => {
    setPin("");
    playTone(300, "sine", 0.15);
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleKeyPress(e.key);
      } else if (e.key === "Backspace") {
        handleBackspace();
      } else if (e.key === "Escape" || e.key === "c" || e.key === "C") {
        handleClear();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pin, unlocked, isError]);

  // Check pin when full length reached
  useEffect(() => {
    if (pin.length === 4) {
      if (pin === correctPin) {
        setUnlocked(true);
        playTone(520, "sine", 0.15);
        setTimeout(() => playTone(880, "sine", 0.25), 100);
        setTimeout(() => {
          onUnlock();
        }, 600);
      } else {
        setIsError(true);
        playTone(180, "sawtooth", 0.3);
        setTimeout(() => {
          setPin("");
          setIsError(false);
        }, 1000);
      }
    }
  }, [pin, correctPin, onUnlock]);

  // Emergency local state reset to prevent complete lockout
  const [showEmergencyReset, setShowEmergencyReset] = useState(false);
  const handleEmergencyReset = () => {
    const confirmReset = window.confirm(
      "Emergency Decryption Request:\nAre you sure you want to perform an emergency system wipe? This will clear all local session configurations, tasks, and the PIN lock, restoring defaults."
    );
    if (confirmReset) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const numbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

  return (
    <div 
      className="fixed inset-0 bg-zinc-950 z-50 flex flex-col items-center justify-center p-4 selection:bg-none"
      id="app-lock-screen-overlay"
    >
      {/* Dynamic Security Aura */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-red-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-8 z-10">
        {/* LOCK ICON DISPLAY */}
        <div className="flex flex-col items-center space-y-3">
          <motion.div 
            animate={
              isError 
                ? { x: [-10, 10, -10, 10, -5, 5, 0] } 
                : unlocked 
                ? { scale: [1, 1.2, 0.9, 1], rotate: [0, 360] } 
                : { y: [0, -5, 0] }
            }
            transition={isError ? { duration: 0.4 } : unlocked ? { duration: 0.5 } : { duration: 3, repeat: Infinity }}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
              isError 
                ? "bg-red-500/10 border-red-500 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.2)]" 
                : unlocked 
                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]" 
                : "bg-amber-500/5 border-amber-500/30 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.05)]"
            }`}
          >
            {unlocked ? (
              <Unlock className="h-7 w-7" />
            ) : (
              <Lock className="h-7 w-7" />
            )}
          </motion.div>

          <h2 className="text-xl font-bold tracking-tight text-white mt-2">
            Application Intercept Lock
          </h2>
          <p className="text-zinc-500 text-xs">
            DeadlineGenie physical security protection. Enter your 4-digit PIN to decrypt sessions.
          </p>
        </div>

        {/* DOTS INDICATOR */}
        <div className="flex justify-center gap-5 my-6">
          {[0, 1, 2, 3].map((index) => {
            const hasValue = pin.length > index;
            return (
              <motion.div
                key={index}
                animate={
                  isError 
                    ? { scale: [1, 1.2, 1], backgroundColor: "#ef4444" } 
                    : unlocked 
                    ? { scale: [1, 1.3, 1], backgroundColor: "#10b981" }
                    : hasValue 
                    ? { scale: 1.15 } 
                    : { scale: 1 }
                }
                className={`w-4.5 h-4.5 rounded-full border-2 transition-all duration-200 ${
                  isError 
                    ? "border-red-500" 
                    : unlocked 
                    ? "border-emerald-500" 
                    : hasValue 
                    ? "bg-amber-500 border-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]" 
                    : "border-zinc-800 bg-transparent"
                }`}
              />
            );
          })}
        </div>

        {/* NUMPAD GRID */}
        <div className="grid grid-cols-3 gap-4 max-w-[280px] mx-auto" id="numpad-container">
          {numbers.map((num) => (
            <motion.button
              key={num}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleKeyPress(num)}
              className="w-16 h-16 rounded-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-700 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-all active:bg-amber-500/10 active:border-amber-500"
            >
              {num}
            </motion.button>
          ))}

          {/* CLEAR ACTION */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleClear}
            className="w-16 h-16 rounded-full bg-zinc-950 hover:bg-zinc-900 border border-transparent hover:border-zinc-900 text-zinc-500 hover:text-zinc-300 font-bold text-xs uppercase flex items-center justify-center cursor-pointer transition-all"
          >
            Clear
          </motion.button>

          {/* ZERO ACTION */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => handleKeyPress("0")}
            className="w-16 h-16 rounded-full bg-zinc-900 hover:bg-zinc-850 border border-zinc-850 hover:border-zinc-700 text-white font-bold text-lg flex items-center justify-center cursor-pointer transition-all active:bg-amber-500/10 active:border-amber-500"
          >
            0
          </motion.button>

          {/* BACKSPACE ACTION */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleBackspace}
            className="w-16 h-16 rounded-full bg-zinc-950 hover:bg-zinc-900 border border-transparent hover:border-zinc-900 text-zinc-500 hover:text-zinc-300 flex items-center justify-center cursor-pointer transition-all"
            title="Backspace"
          >
            <Delete className="h-5 w-5" />
          </motion.button>
        </div>

        {/* RECOVER ACCOUNT / WIPE DATA FOOTER */}
        <div className="pt-8 border-t border-zinc-900 space-y-4">
          {userEmail && (
            <p className="text-[10px] text-zinc-600 font-mono">
              Authorized User Profile: {userEmail}
            </p>
          )}

          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => setShowEmergencyReset(!showEmergencyReset)}
              className="text-[10px] text-zinc-500 hover:text-red-400 transition cursor-pointer underline flex items-center gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              Having issues? Emergency Options
            </button>
          </div>

          <AnimatePresence>
            {showEmergencyReset && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/5 border border-red-500/10 rounded-xl p-3 max-w-sm mx-auto text-left space-y-2"
              >
                <div className="flex gap-1.5 items-center text-red-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>Destructive Factory Reset</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  For safety, your database is secured. If you forgot your password or got locked out, click the button below to completely clear your browser's local sandbox storage and start anew.
                </p>
                <button
                  onClick={handleEmergencyReset}
                  className="w-full py-1.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded text-[10px] cursor-pointer tracking-wider uppercase transition-all"
                >
                  Factory Reset Local Database
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
