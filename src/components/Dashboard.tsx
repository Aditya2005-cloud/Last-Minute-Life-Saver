import React, { useState, useEffect, useMemo } from "react";
import { Task, Habit } from "../types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Flame,
  Zap,
  Smile,
  Sparkles,
  AlertTriangle,
  Compass,
  Mic,
  CalendarDays,
  Target,
  Check,
  Search,
  X,
  SlidersHorizontal,
  GripVertical,
  Volume2,
  VolumeX,
  Timer,
  RefreshCw,
  Brain,
  Trash2,
  Plus,
  BarChart2,
  History,
  RefreshCcw,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { FocusSession } from "./FocusSession";

interface DashboardProps {
  tasks: Task[];
  habits: Habit[];
  onTasksChange: (tasks: Task[]) => void;
  onPrioritizeAll: () => Promise<void>;
  isLoadingPriorities: boolean;
  onViewPlan: (taskId: string) => void;
  userEmail: string | null;
  onLogin: () => void;
  onLogout: () => void;
  accessToken: string | null;
  currentTime: Date;
  onStartFocusTask: (task: Task) => void;
}

export default function Dashboard({
  tasks,
  habits,
  onTasksChange,
  onPrioritizeAll,
  isLoadingPriorities,
  onViewPlan,
  userEmail,
  onLogin,
  onLogout,
  accessToken,
  currentTime,
  onStartFocusTask,
}: DashboardProps) {
  const [dashboardView, setDashboardView] = useState<"agenda" | "analytics">("agenda");
  const [genieSpeech, setGenieSpeech] = useState<string>(
    "Greetings, operator. I have completed a cognitive sweep of your agenda. Ready to isolate distractions and secure your deadlines?",
  );

  // Search & Filter state values
  const [searchQuery, setSearchQuery] = useState("");
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "completed" | "all"
  >("active");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "importance" | "creation">("dueDate");

  // AI Audio Nudge States
  const [nudgeLoading, setNudgeLoading] = useState<Record<string, boolean>>({});
  const [taskNudges, setTaskNudges] = useState<Record<string, string>>({});
  const [speakingTaskId, setSpeakingTaskId] = useState<string | null>(null);
  const [reanalyzingTaskId, setReanalyzingTaskId] = useState<string | null>(
    null,
  );

  // Drag and Drop State for Manual Task Reordering
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Brain-Dump Drawer State
  const [isBrainDrawerOpen, setIsBrainDrawerOpen] = useState(false);

  // Lock body scroll when brain-dump drawer is open to prevent background scroll conflicts
  useEffect(() => {
    if (isBrainDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isBrainDrawerOpen]);

  const [brainDumpInput, setBrainDumpInput] = useState("");
  const [isParsingBrainDump, setIsParsingBrainDump] = useState(false);
  const [parsedBrainTasks, setParsedBrainTasks] = useState<Task[]>([]);
  const [selectedBrainTaskIds, setSelectedBrainTaskIds] = useState<
    Record<string, boolean>
  >({});
  const [brainParseError, setBrainParseError] = useState<string | null>(null);

  const handleParseBrainDump = async () => {
    if (!brainDumpInput.trim()) return;
    setIsParsingBrainDump(true);
    setBrainParseError(null);
    setParsedBrainTasks([]);
    setSelectedBrainTaskIds({});

    try {
      const response = await fetch("/api/parse-brain-dump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: brainDumpInput,
          currentDate: new Date().toISOString().split("T")[0],
        }),
      });

      if (!response.ok) {
        throw new Error("Parser service returned an error status.");
      }

      const data = await response.json();

      if (data.tasks && Array.isArray(data.tasks)) {
        // Generate stable unique client-side IDs
        const parsed = data.tasks.map((t: any, index: number) => ({
          ...t,
          id: crypto.randomUUID(),
          completed: false,
        }));

        setParsedBrainTasks(parsed);
        // Pre-select all parsed tasks
        const initialSelections: Record<string, boolean> = {};
        parsed.forEach((t: Task) => {
          initialSelections[t.id] = true;
        });
        setSelectedBrainTaskIds(initialSelections);
      } else {
        throw new Error("No structured tasks found in brain-dump.");
      }
    } catch (err: any) {
      console.error("Brain dump parsing failed:", err);
      setBrainParseError(err.message || "Failed to parse ideas with Gemini.");
    } finally {
      setIsParsingBrainDump(false);
    }
  };

  const handleImportBrainTasks = () => {
    const tasksToImport = parsedBrainTasks.filter(
      (t) => selectedBrainTaskIds[t.id],
    );
    if (tasksToImport.length === 0) return;

    // Append to main tasks list
    const updated = [...tasks, ...tasksToImport];
    onTasksChange(updated);

    // Reset drawer state & close
    setParsedBrainTasks([]);
    setSelectedBrainTaskIds({});
    setBrainDumpInput("");
    setIsBrainDrawerOpen(false);

    // Trigger sweet feedback!
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
    });
  };

  const handleGenerateNudge = async (
    taskId: string,
    taskTitle: string,
    urgency: string,
  ) => {
    // If we are currently speaking this task's nudge, stop it!
    if (speakingTaskId === taskId) {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setSpeakingTaskId(null);
      return;
    }

    // Stop any other active speech
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // If we already generated the nudge, read it out again directly!
    if (taskNudges[taskId]) {
      const textToSpeak = taskNudges[taskId];
      setSpeakingTaskId(taskId);
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.name.includes("Google US English") ||
          v.name.includes("Google UK English Male") ||
          v.lang.startsWith("en-US"),
      );
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      utterance.onend = () => setSpeakingTaskId(null);
      utterance.onerror = () => setSpeakingTaskId(null);
      window.speechSynthesis.speak(utterance);
      return;
    }

    setNudgeLoading((prev) => ({ ...prev, [taskId]: true }));
    try {
      const response = await fetch("/api/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskTitle, urgency }),
      });
      const data = await response.json();
      if (data.nudge) {
        setTaskNudges((prev) => ({ ...prev, [taskId]: data.nudge }));
        setSpeakingTaskId(taskId);

        if (window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(data.nudge);
          const voices = window.speechSynthesis.getVoices();
          const preferredVoice = voices.find(
            (v) =>
              v.name.includes("Google US English") ||
              v.name.includes("Google UK English Male") ||
              v.lang.startsWith("en-US"),
          );
          if (preferredVoice) utterance.voice = preferredVoice;
          utterance.rate = 1.0;
          utterance.pitch = 1.1;
          utterance.onend = () => setSpeakingTaskId(null);
          utterance.onerror = () => setSpeakingTaskId(null);
          window.speechSynthesis.speak(utterance);
        }
      }
    } catch (err) {
      console.error("Error generating audio nudge:", err);
    } finally {
      setNudgeLoading((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleReanalyzeSinglePriority = async (task: Task) => {
    setReanalyzingTaskId(task.id);
    try {
      const response = await fetch("/api/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: [task] }),
      });

      if (!response.ok) {
        throw new Error(
          "Single task prioritization service responded with an error.",
        );
      }

      const data = await response.json();
      const evaluation = data.evaluated?.find((ev: any) => ev.id === task.id);

      if (evaluation) {
        const updatedTasks = tasks.map((t) => {
          if (t.id === task.id) {
            return {
              ...t,
              panicScore: evaluation.panicScore,
              matrixQuadrant: evaluation.matrixQuadrant as any,
              aiReasoning: evaluation.aiReasoning,
            };
          }
          return t;
        });
        onTasksChange(updatedTasks);
      }
    } catch (err) {
      console.error("Single task priority re-analysis failed:", err);
      // Fallback to local heuristic for this task
      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const hoursLeft = Math.max(
        0.1,
        (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60),
      );
      let score = 20;
      let quadrant: Task["matrixQuadrant"] = "schedule";

      if (hoursLeft <= 12) {
        score = 95;
        quadrant = "do_first";
      } else if (hoursLeft <= 36) {
        score = 75;
        quadrant = "do_first";
      } else if (task.importance === "high") {
        score = 60;
        quadrant = "schedule";
      } else if (task.importance === "low" && hoursLeft > 72) {
        score = 10;
        quadrant = "eliminate";
      } else {
        score = 40;
        quadrant = "delegate";
      }

      const updatedTasks = tasks.map((t) => {
        if (t.id === task.id) {
          return {
            ...t,
            panicScore: score,
            matrixQuadrant: quadrant,
            aiReasoning: `Local Analysis: Due in ${Math.round(hoursLeft)} hrs. Break into milestones to secure progress.`,
          };
        }
        return t;
      });
      onTasksChange(updatedTasks);
    } finally {
      setReanalyzingTaskId(null);
    }
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: quickAddTitle.trim(),
      description: "",
      dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      importance: "medium",
      estimatedMinutes: 45,
      category: "General",
      completed: false,
      orderIndex: tasks.length,
      createdAt: new Date().toISOString(),
    };

    onTasksChange([...tasks, newTask]);
    setQuickAddTitle("");
  };

  const handleToggleComplete = (
    taskId: string,
    isCurrentlyCompleted: boolean,
  ) => {
    // Elegant Multi-Burst Confetti Celebration (only trigger on completion toggle)
    if (!isCurrentlyCompleted) {
      confetti({
        particleCount: 140,
        spread: 75,
        origin: { y: 0.6 },
        colors: ["#f59e0b", "#10b981", "#8b5cf6", "#3b82f6", "#ef4444"],
        disableForReducedMotion: true,
      });

      // Side accent bursts
      setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 60,
          spread: 50,
          origin: { x: 0, y: 0.75 },
          colors: ["#f59e0b", "#8b5cf6", "#3b82f6"],
        });
      }, 120);
      setTimeout(() => {
        confetti({
          particleCount: 45,
          angle: 120,
          spread: 50,
          origin: { x: 1, y: 0.75 },
          colors: ["#f59e0b", "#8b5cf6", "#3b82f6"],
        });
      }, 120);
    }

    // Call callback to toggle the task completed status
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const isNowCompleted = !t.completed;
        return { 
          ...t, 
          completed: isNowCompleted,
          completedAt: isNowCompleted ? new Date().toISOString() : undefined
        };
      }
      return t;
    });
    onTasksChange(updated);
  };

  const activeTasks = tasks.filter((t) => !t.completed);
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const completedTodayCount = tasks.filter((t) => t.completed && t.completedAt && new Date(t.completedAt).toDateString() === currentTime.toDateString()).length;
  const dailyGoal = 5;
  const completionPercentage =
    tasks.length > 0
      ? Math.round((completedTasksCount / tasks.length) * 100)
      : 0;

  const analyticsData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(currentTime);
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().split("T")[0];
    });

    return last7Days.map((dateString) => {
      const count = tasks.filter((t) => 
        t.completed && 
        t.completedAt && 
        t.completedAt.startsWith(dateString)
      ).length;

      const d = new Date(dateString);
      // adjust for local timezone offset when parsing YYYY-MM-DD
      d.setMinutes(d.getMinutes() + d.getTimezoneOffset());
      const dayName = d.toLocaleDateString("en-US", { weekday: "short" });

      return {
        date: dateString,
        day: dayName,
        completed: count,
      };
    });
  }, [tasks, currentTime]);

  // Compute unique categories present in the tasks
  const uniqueCategories = useMemo(() => {
    const cats = tasks
      .map((t) => t.category)
      .filter((cat): cat is string => !!cat);
    return Array.from(new Set(cats));
  }, [tasks]);

  // Dynamically calculate filtered tasks
  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter((task) => {
      // 1. Status Filter
      if (statusFilter === "active" && task.completed) return false;
      if (statusFilter === "completed" && !task.completed) return false;

      // 2. Category Filter
      if (selectedCategory !== "all" && task.category !== selectedCategory)
        return false;

      // 3. Search Query (matches title, description, or category)
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = task.title.toLowerCase().includes(query);
        const categoryMatch = task.category?.toLowerCase().includes(query);
        const descMatch = task.description?.toLowerCase().includes(query);
        if (!titleMatch && !categoryMatch && !descMatch) return false;
      }

      return true;
    });

    // Sort based on the selected sortBy option
    return [...filtered].sort((a, b) => {
      // Always honor user drag-and-drop order if it's explicitly set and we're not forcefully sorting by another dimension
      // But wait, the user asked for a dropdown to sort by Due Date, Importance Score, or Creation Date.
      // So we should sort primarily by the selected option.
      
      if (sortBy === "importance") {
        const impMap = { high: 3, medium: 2, low: 1 };
        const aImp = impMap[a.importance] ?? 0;
        const bImp = impMap[b.importance] ?? 0;
        
        // Also factor in panic score if available
        const aScore = (a.panicScore ?? 0) + (aImp * 100);
        const bScore = (b.panicScore ?? 0) + (bImp * 100);
        
        if (aScore !== bScore) return bScore - aScore; // Descending
      } else if (sortBy === "creation") {
        // Assume ID has creation order or we use createdAt if available
        // Tasks don't have createdAt, but they have id which is typically a timestamp or UUID.
        // Let's use id.localeCompare assuming it's temporally sortable, or if we don't have createdAt.
        // Wait, do tasks have createdAt? Let's check types.ts
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        if (aDate !== bDate) return bDate - aDate; // Descending
      } else {
        // Default: due date
        // Note: We'll put tasks without due date at the end
        const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
        const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
        if (aDate !== bDate) return aDate - bDate; // Ascending
      }

      // Fallbacks
      const aOrder = a.orderIndex ?? 999999;
      const bOrder = b.orderIndex ?? 999999;
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      return a.id.localeCompare(b.id);
    });
  }, [tasks, statusFilter, selectedCategory, searchQuery, sortBy]);

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    const target = e.target as HTMLElement;
    // Do not initiate drag if user interacted with interactive elements
    if (
      target.closest("button") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest("textarea") ||
      target.closest("a")
    ) {
      e.preventDefault();
      return;
    }
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    if (draggedTaskId && draggedTaskId !== taskId) {
      e.preventDefault(); // allow drop
      setDragOverTaskId(taskId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const sourceIdx = filteredTasks.findIndex((t) => t.id === draggedTaskId);
    const targetIdx = filteredTasks.findIndex((t) => t.id === targetTaskId);

    if (sourceIdx === -1 || targetIdx === -1) return;

    const reorderedFiltered = [...filteredTasks];
    const [moved] = reorderedFiltered.splice(sourceIdx, 1);
    reorderedFiltered.splice(targetIdx, 0, moved);

    handleReorder(reorderedFiltered);

    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  const handleReorder = (newFilteredTasks: Task[]) => {
    // Collect original orderIndexes of currently filtered tasks
    const originalOrderIndexes = filteredTasks
      .map((t) => t.orderIndex ?? 0)
      .sort((a, b) => a - b);

    // Build map of taskId -> new orderIndex
    const updatedIndexesMap = new Map<string, number>();
    newFilteredTasks.forEach((task, idx) => {
      updatedIndexesMap.set(task.id, originalOrderIndexes[idx] ?? idx);
    });

    // Map all tasks to their new state
    const updatedAllTasks = tasks.map((task) => {
      if (updatedIndexesMap.has(task.id)) {
        return {
          ...task,
          orderIndex: updatedIndexesMap.get(task.id),
        };
      }
      return task;
    });

    // Sort by orderIndex
    updatedAllTasks.sort((a, b) => {
      const aOrder = a.orderIndex ?? 999999;
      const bOrder = b.orderIndex ?? 999999;
      return aOrder - bOrder;
    });

    // Re-index sequentially to avoid floating numbers or gaps
    const sequentiallyIndexed = updatedAllTasks.map((t, index) => ({
      ...t,
      orderIndex: index,
    }));

    onTasksChange(sequentiallyIndexed);
  };

  // Find highest panic task
  const highestPanicTask = activeTasks.reduce((max, task) => {
    return (task.panicScore || 0) > (max.panicScore || 0) ? task : max;
  }, activeTasks[0] || null);

  const getPanicLevelBadge = (score: number) => {
    if (score >= 80)
      return {
        bg: "bg-red-500/10 text-red-400 border-red-500/20",
        label: "Critical Overdrive",
      };
    if (score >= 50)
      return {
        bg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        label: "Pressing Stress",
      };
    return {
      bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      label: "Sustained Velocity",
    };
  };

  const getQuadrantLabel = (quad: string) => {
    switch (quad) {
      case "do_first":
        return "🔥 Do First";
      case "schedule":
        return "⚡ Schedule";
      case "delegate":
        return "☕ Delegate";
      case "eliminate":
        return "Backburner";
      default:
        return "🎯 Unsorted";
    }
  };

  return (
    <div className="space-y-8" id="dashboard-container">
      {/* GENIE AVATAR & HEADER COMPONENT */}
      <div
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
        id="genie-header-grid"
      >
        {/* Left 4 cols: Glowing Genie Avatar */}
        <div
          className="lg:col-span-4 flex flex-col items-center justify-center relative py-6 bg-zinc-950 rounded-2xl border border-zinc-900 shadow-2xl overflow-hidden"
          id="genie-orb-panel"
        >
          {/* Subtle grid patterns */}
          <div className="absolute inset-0 grid-dots opacity-20 pointer-events-none" />

          {/* Concentric rotating glowing rings */}
          <div className="relative w-40 h-40 flex items-center justify-center">
            {/* Outer ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 15, ease: "linear", repeat: Infinity }}
              className="absolute inset-0 border border-zinc-200/20 rounded-full bg-[#e4e4e4] opacity-10"
            />
            {/* Middle ring */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 8, ease: "linear", repeat: Infinity }}
              className="absolute inset-2 border border-zinc-300/30 rounded-full bg-[#828282] opacity-15"
            />

            {/* Floating Genie Sphere Core */}
            <motion.button
              role="button"
              animate={{
                y: [0, -8, 0],
                scale: [1, 1.03, 1],
                boxShadow: [
                  "0 0 30px rgba(0, 0, 0, 0.05)",
                  "0 0 45px rgba(0, 0, 0, 0.1)",
                  "0 0 30px rgba(0, 0, 0, 0.05)",
                ],
              }}
              transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
              className="w-24 h-24 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-950 border border-zinc-700 flex items-center justify-center relative cursor-pointer group active:scale-95 transition-transform shadow-lg"
              onClick={() => {
                const phrases = [
                  "Ready to focus.",
                  "Let's plan your work so you can finish on time.",
                  "Don't check social media. Stick to your plan.",
                  "One good focus session is better than hours of distraction. Take a deep breath and start.",
                  "I am actively tracking your schedule constraints.",
                ];
                setGenieSpeech(
                  phrases[Math.floor(Math.random() * phrases.length)],
                );
              }}
            >
              {/* Particle layers inside */}
              <div className="absolute inset-1.5 rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden">
                <Sparkles className="h-8 w-8 text-zinc-400 group-hover:scale-110 transition-transform" />

                {/* Floating nebula gas visual */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-zinc-800/20 to-zinc-700/10 animate-pulse" />
              </div>
            </motion.button>
          </div>

          <h3 className="text-sm font-semibold tracking-widest text-zinc-400 uppercase font-mono mt-4">
            DeadlineGenie v1.1
          </h3>
          <span className="inline-flex items-center gap-1 mt-1 text-xs font-mono text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
            Core Agent Online
          </span>
        </div>

        {/* Right 8 cols: Conversational speech & Quick Stats */}
        <div className="lg:col-span-8 space-y-6" id="genie-comms-panel">
          {/* Chat bubble */}
          <div
            className="relative bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl"
            id="genie-bubble"
          >
            {/* Arrow */}
            <div className="hidden lg:block absolute left-0 top-1/2 -translate-x-2 -translate-y-2 w-4 h-4 bg-zinc-900 border-l border-b border-zinc-800 rotate-45" />

            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-500 font-semibold block mb-1">
              Direct Companion Directive
            </span>
            <p className="text-zinc-200 text-base leading-relaxed font-medium">
              "{genieSpeech}"
            </p>
          </div>

          {/* Core high-end KPI ring and metrics */}
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            id="dashboard-stats-row"
          >
            {/* Productivity Score Ring */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0">
                {/* SVG Ring */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="rgba(63, 63, 70, 0.4)"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="url(#productivity-gradient)"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray="175.9"
                    strokeDashoffset={
                      175.9 - (175.9 * completionPercentage) / 100
                    }
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient
                      id="productivity-gradient"
                      x1="0%"
                      y1="0%"
                      x2="100%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-mono font-extrabold text-sm text-white">
                  {completionPercentage}%
                </div>
              </div>
              <div>
                <h4 className="text-xs text-zinc-400 font-bold uppercase tracking-wider font-mono">
                  Productivity Ring
                </h4>
                <p className="text-lg font-bold text-white mt-0.5">
                  {completedTasksCount}/{tasks.length} Completed
                </p>
              </div>
            </div>

            {/* Daily Goal Card */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0">
                {/* SVG Ring */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="rgba(63, 63, 70, 0.4)"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    stroke="#10b981"
                    strokeWidth="5"
                    fill="transparent"
                    strokeDasharray="175.9"
                    strokeDashoffset={
                      175.9 - (175.9 * Math.min(completedTodayCount / dailyGoal, 1))
                    }
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Target className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
              <div>
                <h4 className="text-xs text-zinc-400 font-bold uppercase tracking-wider font-mono">
                  Daily Goal
                </h4>
                <p className="text-lg font-bold text-white mt-0.5">
                  {completedTodayCount}/{dailyGoal} Today
                </p>
              </div>
            </div>

            {/* Streak Counter */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/25 flex items-center justify-center shrink-0">
                <Flame className="h-6 w-6 text-orange-500 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs text-zinc-400 font-bold uppercase tracking-wider font-mono">
                  Active Survival
                </h4>
                <p className="text-lg font-bold text-white mt-0.5">
                  {habits.length > 0
                    ? Math.max(...habits.map((h) => h.streak), 0)
                    : 0}{" "}
                  Day Streak
                </p>
              </div>
            </div>

            {/* OAuth Connection Status */}
            <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center shrink-0">
                <CalendarDays className="h-6 w-6 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs text-zinc-400 font-bold uppercase tracking-wider font-mono">
                  Workspace Sync
                </h4>
                {accessToken ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-white font-semibold truncate">
                      Google Connected
                    </span>
                  </div>
                ) : (
                  <button
                    onClick={onLogin}
                    className="text-xs text-amber-400 hover:text-amber-300 font-bold underline text-left block mt-0.5 cursor-pointer"
                  >
                    Connect Google Calendar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD VIEW TOGGLE */}
      <div className="flex border-b border-zinc-900 gap-6 mt-8 mb-4">
        <button
          onClick={() => setDashboardView("agenda")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${dashboardView === "agenda" ? "border-amber-500 text-amber-500" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
        >
          <Target className="h-4 w-4" />
          Active Agenda
        </button>
        <button
          onClick={() => setDashboardView("analytics")}
          className={`pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${dashboardView === "analytics" ? "border-amber-500 text-amber-500" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}
        >
          <BarChart2 className="h-4 w-4" />
          Task Analytics
        </button>
      </div>

      {dashboardView === "agenda" && (
        <div className="space-y-4" id="priority-corridor">
          <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-500" />
              Critical Survival Grid
            </h3>
            <p className="text-zinc-500 text-xs">
              Calculated dynamically using urgency levels and timeline
              thresholds.
            </p>
          </div>

          <button
            onClick={onPrioritizeAll}
            disabled={isLoadingPriorities || tasks.length === 0}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-bold text-amber-400 flex items-center gap-2 transition duration-200 cursor-pointer disabled:opacity-50"
            id="quick-recalculate-btn"
          >
            {isLoadingPriorities ? (
              <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            Recalculate Priorities
          </button>
        </div>

        {/* Search & Filter Matrix */}
        <div
          className="bg-zinc-950/90 border border-zinc-850/60 rounded-2xl p-4 gap-4 flex flex-col md:flex-row items-stretch md:items-center justify-between shadow-2xl"
          id="filter-matrix-bar"
        >
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, category, or description..."
              className="w-full bg-zinc-900/60 border border-zinc-800 focus:border-amber-500/50 hover:border-zinc-700/80 text-white rounded-xl pl-10 pr-10 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all font-semibold font-sans placeholder-zinc-500"
              id="task-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Filters and Toggles */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Segment Control */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-1 flex items-center gap-1">
              <button
                onClick={() => setStatusFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all duration-150 cursor-pointer ${
                  statusFilter === "all"
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("active")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all duration-150 cursor-pointer ${
                  statusFilter === "active"
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setStatusFilter("completed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all duration-150 cursor-pointer ${
                  statusFilter === "completed"
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                Completed
              </button>
            </div>

            {/* Category Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 text-white rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                id="category-filter-select"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
                <SlidersHorizontal className="h-3 w-3" />
              </div>
            </div>

            {/* Sort By Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "dueDate" | "importance" | "creation")}
                className="bg-zinc-900/80 border border-zinc-800 hover:border-zinc-700/80 text-white rounded-xl pl-3 pr-8 py-2.5 text-xs font-bold font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all appearance-none cursor-pointer"
                id="sort-filter-select"
              >
                <option value="dueDate">Due Date</option>
                <option value="importance">Importance</option>
                <option value="creation">Creation</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400">
                <SlidersHorizontal className="h-3 w-3" />
              </div>
            </div>

            {/* Reset Filters Trigger */}
            {(searchQuery ||
              statusFilter !== "active" ||
              selectedCategory !== "all") && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("active");
                  setSelectedCategory("all");
                }}
                className="px-3 py-2 bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-750 text-xs font-bold font-mono rounded-xl transition duration-150 flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3 w-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Quick Add Bar */}
        <form onSubmit={handleQuickAdd} className="flex items-center gap-2 mb-2">
          <input
            type="text"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            placeholder="Quick add task... (Press Enter to save)"
            className="flex-1 bg-zinc-950/90 border border-zinc-850/60 focus:border-amber-500/50 hover:border-zinc-700/80 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/20 transition-all font-semibold placeholder-zinc-500 shadow-xl"
            id="quick-add-input"
          />
          <button
            type="submit"
            disabled={!quickAddTitle.trim()}
            className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed text-amber-500 hover:text-amber-400 font-bold font-sans text-xs uppercase tracking-wider rounded-xl border border-zinc-800 hover:border-amber-500/50 shadow-lg transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </form>

        {tasks.length === 0 ? (
          <div className="bg-zinc-950 border border-dashed border-zinc-900 py-12 rounded-2xl text-center">
            <Smile className="h-8 w-8 text-zinc-500 mx-auto mb-2" />
            <p className="text-zinc-400 text-sm font-semibold">
              Survival grid is fully cleared!
            </p>
            <p className="text-zinc-600 text-xs mt-1">
              Excellent job keeping looming deadlines at bay.
            </p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-zinc-950 border border-dashed border-zinc-900 py-12 rounded-2xl text-center space-y-2">
            <Smile className="h-8 w-8 text-zinc-500 mx-auto" />
            <p className="text-zinc-400 text-sm font-semibold">
              No tasks match your search parameters
            </p>
            <p className="text-zinc-600 text-xs">
              Try adjusting your keyword query, status tabs, or category
              selectors.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("active");
                setSelectedCategory("all");
              }}
              className="mt-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 text-xs font-bold rounded-lg transition duration-200 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            id="prioritized-cards-grid"
          >
            <AnimatePresence mode="popLayout">
              {filteredTasks.map((task) => {
                const panicMeta = getPanicLevelBadge(task.panicScore || 20);

              // Calculate checklist progress bar values
              const hasBreakdown = !!task.breakdown;
              const totalSubtasks = hasBreakdown
                ? task.breakdown!.tacticalSteps.flatMap((s) => s.checklist)
                    .length
                : 0;
              const completedSubtasks = hasBreakdown
                ? task.breakdown!.tacticalSteps.flatMap(
                    (s) => s.completedChecklist || [],
                  ).length
                : 0;
              const subtaskProgressPercent =
                totalSubtasks > 0
                  ? Math.round((completedSubtasks / totalSubtasks) * 100)
                  : 0;
              const isHighPriority =
                task.importance === "high" ||
                (task.panicScore && task.panicScore >= 70);

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ layout: { type: "spring", stiffness: 300, damping: 30 }, duration: 0.2 }}
                  draggable={!task.completed}
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => handleDragOver(e, task.id)}
                  onDrop={(e) => handleDrop(e, task.id)}
                  className={`border rounded-2xl p-5 transition-all duration-300 relative group flex flex-col justify-between ${
                    task.completed
                      ? "bg-zinc-950/40 border-emerald-500/20 opacity-75 shadow-sm"
                      : dragOverTaskId === task.id
                        ? "border-amber-500 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.25)] scale-[1.02]"
                        : "bg-zinc-900/40 border-zinc-850 hover:bg-zinc-900/70 hover:border-amber-500/30"
                  } ${draggedTaskId === task.id ? "opacity-30" : ""}`}
                  id={`task-card-${task.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <GripVertical className="h-4 w-4 text-zinc-500 group-hover:text-amber-500/70 transition-colors shrink-0 cursor-grab active:cursor-grabbing" />
                        <span
                          className={`px-2.5 py-1 rounded-full border text-[10px] font-mono font-bold uppercase tracking-wider ${
                            task.completed
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : panicMeta.bg
                          }`}
                        >
                          {task.completed
                            ? "COMPLETED"
                            : task.panicScore
                              ? `${task.panicScore}% Panic`
                              : "Pending Analysis"}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase bg-zinc-950 px-2 py-0.5 rounded-md border border-zinc-850">
                        {getQuadrantLabel(task.matrixQuadrant || "")}
                      </span>
                    </div>

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`text-sm font-bold group-hover:text-amber-400 transition-colors line-clamp-1 ${
                            task.completed
                              ? "line-through text-zinc-500"
                              : "text-white"
                          }`}
                        >
                          {task.title}
                        </h4>
                        {task.description && (
                          <p
                            className={`text-xs line-clamp-2 mt-1 leading-relaxed ${
                              task.completed
                                ? "text-zinc-600 line-through"
                                : "text-zinc-400"
                            }`}
                          >
                            {task.description}
                          </p>
                        )}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleComplete(task.id, !!task.completed);
                        }}
                        className={`p-1.5 rounded-xl border transition-all duration-200 cursor-pointer shrink-0 ${
                          task.completed
                            ? "bg-emerald-500 border-emerald-400 text-black hover:bg-emerald-600"
                            : "bg-zinc-950/80 hover:bg-emerald-500/10 border-zinc-850 hover:border-emerald-500/40 text-zinc-400 hover:text-emerald-400"
                        }`}
                        title={
                          task.completed ? "Mark incomplete" : "Mark complete"
                        }
                        id={`complete-task-${task.id}`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* DYNAMIC COMPONENT REQUIREMENT: Animated Progress Bar */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 font-bold">
                        <span>Checklist Roadmap</span>
                        <span>
                          {completedSubtasks}/{totalSubtasks} steps (
                          {subtaskProgressPercent}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-850/80">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${subtaskProgressPercent}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)] ${
                            task.completed
                              ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                              : "bg-gradient-to-r from-amber-500 to-purple-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* AI Nudge Audio Bubble */}
                    {taskNudges[task.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className={`p-3 rounded-xl border text-xs font-sans mt-2 relative overflow-hidden transition-all ${
                          speakingTaskId === task.id
                            ? "bg-amber-500/10 border-amber-500/30 text-amber-200 animate-pulse"
                            : "bg-zinc-950/60 border-zinc-900 text-zinc-400"
                        }`}
                        id={`nudge-bubble-${task.id}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="relative flex items-center justify-center mt-0.5 shrink-0">
                            {speakingTaskId === task.id && (
                              <span className="absolute inline-flex h-3.5 w-3.5 rounded-full bg-amber-500 opacity-75 animate-ping" />
                            )}
                            <Volume2
                              className={`h-3.5 w-3.5 ${speakingTaskId === task.id ? "text-amber-400 animate-bounce" : "text-zinc-500"}`}
                            />
                          </div>
                          <p className="leading-relaxed italic">
                            "{taskNudges[task.id]}"
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  <div className="border-t border-zinc-950/80 pt-4 mt-4 flex flex-col gap-3">
                    <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[10px] font-bold">
                      <Compass className="h-3.5 w-3.5" />
                      <span>{task.category}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!task.completed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateNudge(
                              task.id,
                              task.title,
                              task.importance || "high",
                            );
                          }}
                          disabled={nudgeLoading[task.id]}
                          className={`px-3 py-1.5 border rounded-lg text-[11px] font-bold transition duration-150 cursor-pointer flex items-center gap-1.5 ${
                            speakingTaskId === task.id
                              ? "bg-amber-500 hover:bg-amber-600 border-amber-400 text-black shadow-[0_0_12px_rgba(245,158,11,0.4)] animate-pulse"
                              : "bg-zinc-950/80 hover:bg-zinc-850 border-zinc-850 text-amber-500 hover:text-amber-400"
                          }`}
                          title="Get an AI verbal encouragement nudge"
                          id={`generate-nudge-btn-${task.id}`}
                        >
                          {nudgeLoading[task.id] ? (
                            <>
                              <span className="w-3 h-3 border border-amber-500 border-t-transparent rounded-full animate-spin" />
                              <span>Tuning...</span>
                            </>
                          ) : speakingTaskId === task.id ? (
                            <>
                              <VolumeX className="h-3.5 w-3.5" />
                              <span>Mute</span>
                            </>
                          ) : (
                            <>
                              <Volume2 className="h-3.5 w-3.5 animate-pulse" />
                              <span>Generate Nudge</span>
                            </>
                          )}
                        </button>
                      )}

                      {!task.completed && isHighPriority && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStartFocusTask(task);
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-[11px] rounded-lg shadow-md shadow-amber-500/15 cursor-pointer flex items-center gap-1.5 transition-all"
                          id={`start-focus-btn-${task.id}`}
                          title="Start focus sprint countdown with pink noise ambient generator"
                        >
                          <Timer className="h-3.5 w-3.5 animate-pulse" />
                          <span>Start Focus</span>
                        </button>
                      )}

                      {!task.completed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReanalyzeSinglePriority(task);
                          }}
                          disabled={reanalyzingTaskId === task.id}
                          className="px-3 py-1.5 bg-zinc-950/80 hover:bg-zinc-850 border border-zinc-850 text-cyan-500 hover:text-cyan-400 text-[11px] font-bold rounded-lg transition duration-150 cursor-pointer flex items-center gap-1.5 shrink-0"
                          title="Re-analyze priority specifically for this task"
                          id={`reanalyze-priority-btn-${task.id}`}
                        >
                          <RefreshCw
                            className={`h-3 w-3 ${reanalyzingTaskId === task.id ? "animate-spin" : ""}`}
                          />
                          <span>
                            {reanalyzingTaskId === task.id
                              ? "Analyzing..."
                              : "Re-analyze"}
                          </span>
                        </button>
                      )}

                      <button
                        onClick={() => onViewPlan(task.id)}
                        className="px-3.5 py-1.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-850 text-[11px] font-bold text-zinc-300 hover:text-white rounded-lg transition duration-150 cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <span>Game Plan</span>
                        <span className="text-amber-500 font-mono font-black">
                          &rarr;
                        </span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
      )}

      {dashboardView === "analytics" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-950/80 border border-zinc-850/60 rounded-2xl p-6 shadow-2xl mt-4"
        >
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
            <BarChart2 className="h-5 w-5 text-amber-500" />
            7-Day Task Completion
          </h3>
          <p className="text-zinc-500 text-xs mb-8">
            Review your progress over the last week.
          </p>
          
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyticsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#a1a1aa", fontSize: 12, fontWeight: 500 }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: "#a1a1aa", fontSize: 12, fontWeight: 500 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: "#27272a", opacity: 0.4 }}
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: "8px", color: "#fff", fontWeight: "bold" }}
                  itemStyle={{ color: "#fbbf24", fontWeight: "bold" }}
                  labelStyle={{ color: "#a1a1aa", marginBottom: "4px", fontSize: "12px", textTransform: "uppercase" }}
                />
                <Bar 
                  dataKey="completed" 
                  fill="#fbbf24" 
                  radius={[4, 4, 0, 0]}
                  name="Tasks Completed"
                  barSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      )}

      {/* FLOATING ACTION BUTTON FOR BRAIN-DUMP */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsBrainDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-zinc-950 hover:bg-zinc-900 text-cyan-400 hover:text-cyan-300 font-bold font-sans text-xs uppercase tracking-wider rounded-full border border-cyan-500/30 hover:border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all duration-300 cursor-pointer group"
          id="brain-dump-fab"
          title="Brain-Dump Fleeting Ideas"
        >
          <div className="relative">
            <Brain className="h-5 w-5 animate-pulse group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-500 rounded-full animate-ping" />
          </div>
          <span className="hidden sm:inline">Brain-Dump Ideas</span>
        </button>
      </div>

      {/* BRAIN-DUMP DRAWER */}
      <AnimatePresence>
        {isBrainDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBrainDrawerOpen(false)}
              className="fixed inset-0 bg-black z-50 cursor-pointer"
              id="brain-drawer-backdrop"
            />

            {/* Side Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-zinc-950 border-l border-zinc-900 p-6 sm:p-8 overflow-y-auto z-50 shadow-2xl flex flex-col justify-between"
              id="brain-drawer-container"
            >
              <div className="space-y-6 flex-1">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-cyan-950/40 border border-cyan-800/30 rounded-xl text-cyan-400">
                      <Brain className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-md font-bold text-white tracking-tight">
                        AI Fleeting Ideas Drawer
                      </h3>
                      <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                        GEMINI-POWERED COGNITIVE EXTRACTOR
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsBrainDrawerOpen(false)}
                    className="p-1.5 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-white rounded-lg transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Directive */}
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 text-xs text-zinc-400 leading-relaxed space-y-1">
                  <p className="font-semibold text-zinc-300">
                    Spit out raw, fleeting ideas or unstructured brain-dumps:
                  </p>
                  <p>
                    Gemini will analyze your thoughts, identify distinct
                    actionable plans, automatically estimate durations, classify
                    importance levels, deduce smart categories, and build them
                    into clean Task Cards!
                  </p>
                </div>

                {/* Input Area */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-mono font-bold text-zinc-500">
                    <span>Fleeting Input Canvas</span>
                    <span>{brainDumpInput.length} chars</span>
                  </div>
                  <textarea
                    value={brainDumpInput}
                    onChange={(e) => setBrainDumpInput(e.target.value)}
                    placeholder="e.g., Remind me to finish the finance homework tomorrow by noon (super high priority, takes 1 hour). Also, need to buy dog food and message Larry to study tonight."
                    className="w-full h-44 bg-zinc-900/60 border border-zinc-850 hover:border-zinc-800 focus:border-cyan-500/50 rounded-2xl p-4 text-xs text-white placeholder-zinc-600 focus:ring-0 focus:outline-none transition resize-none leading-relaxed font-sans"
                    id="brain-dump-textarea"
                  />
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setBrainDumpInput("")}
                      className="text-[10px] font-mono font-bold text-zinc-500 hover:text-zinc-300 transition flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      Clear input
                    </button>
                    <span className="text-[10px] text-zinc-600 italic">
                      No structure required. Just spill.
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {brainParseError && (
                  <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{brainParseError}</span>
                  </div>
                )}

                {/* Loading state / Parsing Stage */}
                {isParsingBrainDump && (
                  <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="relative flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full border-t-2 border-r-2 border-cyan-500 animate-spin" />
                      <Brain className="h-5 w-5 text-cyan-400 absolute animate-pulse" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Extracting Actions with Gemini...
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Isolating fleeting intentions and deducing priority
                        scores.
                      </p>
                    </div>
                  </div>
                )}

                {/* Parsed Previews List */}
                {parsedBrainTasks.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
                        Proposed Tasks ({parsedBrainTasks.length})
                      </h4>
                      <button
                        onClick={() => {
                          const allSelected = parsedBrainTasks.every(
                            (t) => selectedBrainTaskIds[t.id],
                          );
                          const next: Record<string, boolean> = {};
                          parsedBrainTasks.forEach((t) => {
                            next[t.id] = !allSelected;
                          });
                          setSelectedBrainTaskIds(next);
                        }}
                        className="text-[10px] font-mono font-bold text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                      >
                        {parsedBrainTasks.every(
                          (t) => selectedBrainTaskIds[t.id],
                        )
                          ? "Deselect All"
                          : "Select All"}
                      </button>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {parsedBrainTasks.map((t) => {
                        const isSelected = !!selectedBrainTaskIds[t.id];
                        return (
                          <div
                            key={t.id}
                            onClick={() =>
                              setSelectedBrainTaskIds((prev) => ({
                                ...prev,
                                [t.id]: !prev[t.id],
                              }))
                            }
                            className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-left ${
                              isSelected
                                ? "bg-cyan-950/20 border-cyan-500/30 text-white"
                                : "bg-zinc-900/30 border-zinc-900/60 text-zinc-500 hover:border-zinc-800"
                            }`}
                          >
                            <div className="mt-0.5 shrink-0">
                              <div
                                className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition-all ${
                                  isSelected
                                    ? "bg-cyan-500 border-cyan-400 text-black"
                                    : "border-zinc-800"
                                }`}
                              >
                                {isSelected && (
                                  <Check className="h-3 w-3 stroke-[3]" />
                                )}
                              </div>
                            </div>

                            <div className="space-y-1.5 flex-1 min-w-0">
                              <p
                                className={`text-xs font-bold leading-tight truncate ${isSelected ? "text-zinc-200" : "text-zinc-500"}`}
                              >
                                {t.title}
                              </p>
                              {t.description && t.description !== t.title && (
                                <p className="text-[10px] text-zinc-500 line-clamp-1 leading-normal italic">
                                  "{t.description}"
                                </p>
                              )}
                              <div className="flex flex-wrap items-center gap-2 font-mono text-[9px]">
                                <span
                                  className={`px-1.5 py-0.5 rounded-md border uppercase font-extrabold ${
                                    t.importance === "high"
                                      ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                                      : t.importance === "medium"
                                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                        : "bg-zinc-800 border-zinc-700 text-zinc-400"
                                  }`}
                                >
                                  {t.importance}
                                </span>
                                <span className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-md text-zinc-400 font-medium">
                                  {t.category}
                                </span>
                                <span className="text-zinc-500">
                                  ⏱️ {t.estimatedMinutes}m
                                </span>
                                <span className="text-zinc-500 pl-1 border-l border-zinc-800">
                                  📅 {t.dueDate}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="border-t border-zinc-900 pt-5 mt-6 shrink-0 flex items-center gap-3">
                {parsedBrainTasks.length > 0 ? (
                  <>
                    <button
                      onClick={() => {
                        setParsedBrainTasks([]);
                        setSelectedBrainTaskIds({});
                      }}
                      className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-750 text-zinc-400 hover:text-zinc-200 font-bold font-sans text-[11px] uppercase tracking-wider rounded-xl transition duration-150 cursor-pointer text-center"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleImportBrainTasks}
                      disabled={
                        Object.values(selectedBrainTaskIds).filter(Boolean)
                          .length === 0
                      }
                      className="flex-1.5 py-2.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:from-zinc-900 disabled:to-zinc-900 disabled:border-zinc-800 border border-transparent text-black disabled:text-zinc-600 font-extrabold font-sans text-[11px] uppercase tracking-wider rounded-xl transition duration-150 shadow-lg shadow-cyan-500/10 cursor-pointer text-center flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                      Import Tasks (
                      {
                        Object.values(selectedBrainTaskIds).filter(Boolean)
                          .length
                      }
                      )
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleParseBrainDump}
                    disabled={!brainDumpInput.trim() || isParsingBrainDump}
                    className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:from-zinc-900 disabled:to-zinc-900 disabled:border-zinc-850 border border-transparent text-black disabled:text-zinc-600 font-extrabold font-sans text-xs uppercase tracking-wider rounded-xl transition duration-150 shadow-lg shadow-cyan-500/10 cursor-pointer text-center flex items-center justify-center gap-1.5"
                    id="brain-dump-parse-btn"
                  >
                    <Sparkles className="h-4 w-4 stroke-[2.5]" />
                    Deconstruct with Gemini ⚡
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
