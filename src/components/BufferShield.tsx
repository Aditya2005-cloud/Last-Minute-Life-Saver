import React, { useState, useEffect } from "react";
import { Task } from "../types";
import { 
  Shield, 
  ShieldCheck, 
  Mail, 
  Clock, 
  Flame, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  Lock, 
  Sparkles,
  Info,
  Calendar,
  XCircle,
  HelpCircle,
  Zap,
  Coffee,
  Key
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BufferShieldProps {
  tasks: Task[];
  bufferOffsetHours: number;
  onSetBufferOffsetHours: (hours: number) => void;
  userEmail: string | null;
  isPinEnabled: boolean;
  onSetPinEnabled: (enabled: boolean) => void;
  pinCode: string;
  onSetPinCode: (pin: string) => void;
  onLockApp: () => void;
}

interface Contract {
  id: string;
  taskId: string;
  taskTitle: string;
  partnerEmail: string;
  stakes: string;
  message: string;
  lockedAt: string;
  dueDate: string;
  status: "locked" | "completed" | "defaulted";
}

export default function BufferShield({
  tasks,
  bufferOffsetHours,
  onSetBufferOffsetHours,
  userEmail,
  isPinEnabled,
  onSetPinEnabled,
  pinCode,
  onSetPinCode,
  onLockApp
}: BufferShieldProps) {
  // Preset buffer times
  const presets = [
    { label: "None (Real-Time)", value: 0, description: "Deadlines are displayed at their actual dates/times." },
    { label: "2 Hours Buffer", value: 2, description: "Gentle padding to avoid last-minute rush hour stresses." },
    { label: "6 Hours Buffer", value: 6, description: "Standard tactical buffer. Complete assignments half a day early." },
    { label: "12 Hours Buffer", value: 12, description: "Deep protection shield. Keeps your prefrontal cortex fully relaxed." },
    { label: "24 Hours Buffer", value: 24, description: "Bulletproof absolute safety-net. You finish an entire day ahead!" }
  ];

  const activeTasks = tasks.filter(t => !t.completed);

  // Contract formulation state
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [partnerEmail, setPartnerEmail] = useState<string>("");
  const [stakes, setStakes] = useState<string>("");
  const [customMessage, setCustomMessage] = useState<string>("");
  
  // Statuses
  const [isSending, setIsSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Security Lock configuration state
  const [pinInput, setPinInput] = useState("");
  const [pinConfirmInput, setPinConfirmInput] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);

  // Active contracts state
  const [contracts, setContracts] = useState<Contract[]>(() => {
    const saved = localStorage.getItem("deadline_genie_contracts");
    return saved ? JSON.parse(saved) : [];
  });

  // Save contracts to local storage
  useEffect(() => {
    localStorage.setItem("deadline_genie_contracts", JSON.stringify(contracts));
  }, [contracts]);

  // Handle preset selected sound
  const playShieldLockSound = (freq: number) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    } catch (e) {}
  };

  const handleSelectPreset = (value: number) => {
    onSetBufferOffsetHours(value);
    playShieldLockSound(value === 0 ? 300 : 520 + value * 20);
  };

  // Create & Transmit Accountability Contract
  const handleSealContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !partnerEmail || !stakes) {
      setErrorMsg("Please fill in all contract requirements (Task, Partner Email, and Stakes).");
      return;
    }

    const task = tasks.find(t => t.id === selectedTaskId);
    if (!task) return;

    setIsSending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Draft the email contents
    const contractDetails = {
      taskTitle: task.title,
      stakes,
      message: customMessage || "None provided.",
      dueDate: task.dueDate,
      partnerEmail,
      senderEmail: userEmail || "Anonymous Achiever",
      shieldBuffer: bufferOffsetHours > 0 ? `${bufferOffsetHours} Hours earlier` : "None"
    };

    const emailSubject = `⚠️ ACTION REQUIRED: AI Accountability Contract Locked for ${contractDetails.taskTitle}`;
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #1f2937; border-radius: 12px; background-color: #09090b; color: #f4f4f5;">
        <div style="text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 15px; margin-bottom: 20px;">
          <h2 style="color: #f59e0b; margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 1.5px;">DeadlineGenie AI</h2>
          <p style="color: #a1a1aa; font-size: 12px; margin: 5px 0 0 0;">INTELLIGENT DEADLINE INTERCEPT PROTOCOL</p>
        </div>
        
        <p style="font-size: 15px; line-height: 1.6;">Hello,</p>
        <p style="font-size: 15px; line-height: 1.6;">You have been designated as the <strong>Official Accountability Guardian</strong> for <strong>${contractDetails.senderEmail}</strong>.</p>
        
        <div style="background-color: #18181b; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #ffffff; font-size: 16px;">📜 Contract Lock Agreement</h3>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Core Task:</strong> ${contractDetails.taskTitle}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Target Deadline:</strong> ${contractDetails.dueDate}</p>
          <p style="margin: 6px 0; font-size: 14px;"><strong>Active Buffer Shield:</strong> ${contractDetails.shieldBuffer}</p>
          <p style="margin: 12px 0 6px 0; color: #f87171; font-weight: bold; font-size: 14px;">🚨 THE FORFEIT / STAKES:</p>
          <p style="margin: 0; font-style: italic; color: #fca5a5; font-size: 14px; background-color: #7f1d1d/20; padding: 8px; border-radius: 4px;">"${contractDetails.stakes}"</p>
        </div>

        <div style="margin: 20px 0; font-size: 14px; line-height: 1.5;">
          <p style="color: #d4d4d8; font-weight: bold; margin-bottom: 6px;">Message from Achiever:</p>
          <p style="font-style: italic; color: #a1a1aa; margin: 0; padding-left: 10px; border-left: 2px solid #52525b;">"${contractDetails.message}"</p>
        </div>

        <p style="font-size: 13px; color: #a1a1aa; border-top: 1px solid #27272a; padding-top: 15px; margin-top: 25px; line-height: 1.5;">
          <strong>How this works:</strong> The achiever must complete this initiative before the deadline. Once marked complete, we will notify you. If they fail, they are bound by honor to fulfill their pledge.
        </p>
        
        <div style="text-align: center; margin-top: 25px;">
          <span style="font-family: monospace; font-size: 11px; background-color: #27272a; padding: 5px 10px; border-radius: 4px; color: #22d3ee; border: 1px solid #06b6d4/30;">CONTRACT ID: ${Math.random().toString(36).substring(2, 9).toUpperCase()}</span>
        </div>
      </div>
    `;

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: partnerEmail,
          subject: emailSubject,
          html: emailHtml,
          text: `DeadlineGenie Accountability Contract: Task "${task.title}" is locked. Stakes if missed: "${stakes}".`
        })
      });

      if (!response.ok) {
        throw new Error("Failed to transmit email on the server.");
      }

      // Add to contract list
      const newContract: Contract = {
        id: `contract-${Date.now()}`,
        taskId: selectedTaskId,
        taskTitle: task.title,
        partnerEmail,
        stakes,
        message: customMessage,
        lockedAt: new Date().toISOString().split("T")[0],
        dueDate: task.dueDate,
        status: "locked"
      };

      setContracts(prev => [newContract, ...prev]);
      setSuccessMsg(`Accountability Contract for "${task.title}" has been successfully sealed and dispatched to ${partnerEmail}!`);
      
      // Metallic lock chime
      playShieldLockSound(440);
      setTimeout(() => playShieldLockSound(880), 120);

      // Reset fields
      setSelectedTaskId("");
      setPartnerEmail("");
      setStakes("");
      setCustomMessage("");

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to transmit contract email. Please ensure email secrets are configured.");
    } finally {
      setIsSending(false);
    }
  };

  const handleResolveContract = (id: string, status: "completed" | "defaulted") => {
    setContracts(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, status };
      }
      return c;
    }));
    playShieldLockSound(status === "completed" ? 660 : 220);
  };

  const handleDeleteContract = (id: string) => {
    setContracts(prev => prev.filter(c => c.id !== id));
    playShieldLockSound(180);
  };

  return (
    <div className="space-y-8" id="buffer-shield-container">
      {/* HEADER SECTION */}
      <div className="border-b border-zinc-900 pb-5">
        <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <Shield className="h-6 w-6 text-amber-500 animate-pulse" />
          Proactive Buffer & Accountability Hub
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          Take command of your cognitive timeline. Adjust display urgency buffers and bind yourself to high-stakes contracts.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: BUFFER SHIELD CONTROLLER (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 relative overflow-hidden stitch-border" id="buffer-shield-controller-card">
            <span className="absolute top-0 left-0 right-0 h-[2px] bg-amber-500/30" />
            
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-amber-400 shrink-0" />
              <h3 className="font-bold text-white text-base">AI Proactive Buffer Shield</h3>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Enable an artificial offset that shifts all displayed deadlines earlier. This forces your focus onto milestones before real urgency peaks, keeping your schedule perfectly stress-free.
            </p>

            {/* PRESETS LIST */}
            <div className="space-y-3" id="buffer-presets-selector">
              {presets.map((preset) => {
                const isSelected = bufferOffsetHours === preset.value;
                return (
                  <button
                    key={preset.value}
                    onClick={() => handleSelectPreset(preset.value)}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected 
                        ? "bg-amber-500/10 border-amber-500 text-white" 
                        : "bg-zinc-900/40 border-zinc-900 hover:border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 pr-4">
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        {isSelected && <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />}
                        <span className={isSelected ? "text-amber-400" : "text-white"}>{preset.label}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-normal truncate">{preset.description}</p>
                    </div>
                    {isSelected && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-[9px] font-mono font-bold text-amber-400 uppercase tracking-wider shrink-0">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* VISUAL TIMELINE GRAPHIC */}
            {bufferOffsetHours > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 bg-zinc-900/60 border border-zinc-900 rounded-xl p-4 space-y-3 font-mono text-[9px]"
              >
                <div className="flex justify-between text-zinc-500 font-bold uppercase tracking-wider">
                  <span>Urgency Timeline</span>
                  <span className="text-amber-400">-{bufferOffsetHours}h Protected</span>
                </div>
                
                <div className="relative flex items-center justify-between h-8 bg-zinc-950 rounded border border-zinc-850 px-3">
                  <div className="absolute top-0 bottom-0 left-0 bg-red-500/10" style={{ width: "40%" }} />
                  <div className="absolute top-0 bottom-0 left-[40%] right-[30%] bg-amber-500/15" />
                  
                  <span className="text-zinc-500 z-10 font-bold">Now</span>
                  <span className="text-amber-400 z-10 font-extrabold animate-pulse">⏰ Protected</span>
                  <span className="text-zinc-600 z-10 font-bold">Real Due</span>
                </div>

                <p className="text-[10px] text-zinc-400 italic font-sans leading-relaxed">
                  Your timeline has been virtualized. The dashboard is now operating at {bufferOffsetHours} hours higher urgency level.
                </p>
              </motion.div>
            )}
          </div>

          {/* PHYSICAL DEVICE PIN SECURITY CARD */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 relative overflow-hidden stitch-border" id="device-pin-security-card">
            <span className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/20" />
            
            <div className="flex items-center gap-2 mb-4">
              <Key className="h-5 w-5 text-red-400 shrink-0" />
              <h3 className="font-bold text-white text-base">Application Lock (PIN Security)</h3>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Add a physical security layer to protect your personal tasks, schedules, and Google Workspace calendar integrity. Require a 4-digit PIN to access the application.
            </p>

            {pinCode ? (
              <div className="space-y-4">
                <div className="bg-zinc-900/60 border border-zinc-850 p-4 rounded-xl flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold">Lock Status</span>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${isPinEnabled ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"}`} />
                      <span className="font-bold text-xs text-white">
                        {isPinEnabled ? "Active & Enforced" : "Deactivated"}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      onSetPinEnabled(!isPinEnabled);
                      playShieldLockSound(400);
                    }}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase cursor-pointer border transition-all ${
                      isPinEnabled 
                        ? "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white" 
                        : "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                    }`}
                  >
                    {isPinEnabled ? "Disable" : "Enable"}
                  </button>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={onLockApp}
                    type="button"
                    className="w-full py-2.5 bg-gradient-to-r from-red-600/20 to-amber-600/20 hover:from-red-600/35 hover:to-amber-600/35 text-red-400 hover:text-red-300 font-bold text-xs rounded-xl border border-red-500/20 flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    LOCK SCREEN NOW
                  </button>
                  
                  <button
                    onClick={() => {
                      const confirmDisable = window.confirm("Are you sure you want to completely erase your application lock PIN?");
                      if (confirmDisable) {
                        onSetPinCode("");
                        onSetPinEnabled(false);
                        setPinInput("");
                        setPinConfirmInput("");
                        playShieldLockSound(200);
                      }
                    }}
                    type="button"
                    className="w-full py-2 text-zinc-500 hover:text-red-400 font-bold text-[10px] uppercase cursor-pointer text-center transition-all"
                  >
                    Erase / Reset Security PIN
                  </button>
                </div>
              </div>
            ) : (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  setPinError(null);
                  setPinSuccess(null);
                  
                  if (!/^\d{4}$/.test(pinInput)) {
                    setPinError("PIN code must be exactly 4 numerical digits.");
                    return;
                  }
                  
                  if (pinInput !== pinConfirmInput) {
                    setPinError("The confirm PIN code does not match.");
                    return;
                  }
                  
                  onSetPinCode(pinInput);
                  onSetPinEnabled(true);
                  setPinSuccess("Application Lock PIN successfully configured and enabled!");
                  setPinInput("");
                  setPinConfirmInput("");
                  playShieldLockSound(600);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Set 4-Digit PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={pinInput}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        setPinInput(val);
                      }}
                      className="w-full bg-zinc-900 border border-zinc-850 text-white rounded-xl px-3 py-2 text-center text-sm font-black focus:outline-none focus:ring-1 focus:ring-red-500 font-mono tracking-widest"
                      required
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Confirm PIN</label>
                    <input
                      type="password"
                      maxLength={4}
                      placeholder="••••"
                      value={pinConfirmInput}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        setPinConfirmInput(val);
                      }}
                      className="w-full bg-zinc-900 border border-zinc-850 text-white rounded-xl px-3 py-2 text-center text-sm font-black focus:outline-none focus:ring-1 focus:ring-red-500 font-mono tracking-widest"
                      required
                    />
                  </div>
                </div>

                {pinError && (
                  <p className="text-[10px] text-red-400 font-semibold">{pinError}</p>
                )}
                {pinSuccess && (
                  <p className="text-[10px] text-emerald-400 font-semibold">{pinSuccess}</p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Lock className="h-3.5 w-3.5" />
                  ENABLE SECURITY LOCK
                </button>
              </form>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI ACCOUNTABILITY CONTRACTS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-zinc-950 border border-zinc-900 rounded-2xl p-6 relative overflow-hidden stitch-border" id="accountability-contracts-form-card">
            <span className="absolute top-0 left-0 right-0 h-[2px] bg-red-500/30" />
            
            <div className="flex items-center gap-2 mb-2">
              <Mail className="h-5 w-5 text-red-400 shrink-0" />
              <h3 className="font-bold text-white text-base">Formulate Accountability Contract</h3>
            </div>
            
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Establish severe stakes. Choose a critical task, name an accountability guardian, and specify your forfeit pledge. We'll mail the official contract to seal your commitment.
            </p>

            <form onSubmit={handleSealContract} className="space-y-4">
              
              {/* TARGET TASK SELECT */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Select Active Target Initiative</label>
                <select
                  value={selectedTaskId}
                  onChange={e => setSelectedTaskId(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-850 text-white rounded-xl px-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-semibold"
                  required
                >
                  <option value="">-- Choose High-Priority Task --</option>
                  {activeTasks.map(t => (
                    <option key={t.id} value={t.id}>
                      🎯 {t.title} (Due: {t.dueDate})
                    </option>
                  ))}
                </select>
                {activeTasks.length === 0 && (
                  <p className="text-[10px] text-zinc-500 font-mono">No active tasks available to bind.</p>
                )}
              </div>

              {/* GUARDIAN EMAIL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Guardian Email Address</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3 h-4 w-4 text-zinc-600" />
                    <input
                      type="email"
                      placeholder="partner@example.com"
                      value={partnerEmail}
                      onChange={e => setPartnerEmail(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 text-white rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
                      required
                    />
                  </div>
                </div>

                {/* THE FORFEIT / PLEDGE STAKES */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">The Forfeiture / Stakes</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-600" />
                    <input
                      type="text"
                      placeholder="e.g. Buy team coffee, do 100 burpees"
                      value={stakes}
                      onChange={e => setStakes(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-850 text-white rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 transition-all font-semibold"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* MESSAGE FOR GUARDIAN */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider font-mono">Achiever Message (Optional)</label>
                <textarea
                  placeholder="Tell your guardian why this task is crucial and how they should push you if you are slacking..."
                  value={customMessage}
                  onChange={e => setCustomMessage(e.target.value)}
                  className="w-full h-20 bg-zinc-900 border border-zinc-850 text-white rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 transition-all resize-none"
                />
              </div>

              {/* NOTIFICATION FEEDBACKS */}
              <AnimatePresence mode="wait">
                {successMsg && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-400 font-medium"
                  >
                    {successMsg}
                  </motion.div>
                )}
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-400 font-semibold"
                  >
                    {errorMsg}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SEAL BUTTON */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSending || activeTasks.length === 0}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-xl shadow-red-600/10 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSending ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sealing & Dispatching Contract...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      SEAL ACCOUNTABILITY CONTRACT
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* ACTIVE CONTRACTS LIST */}
          <div className="space-y-4" id="contracts-list-section">
            <h4 className="text-xs font-bold font-mono tracking-wider uppercase text-zinc-500">
              Locked Accountability Pledges ({contracts.length})
            </h4>

            {contracts.length === 0 ? (
              <div className="border border-dashed border-zinc-900 rounded-2xl p-6 text-center text-zinc-600 text-xs">
                No active contracts sealed yet. Lock a task above to secure full social accountability.
              </div>
            ) : (
              <div className="space-y-3" id="active-contracts-grid">
                {contracts.map((contract) => (
                  <div 
                    key={contract.id}
                    className={`bg-zinc-950 border border-zinc-900 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition duration-200 relative overflow-hidden ${
                      contract.status === "completed" 
                        ? "opacity-60 bg-emerald-950/10 border-emerald-500/20" 
                        : contract.status === "defaulted"
                        ? "opacity-60 bg-red-950/10 border-red-500/20"
                        : "border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.03)]"
                    }`}
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800">
                          ID: {contract.id.split("-")[1].substring(4)}
                        </span>
                        
                        {contract.status === "locked" ? (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/25 text-[8px] font-mono font-bold text-amber-400 uppercase tracking-widest animate-pulse">
                            Locked Contract
                          </span>
                        ) : contract.status === "completed" ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/35 text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-widest">
                            Cleared Smoothly
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/35 text-[8px] font-mono font-bold text-red-400 uppercase tracking-widest">
                            Defaulted / Forfeit
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white truncate">{contract.taskTitle}</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-zinc-500 shrink-0" />
                          <span className="truncate">Guardian: {contract.partnerEmail}</span>
                        </div>
                        <div className="flex items-center gap-1 text-red-400">
                          <Lock className="h-3 w-3 text-red-500/75 shrink-0" />
                          <span className="truncate font-semibold">Stakes: {contract.stakes}</span>
                        </div>
                      </div>
                    </div>

                    {/* CONTROL TRIGGERS */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {contract.status === "locked" ? (
                        <>
                          <button
                            onClick={() => handleResolveContract(contract.id, "completed")}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs transition duration-150 cursor-pointer border border-emerald-500/20 flex items-center gap-1 font-bold font-mono text-[10px]"
                            title="Verify and clear this contract"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            RESOLVE
                          </button>
                          <button
                            onClick={() => handleResolveContract(contract.id, "defaulted")}
                            className="p-2 bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 rounded-lg text-xs transition duration-150 cursor-pointer border border-red-500/20 flex items-center gap-1 font-bold font-mono text-[10px]"
                            title="Mark contract as failed"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            DEFAULT
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleDeleteContract(contract.id)}
                          className="p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-lg text-xs transition duration-150 cursor-pointer"
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
