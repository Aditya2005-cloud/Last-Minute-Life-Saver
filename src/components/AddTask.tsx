import React, { useState, useEffect } from "react";
import { Task } from "../types";
import {
  Plus,
  Mic,
  MicOff,
  Sparkles,
  Clock,
  Calendar,
  Tag,
  Sliders,
  ListTodo,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { Language, translations } from "../translations";

interface AddTaskProps {
  onAddTask: (task: Task) => void;
  onNavigateToDashboard: () => void;
  tasks?: Task[];
  language?: Language;
}

export default function AddTask({
  onAddTask,
  onNavigateToDashboard,
  tasks = [],
  language = "en",
}: AddTaskProps) {
  const t = translations[language];
  // Task state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [importance, setImportance] = useState<"high" | "medium" | "low">(
    "medium",
  );
  const [category, setCategory] = useState("Study");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");

  const defaultCategories = ["Study", "Work", "Admin", "Life", "Health"];
  const [dynamicCategories, setDynamicCategories] =
    useState<string[]>(defaultCategories);

  useEffect(() => {
    if (tasks) {
      const uniqueTaskCategories = Array.from(
        new Set(
          tasks
            .map((t) => t.category)
            .filter(
              (cat): cat is string =>
                !!cat && typeof cat === "string" && cat.trim() !== "",
            ),
        ),
      );
      // Combine defaults with unique categories from current tasks
      const combined = Array.from(
        new Set([...defaultCategories, ...uniqueTaskCategories]),
      );
      setDynamicCategories(combined);
    }
  }, [tasks]);

  // Web Speech API Voice command input state
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          const lower = transcript.toLowerCase().trim();
          if (
            lower === "navigate to dashboard" ||
            lower === "go to dashboard" ||
            lower === "show dashboard"
          ) {
            onNavigateToDashboard();
            return;
          }
          if (
            lower.includes("start focus session") ||
            lower.includes("start focus")
          ) {
            onNavigateToDashboard();
            return;
          }
          setTitle((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      rec.onerror = (err: any) => {
        console.error("Speech recognition error:", err);
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const handleVoiceListen = () => {
    if (!recognition) return;
    if (isListening) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      // Only submit if title exists, mimicking the native form submit behavior
      if (title.trim()) {
        const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
        handleSubmit(fakeEvent);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalCategory = isCustomCategory
      ? customCategoryInput.trim() || "General"
      : category;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      dueDate:
        dueDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
      importance,
      estimatedMinutes: Number(estimatedMinutes) || 45,
      category: finalCategory,
      completed: false,
      orderIndex: tasks.length,
      createdAt: new Date().toISOString(),
    };

    onAddTask(newTask);
    onNavigateToDashboard();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8" id="add-task-container">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <ListTodo className="h-6 w-6 text-amber-500" />
          {t.initNewObjective}
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          {t.addTaskDetails}
        </p>
      </div>

      <div
        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl"
        id="add-task-card"
      >
        {/* Top styling strip */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/40 via-purple-500/40 to-transparent" />

        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
          {/* TITLE INPUT with Microphone button */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
              {t.initiativeName}
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.taskPlaceholder}
                className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-semibold"
                required
                id="add-task-title"
              />
              {speechSupported && (
                <button
                  type="button"
                  onClick={handleVoiceListen}
                  className={`absolute right-3 p-2 rounded-lg transition-colors cursor-pointer ${
                    isListening
                      ? "bg-red-500/20 text-red-400 animate-pulse"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-850"
                  }`}
                  id="voice-transcribe-btn"
                  title="Speak to type"
                >
                  {isListening ? (
                    <Mic className="h-4.5 w-4.5" />
                  ) : (
                    <MicOff className="h-4.5 w-4.5" />
                  )}
                </button>
              )}
            </div>

            {/* Voice Dictation Tutorial Hint */}
            {speechSupported && (
              <div
                className={`mt-2 p-3 rounded-xl border transition-all duration-300 ${
                  isListening
                    ? "bg-red-500/10 border-red-500/30 text-red-300"
                    : "bg-zinc-950/60 border-zinc-850/80 text-zinc-400"
                }`}
                id="speech-api-guide"
              >
                <div className="flex items-start gap-2.5">
                  <div className="relative flex items-center justify-center mt-0.5">
                    {isListening && (
                      <span className="absolute inline-flex h-4 w-4 rounded-full bg-red-500 opacity-75 animate-ping" />
                    )}
                    <Mic
                      className={`h-4 w-4 shrink-0 transition-colors ${
                        isListening
                          ? "text-red-400 animate-pulse"
                          : "text-amber-500"
                      }`}
                    />
                  </div>
                  <div className="text-xs font-sans leading-relaxed">
                    {isListening ? (
                      <p className="font-semibold text-red-400">
                        Speech API active: Dictate your goal clearly now. Speak
                        naturally, and your vocal input will be transcribed in
                        real-time straight into the input box above.
                      </p>
                    ) : (
                      <p>
                        <span className="font-semibold text-zinc-300">
                          Hands-Free Dictation:
                        </span>{" "}
                        Click the microphone icon to initiate real-time
                        transcription. Uses the high-fidelity{" "}
                        <span className="text-amber-400 font-mono font-bold">
                          Web Speech API
                        </span>{" "}
                        to translate spoken commands into task items instantly.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Visualizer soundwave while listening */}
            <AnimatePresence>
              {isListening && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 20 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1 mt-2 px-1 text-xs text-red-400 font-mono font-medium"
                >
                  <span>Voice level:</span>
                  <div className="flex gap-0.5 items-end justify-start h-3 w-16">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <div
                        key={val}
                        className="w-1 bg-red-400 rounded-full animate-pulse"
                        style={{
                          height: `${30 + Math.random() * 70}%`,
                          animationDuration: `${0.3 + val * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* DESCRIPTION */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono">
              {t.tacticalDetails}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.contextPlaceholder}
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-medium resize-none"
              id="add-task-description"
            />
          </div>

          {/* DURATION & DUE DATE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                {t.estBlockMinutes}
              </label>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={(e) =>
                  setEstimatedMinutes(Math.max(5, Number(e.target.value)))
                }
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-semibold"
                min="5"
                required
                id="add-task-minutes"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                {t.loomingDeadline}
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-semibold"
                required
                id="add-task-duedate"
              />
            </div>
          </div>

          {/* PRIORITY & CATEGORY SELECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-zinc-400" />
                {t.baselineImportance}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["high", "medium", "low"] as const).map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setImportance(level)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase transition-all duration-200 cursor-pointer ${
                      importance === level
                        ? level === "high"
                          ? "bg-red-500/10 border-red-500 text-red-400"
                          : level === "medium"
                            ? "bg-amber-500/10 border-amber-500 text-amber-400"
                            : "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                        : "bg-zinc-950 border-zinc-850 text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t[level as keyof typeof t] || level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-zinc-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-zinc-400" />
                {t.categoryCorridor}
              </label>

              {!isCustomCategory ? (
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => {
                      if (e.target.value === "__add_custom__") {
                        setIsCustomCategory(true);
                      } else {
                        setCategory(e.target.value);
                      }
                    }}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-semibold appearance-none"
                    id="add-task-category"
                  >
                    {dynamicCategories.map((cat) => (
                      <option
                        key={cat}
                        value={cat}
                        className="bg-zinc-900 text-white"
                      >
                        {cat}
                      </option>
                    ))}
                    <option
                      value="__add_custom__"
                      className="bg-zinc-900 text-amber-400 font-bold"
                    >
                      ➕ + Create Custom Category...
                    </option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-400">
                    <svg
                      className="fill-current h-4 w-4"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      placeholder="Enter new custom category (e.g. Creative, Side Hustle)..."
                      className="flex-1 bg-zinc-950 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all font-semibold"
                      id="add-task-custom-category-input"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomCategory(false);
                        setCustomCategoryInput("");
                      }}
                      className="px-4 py-3 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-xl text-xs font-bold transition-all border border-zinc-800 hover:text-white cursor-pointer"
                    >
                      Use Dropdown
                    </button>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">
                    Create a custom, high-velocity category tag for your
                    dashboard matrix.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-850">
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="px-5 py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold rounded-xl text-xs shadow-lg shadow-orange-500/10 transition-all cursor-pointer"
              id="submit-new-task-btn"
            >
              <Plus className="h-4 w-4 stroke-[3px]" />
              {t.secureObjective} <span className="opacity-60 text-[10px] ml-1 font-mono tracking-tighter">⌘+↵</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
