import React, { useState, useEffect, useMemo, useRef } from "react";
import { Task, Habit, ScheduleItem } from "./types";
import Dashboard from "./components/Dashboard";
import AddTask from "./components/AddTask";
import AgentPlan from "./components/AgentPlan";
import CalendarSync from "./components/CalendarSync";
import Insights from "./components/Insights";
import HabitTracker from "./components/HabitTracker";
import PanicButton from "./components/PanicButton";
import BufferShield from "./components/BufferShield";
import AppLockScreen from "./components/AppLockScreen";

const LandingPage3D = React.lazy(() => import("./components/LandingPage3D"));


import { 
  auth, 
  googleSignIn, 
  logout, 
  getAccessToken 
} from "./firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import { 
  subscribeTasks, 
  subscribeHabits, 
  subscribeSchedule, 
  saveTaskToFirestore, 
  saveHabitToFirestore, 
  saveScheduleToFirestore,
  deleteTaskFromFirestore,
  deleteHabitFromFirestore,
  saveTasksBatchToFirestore,
  saveHabitsBatchToFirestore
} from "./lib/firestore";

import { 
  Clock, 
  Cpu, 
  Calendar, 
  Heart, 
  Award, 
  Sparkles, 
  ShieldAlert, 
  Shield,
  Lock,
  Zap,
  AlertTriangle,
  PowerOff,
  LayoutDashboard,
  PlusCircle,
  LogIn,
  LogOut,
  Mic,
  MicOff,
  Timer,
  Check,
  Trash2,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Sun,
  Moon
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { FocusSession } from "./components/FocusSession";
import { LoginScreen } from "./components/LoginScreen";

// --- Default Initial Seed Data ---
const DEFAULT_TASKS: Task[] = [
  {
    id: "task-1",
    title: "Finish physics chapter lab write-up",
    description: "Write up the results for Chapter 4 (wave mechanics) and include calculations and error margins.",
    dueDate: new Date(Date.now() + 18 * 3600000).toISOString().split("T")[0],
    importance: "high",
    estimatedMinutes: 60,
    category: "Study",
    completed: false,
    panicScore: 92,
    matrixQuadrant: "do_first",
    aiReasoning: "Due in less than 24 hours. High importance. Requires focused uninterrupted math blocks.",
    orderIndex: 0,
    breakdown: {
      estimatedMinutesTotal: 60,
      tacticalSteps: [
        {
          title: "Math setups & preparation",
          durationMinutes: 10,
          checklist: [
            "Silence social media & activate focus protocol",
            "Open Chapter 4 workbook & lab notes sheet"
          ],
          completedChecklist: []
        },
        {
          title: "Core drafting and graphs",
          durationMinutes: 35,
          checklist: [
            "Plot wave mechanics wave-lengths graph",
            "Draft raw calculations for Chapter 4 write-up"
          ],
          completedChecklist: []
        },
        {
          title: "Polish and final submission check",
          durationMinutes: 15,
          checklist: [
            "Add formulas reference guidelines page",
            "Save and export write-up as PDF document"
          ],
          completedChecklist: []
        }
      ],
      requiredResources: ["Silence workspace", "Chapter 4 formulas guide", "Wave plotter tool"],
      immediateFirstStep: "Open formulas guide book and turn off your phone notifications.",
      reasoningSteps: [
        "Analyzing physics lab wave formulas...",
        "Identifying critical graphs requirements...",
        "Structuring 3-phase high-velocity writing checklist."
      ]
    }
  },
  {
    id: "task-2",
    title: "Revise slide deck for marketing pitch",
    description: "Incorporate client feedback regarding sizing guidelines and slide transitions.",
    dueDate: new Date(Date.now() + 48 * 3600000).toISOString().split("T")[0],
    importance: "medium",
    estimatedMinutes: 45,
    category: "Work",
    completed: false,
    panicScore: 58,
    matrixQuadrant: "schedule",
    aiReasoning: "Moderate urgency. Important for corporate milestones. Best scheduled for morning alignment.",
    orderIndex: 1
  }
];

const DEFAULT_HABITS: Habit[] = [
  {
    id: "habit-1",
    name: "Mute slack & social tabs (Focus Block)",
    frequency: "daily",
    completedDates: [],
    streak: 0
  },
  {
    id: "habit-2",
    name: "Clean Desk & Drink 500ml Water",
    frequency: "daily",
    completedDates: [],
    streak: 0
  }
];

export default function App() {
  // Navigation Tabs: 'dashboard' | 'add_task' | 'agent_plan' | 'calendar_sync' | 'insights' | 'habits' | 'buffer_shield'
  const [activeTab, setActiveTab] = useState<"dashboard" | "add_task" | "agent_plan" | "calendar_sync" | "insights" | "habits" | "buffer_shield">("dashboard");

  // Authentication State
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [offlineMode, setOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem("deadline_genie_offline") === "true";
  });

  // Theme State
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("deadline_genie_theme");
    return (saved as "dark" | "light") || "light";
  });

  // Sync theme selection to document element & localStorage
  useEffect(() => {
    if (theme === "light") {
      document.body.classList.add("light");
      document.body.classList.remove("dark");
    } else {
      document.body.classList.add("dark");
      document.body.classList.remove("light");
    }
    localStorage.setItem("deadline_genie_theme", theme);
  }, [theme]);

  // App Core State
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem("crisis_helper_tasks");
    return saved ? JSON.parse(saved) : DEFAULT_TASKS;
  });

  // Proactive Buffer Shield state
  const [bufferOffsetHours, setBufferOffsetHours] = useState<number>(() => {
    return Number(localStorage.getItem("deadline_genie_buffer_offset") || "0");
  });

  const handleSetBufferOffsetHours = (hours: number) => {
    setBufferOffsetHours(hours);
    localStorage.setItem("deadline_genie_buffer_offset", String(hours));
  };

  // Virtualized list of tasks with proactive buffer offsets
  const bufferedTasks = useMemo(() => {
    if (bufferOffsetHours === 0) return tasks;
    return tasks.map(task => {
      try {
        const d = new Date(task.dueDate);
        const bufferedTime = new Date(d.getTime() - bufferOffsetHours * 60 * 60 * 1000);
        const iso = bufferedTime.toISOString();
        const formatted = iso.includes("T") ? iso.split("T")[0] : task.dueDate;
        return {
          ...task,
          dueDate: formatted,
          originalDueDate: task.dueDate,
          isBuffered: true
        };
      } catch (err) {
        return task;
      }
    });
  }, [tasks, bufferOffsetHours]);

  // Application Lock (PIN Security) State
  const [pinCode, setPinCode] = useState<string>(() => {
    return localStorage.getItem("deadline_genie_pin_code") || "";
  });
  const [isPinEnabled, setIsPinEnabled] = useState<boolean>(() => {
    return localStorage.getItem("deadline_genie_pin_enabled") === "true";
  });
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    return localStorage.getItem("deadline_genie_pin_enabled") === "true";
  });

  const handleSetPinCode = (pin: string) => {
    setPinCode(pin);
    localStorage.setItem("deadline_genie_pin_code", pin);
  };

  const handleSetPinEnabled = (enabled: boolean) => {
    setIsPinEnabled(enabled);
    localStorage.setItem("deadline_genie_pin_enabled", String(enabled));
    if (!enabled) {
      setIsAppLocked(false);
    }
  };

  const handleLockApp = () => {
    if (pinCode && isPinEnabled) {
      setIsAppLocked(true);
    }
  };

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem("crisis_helper_habits");
    const loaded: Habit[] = saved ? JSON.parse(saved) : DEFAULT_HABITS;
    return loaded.map((h) => ({
      ...h,
      streak: h.completedDates.length === 0 ? 0 : h.streak,
    }));
  });

  const [schedule, setSchedule] = useState<ScheduleItem[]>(() => {
    const saved = localStorage.getItem("crisis_helper_schedule");
    return saved ? JSON.parse(saved) : [];
  });

  // Global loader indicators
  const [isLoadingPriorities, setIsLoadingPriorities] = useState(false);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isBreakingDown, setIsBreakingDown] = useState<Record<string, boolean>>({});

  // Lifted Active Focus Task State
  const [activeFocusTask, setActiveFocusTask] = useState<Task | null>(null);

  // Global Hands-free Speech Assistant State
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [voiceSpeechSupported, setVoiceSpeechSupported] = useState(false);
  const [voiceRecognition, setVoiceRecognition] = useState<any>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceFeedback, setVoiceFeedback] = useState("");
  const [isVoiceHelpOpen, setIsVoiceHelpOpen] = useState(false);

  // Real-time local Clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock detailed view expanded state
  const [isClockExpanded, setIsClockExpanded] = useState(false);

  // Warnings & Info notifications
  const [apiWarning, setApiWarning] = useState<string | null>(null);

  // Undo Promote State
  const [undoState, setUndoState] = useState<{
    previousTasks: Task[];
    taskId: string;
    visible: boolean;
  } | null>(null);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Selected task state for Agent Plan
  const [selectedPlanTaskId, setSelectedPlanTaskId] = useState<string | null>(null);

  // Sync state to LocalStorage (as fallback)
  useEffect(() => {
    if (!user) {
      localStorage.setItem("crisis_helper_tasks", JSON.stringify(tasks));
    }
  }, [tasks, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem("crisis_helper_habits", JSON.stringify(habits));
    }
  }, [habits, user]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem("crisis_helper_schedule", JSON.stringify(schedule));
    }
  }, [schedule, user]);

  // Keep Clock updated
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Authentication state observer
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const token = await getAccessToken();
        setAccessToken(token);
      } else {
        setAccessToken(null);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Real-time Firestore snapshot synchronization
  useEffect(() => {
    if (!user) return;

    const unsubTasks = subscribeTasks(user.uid, (syncedTasks) => {
      if (syncedTasks.length > 0) {
        setTasks(syncedTasks);
      }
    });

    const unsubHabits = subscribeHabits(user.uid, (syncedHabits) => {
      if (syncedHabits.length > 0) {
        setHabits(syncedHabits);
      }
    });

    const unsubSchedule = subscribeSchedule(user.uid, (syncedSchedule) => {
      if (syncedSchedule.length > 0) {
        setSchedule(syncedSchedule);
      }
    });

    return () => {
      unsubTasks();
      unsubHabits();
      unsubSchedule();
    };
  }, [user]);

  // --- Auth Handlers ---
  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setAccessToken(res.accessToken);
        setOfflineMode(false);
        localStorage.removeItem("deadline_genie_offline");
        setApiWarning("Successfully connected with Google OAuth. Google Calendar syncing activated.");
      }
    } catch (err: any) {
      console.error(err);
      setApiWarning("Google Sign-In failed. Running in standalone mode.");
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setAccessToken(null);
    setOfflineMode(true);
    localStorage.setItem("deadline_genie_offline", "true");
    setApiWarning("Logged out. Local storage mode active.");
  };

  // --- Core State Mutators (Save locally + firestore proxy) ---
  const handleTasksChange = async (updatedTasks: Task[]) => {
    // Unbuffered tasks to save real dates only
    const cleanTasks = updatedTasks.map(t => {
      const anyT = t as any;
      if (anyT.isBuffered && anyT.originalDueDate) {
        const { isBuffered, originalDueDate, ...rest } = anyT;
        return {
          ...rest,
          dueDate: originalDueDate
        } as Task;
      }
      return t;
    });

    const oldTasksMap = new Map(tasks.map(t => [t.id, t]));
    const changedTasks = cleanTasks.filter(t => {
      const old = oldTasksMap.get(t.id);
      if (!old) return true;
      return JSON.stringify(t) !== JSON.stringify(old);
    });
    const deletedTaskIds = tasks
      .filter(oldT => !cleanTasks.some(newT => newT.id === oldT.id))
      .map(oldT => oldT.id);

    setTasks(cleanTasks);

    if (user && (changedTasks.length > 0 || deletedTaskIds.length > 0)) {
      saveTasksBatchToFirestore(user.uid, changedTasks, deletedTaskIds);
    }
  };

  const handlePromoteTaskToFirst = async (taskId: string) => {
    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    // Cache the previous state for undo
    const previousTasksState = [...tasks];

    const otherTasks = tasks.filter(t => t.id !== taskId);
    const sortedOthers = [...otherTasks].sort((a, b) => {
      const aOrder = a.orderIndex ?? 999999;
      const bOrder = b.orderIndex ?? 999999;
      if (aOrder !== bOrder) return aOrder - bOrder;

      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : 0;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : 0;
      if (aDate !== bDate) return aDate - bDate;

      return a.id.localeCompare(b.id);
    });

    const promotedTask = {
      ...targetTask,
      importance: "high" as const,
      orderIndex: 0
    };

    const reorderedAll = [
      promotedTask,
      ...sortedOthers.map((t, index) => ({
        ...t,
        orderIndex: index + 1
      }))
    ];

    await handleTasksChange(reorderedAll);

    // Show undo toast
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    setUndoState({
      previousTasks: previousTasksState,
      taskId,
      visible: true
    });
    undoTimeoutRef.current = setTimeout(() => {
      setUndoState(prev => prev ? { ...prev, visible: false } : null);
    }, 5000);
  };

  const handleUndoPromote = async () => {
    if (!undoState) return;
    
    // Revert to cached state
    await handleTasksChange(undoState.previousTasks);
    
    // Hide toast
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    setUndoState(null);
  };

  const handleToggleTaskCompletion = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id === taskId) {
        const nextCompleted = !t.completed;
        if (nextCompleted) {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ["#f59e0b", "#10b981", "#3b82f6"]
          });
        }
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString().split("T")[0] : undefined
        };
      }
      return t;
    });
    handleTasksChange(updated);
  };

  const handleToggleSubtaskInApp = (taskId: string, stepIndex: number, subtaskText: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId && t.breakdown) {
        const steps = [...t.breakdown.tacticalSteps];
        const step = { ...steps[stepIndex] };
        const completed = step.completedChecklist || [];
        
        let newCompleted;
        if (completed.includes(subtaskText)) {
          newCompleted = completed.filter(c => c !== subtaskText);
        } else {
          newCompleted = [...completed, subtaskText];
          confetti({
            particleCount: 15,
            spread: 40,
            origin: { y: 0.85 },
            colors: ["#10b981", "#3b82f6"]
          });
        }
        
        steps[stepIndex] = { ...step, completedChecklist: newCompleted };
        return {
          ...t,
          breakdown: {
            ...t.breakdown,
            tacticalSteps: steps
          }
        };
      }
      return t;
    });
    handleTasksChange(updatedTasks);
  };

  const handleHabitsChange = async (updatedHabits: Habit[]) => {
    const oldHabitsMap = new Map(habits.map(h => [h.id, h]));
    const changedHabits = updatedHabits.filter(h => {
      const old = oldHabitsMap.get(h.id);
      if (!old) return true;
      return JSON.stringify(h) !== JSON.stringify(old);
    });
    const deletedHabitIds = habits
      .filter(oldH => !updatedHabits.some(newH => newH.id === oldH.id))
      .map(oldH => oldH.id);

    setHabits(updatedHabits);

    if (user && (changedHabits.length > 0 || deletedHabitIds.length > 0)) {
      saveHabitsBatchToFirestore(user.uid, changedHabits, deletedHabitIds);
    }
  };

  // --- Voice Commands Navigation & Action Handlers ---
  const stateRef = React.useRef({ tasks, activeTab });
  useEffect(() => {
    stateRef.current = { tasks, activeTab };
  }, [tasks, activeTab]);

  const speakNotification = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes("Google US English") || 
      v.name.includes("Google UK English Male") || 
      v.lang.startsWith("en-US")
    );
    if (preferredVoice) utterance.voice = preferredVoice;
    utterance.rate = 1.05;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
    setVoiceFeedback(text);
    setTimeout(() => setVoiceFeedback(""), 4000);
  };

  const handleDeleteTask = async (taskId: string) => {
    const updated = stateRef.current.tasks.filter(t => t.id !== taskId);
    setTasks(updated);
    if (user) {
      await deleteTaskFromFirestore(user.uid, taskId);
    }
  };

  const handleToggleComplete = async (taskId: string, isCurrentlyCompleted: boolean, actualMinutes?: number) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const updated = stateRef.current.tasks.map(t => {
      if (t.id === taskId) {
        const nextCompleted = !isCurrentlyCompleted;
        return { 
          ...t, 
          completed: nextCompleted,
          completedAt: nextCompleted ? todayStr : undefined,
          actualMinutes: nextCompleted 
            ? (actualMinutes ?? Math.max(5, Math.round(t.estimatedMinutes * (0.85 + Math.random() * 0.3))))
            : undefined
        };
      }
      return t;
    });
    setTasks(updated);
    const updatedTask = updated.find(t => t.id === taskId);
    if (user && updatedTask) {
      await saveTaskToFirestore(user.uid, updatedTask);
    }
  };

  const handleVoiceCommand = (rawText: string) => {
    const text = rawText.toLowerCase().trim();
    const currentTasks = stateRef.current.tasks;
    
    // 1. Navigation
    if (text.includes("navigate to dashboard") || text.includes("go to dashboard") || text.includes("show dashboard") || text.includes("show matrix")) {
      setActiveTab("dashboard");
      speakNotification("Navigating to dashboard matrix.");
      return;
    }
    if (text.includes("navigate to add task") || text.includes("go to add task") || text.includes("add task") || text.includes("new task")) {
      setActiveTab("add_task");
      speakNotification("Opening add task portal. Dictate details above.");
      return;
    }
    if (text.includes("navigate to agent plan") || text.includes("go to agent plan") || text.includes("show plan") || text.includes("show blueprint") || text.includes("game plan")) {
      setActiveTab("agent_plan");
      speakNotification("Opening agent plan blueprint.");
      return;
    }
    if (text.includes("navigate to calendar") || text.includes("go to calendar") || text.includes("show calendar") || text.includes("calendar sync")) {
      setActiveTab("calendar_sync");
      speakNotification("Navigating to calendar synchronization workspace.");
      return;
    }
    if (text.includes("navigate to insights") || text.includes("go to insights") || text.includes("show insights")) {
      setActiveTab("insights");
      speakNotification("Opening diagnostics and productivity insights.");
      return;
    }
    if (text.includes("navigate to habits") || text.includes("go to habits") || text.includes("show habits") || text.includes("habit tracker")) {
      setActiveTab("habits");
      speakNotification("Opening daily habit sync.");
      return;
    }

    // 2. Focus session command
    if (text.includes("start focus session") || text.includes("start focus")) {
      const active = currentTasks.filter(t => !t.completed);
      const target = active.find(t => t.importance === "high" || (t.panicScore && t.panicScore >= 70)) || active[0];
      if (target) {
        setActiveFocusTask(target);
        speakNotification(`Securing distractions. Starting focus sprint for: ${target.title}`);
      } else {
        speakNotification("No active urgent objectives found to start focus session.");
      }
      return;
    }

    // 3. Delete task command (hands free)
    if (text.startsWith("delete task") || text.startsWith("remove task")) {
      const isSimpleDelete = text === "delete task" || text === "remove task";
      const active = currentTasks.filter(t => !t.completed);
      if (active.length === 0) {
        speakNotification("No active tasks found to remove.");
        return;
      }

      let targetTask = active[0];
      if (!isSimpleDelete) {
        const phrase = text.replace("delete task", "").replace("remove task", "").trim();
        const matched = active.find(t => t.title.toLowerCase().includes(phrase));
        if (matched) {
          targetTask = matched;
        } else {
          speakNotification(`Could not locate active task matching "${phrase}".`);
          return;
        }
      }

      handleDeleteTask(targetTask.id);
      speakNotification(`Deleted task: ${targetTask.title}`);
      return;
    }

    // 4. Complete task command (hands free)
    if (text.startsWith("complete task") || text.startsWith("finish task")) {
      const phrase = text.replace("complete task", "").replace("finish task", "").trim();
      const active = currentTasks.filter(t => !t.completed);
      if (phrase && active.length > 0) {
        const matched = active.find(t => t.title.toLowerCase().includes(phrase));
        if (matched) {
          handleToggleComplete(matched.id, false);
          speakNotification(`Completed objective: ${matched.title}. Beautifully done!`);
        } else {
          speakNotification(`No active task found matching "${phrase}".`);
        }
      } else if (active.length > 0) {
        const first = active[0];
        handleToggleComplete(first.id, false);
        speakNotification(`Completed objective: ${first.title}. Beautifully done!`);
      } else {
        speakNotification("No active tasks available to complete.");
      }
      return;
    }

    // 5. Create task command
    if (text.startsWith("create task") || text.startsWith("add high priority task")) {
      const titleText = rawText.replace(/create task/i, "").replace(/add high priority task/i, "").trim();
      if (titleText) {
        const isHigh = text.includes("high");
        const newTask: Task = {
          id: crypto.randomUUID(),
          title: titleText,
          description: "Vocalized hands-free objective",
          dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          importance: isHigh ? "high" : "medium",
          estimatedMinutes: 25,
          category: "General",
          completed: false,
          orderIndex: currentTasks.length
        };
        handleAddTask(newTask);
        speakNotification(`Secured objective: ${titleText}`);
      } else {
        speakNotification("Please specify an objective name to create.");
      }
      return;
    }
  };

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsVoiceActive(true);
        setVoiceTranscript("Listening for commands...");
      };

      rec.onend = () => {
        setIsVoiceActive(false);
      };

      rec.onresult = (event: any) => {
        const lastResultIndex = event.results.length - 1;
        const transcript = event.results[lastResultIndex][0].transcript.trim();
        if (transcript) {
          setVoiceTranscript(transcript);
          handleVoiceCommand(transcript);
        }
      };

      rec.onerror = (err: any) => {
        console.error("Global speech assistant error:", err);
        setIsVoiceActive(false);
      };

      setVoiceRecognition(rec);
    }
  }, []);

  const toggleGlobalVoiceControl = () => {
    if (!voiceRecognition) return;
    if (isVoiceActive) {
      voiceRecognition.stop();
    } else {
      voiceRecognition.start();
    }
  };

  const handleAddTask = async (task: Task) => {
    const updated = [task, ...tasks];
    setTasks(updated);
    if (user) {
      await saveTaskToFirestore(user.uid, task);
    }
  };

  const handleCompleteTaskFromPanic = async (taskId: string) => {
    const updated = tasks.map(t => t.id === taskId ? { ...t, completed: true } : t);
    setTasks(updated);
    const completedTask = updated.find(t => t.id === taskId);
    if (user && completedTask) {
      await saveTaskToFirestore(user.uid, completedTask);
    }
  };

  // --- API Handlers ---

  // Call 1: Eisenhower & Urgency Analyzer
  const handlePrioritizeAll = async () => {
    setIsLoadingPriorities(true);
    setApiWarning(null);
    try {
      const response = await fetch("/api/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks })
      });

      if (!response.ok) {
        throw new Error("Prioritization service responded with an error.");
      }

      const data = await response.json();
      
      const updatedTasks = tasks.map(task => {
        const evaluation = data.evaluated.find((ev: any) => ev.id === task.id);
        if (evaluation) {
          return {
            ...task,
            panicScore: evaluation.panicScore,
            matrixQuadrant: evaluation.matrixQuadrant as any,
            aiReasoning: evaluation.aiReasoning
          };
        }
        return task;
      });

      await handleTasksChange(updatedTasks);

      if (data.isFallback) {
        setApiWarning("Using robust heuristic prioritization. Define your GEMINI_API_KEY in Secrets for live cognitive planning.");
      }

    } catch (e: any) {
      console.error(e);
      setApiWarning("Prioritization failed. Offline heuristic evaluation activated.");
      
      const backupTasks = tasks.map(t => {
        const dueTime = new Date(t.dueDate).getTime();
        const hoursLeft = (dueTime - Date.now()) / (1000 * 60 * 60);
        let score = 30;
        let quad: Task["matrixQuadrant"] = "schedule";

        if (hoursLeft <= 24) {
          score = 90;
          quad = "do_first";
        } else if (t.importance === "high") {
          score = 70;
          quad = "schedule";
        } else if (t.importance === "low" && hoursLeft > 72) {
          score = 15;
          quad = "eliminate";
        } else {
          score = 45;
          quad = "delegate";
        }

        return {
          ...t,
          panicScore: score,
          matrixQuadrant: quad,
          aiReasoning: "Heuristic evaluation mode activated. Complete tasks prior to deadline to minimize risk."
        };
      });
      await handleTasksChange(backupTasks);
    } finally {
      setIsLoadingPriorities(false);
    }
  };

  // Call 2: Micro-Breakdown generator
  const handleBreakdownTask = async (taskId: string) => {
    setIsBreakingDown(prev => ({ ...prev, [taskId]: true }));
    setApiWarning(null);

    const targetTask = tasks.find(t => t.id === taskId);
    if (!targetTask) return;

    try {
      const response = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: targetTask })
      });

      if (!response.ok) throw new Error("Failed to get breakdown");
      const data = await response.json();

      const updated = tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, breakdown: data };
        }
        return t;
      });

      await handleTasksChange(updated);

      if (data.isFallback) {
        setApiWarning("Mapped local template guide. Supply GEMINI_API_KEY in Secrets to generate unique custom steps.");
      }

    } catch (e) {
      console.error(e);
      setApiWarning("Failed to connect to breakdown server. Loading offline blueprint.");
      
      const updated = tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            breakdown: {
              estimatedMinutesTotal: t.estimatedMinutes,
              tacticalSteps: [
                {
                  title: "Setup & Preparation",
                  durationMinutes: Math.round(t.estimatedMinutes * 0.15),
                  checklist: ["Close distraction tabs", "Secure comfortable lighting & hydration"],
                  completedChecklist: []
                },
                {
                  title: "Draft & heavy lifting sprint",
                  durationMinutes: Math.round(t.estimatedMinutes * 0.60),
                  checklist: ["Create simple draft structure", "Add core content points without perfectionism"],
                  completedChecklist: []
                },
                {
                  title: "Polish & Final checks",
                  durationMinutes: Math.round(t.estimatedMinutes * 0.25),
                  checklist: ["Check requirements and spelling", "Run final submission check"],
                  completedChecklist: []
                }
              ],
              requiredResources: ["Uninterrupted focus block", "Water", "Topic references"],
              immediateFirstStep: "Turn off notifications and open your document canvas right now.",
              reasoningSteps: [
                "Locating default fallback roadmap...",
                "Drafting focus setup guidelines...",
                "Configuring 3-phase baseline sprint roadmap."
              ]
            }
          };
        }
        return t;
      });
      await handleTasksChange(updated);
    } finally {
      setIsBreakingDown(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // Call 3: Day Architecture Optimizer
  const handleGenerateSchedule = async (start: string, end: string) => {
    setIsLoadingSchedule(true);
    setApiWarning(null);
    try {
      const response = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: tasks.filter(t => !t.completed),
          habits,
          workingHoursStart: start,
          workingHoursEnd: end
        })
      });

      if (!response.ok) throw new Error("Failed to optimize schedule");
      const data = await response.json();
      setSchedule(data.schedule);
      if (user) {
        await saveScheduleToFirestore(user.uid, data.schedule);
      }

      if (data.isFallback) {
        setApiWarning("Optimized day with offline algorithms. Feed GEMINI_API_KEY in Secrets to run deep cognitive day balancing.");
      }

    } catch (e) {
      console.error(e);
      setApiWarning("Schedule server offline. Running local hour-by-hour interleaving.");
      
      const mockSchedule: ScheduleItem[] = [
        {
          time: "09:00 AM",
          activity: "Morning High-Focus Alignment",
          durationMinutes: 15,
          type: "buffer",
          taskId: null,
          description: "Plan the day, review deadlines, and lock focus."
        }
      ];
      setSchedule(mockSchedule);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const handleClearEverything = () => {
    if (confirm("Are you sure you want to reset all tasks, habits, and schedules? This cannot be undone.")) {
      localStorage.removeItem("crisis_helper_tasks");
      localStorage.removeItem("crisis_helper_habits");
      localStorage.removeItem("crisis_helper_schedule");
      setTasks(DEFAULT_TASKS);
      setHabits(DEFAULT_HABITS);
      setSchedule([]);
      setApiWarning("Data has been reset to system defaults.");
    }
  };

  // Compute total panic states for warning banner
  const activeUnprioritized = tasks.filter(t => !t.completed && t.panicScore === undefined);
  const maxPanicScore = tasks.reduce((max, t) => !t.completed && t.panicScore && t.panicScore > max ? t.panicScore : max, 0);

  const nextDeadlineTask = useMemo(() => {
    const activeTasks = tasks.filter(t => !t.completed && t.dueDate);
    if (activeTasks.length === 0) return null;
    return [...activeTasks].sort((a, b) => {
      const aTime = new Date(a.dueDate).getTime();
      const bTime = new Date(b.dueDate).getTime();
      return aTime - bTime;
    })[0];
  }, [tasks]);

  const handleViewPlan = (taskId: string) => {
    setSelectedPlanTaskId(taskId);
    setActiveTab("agent_plan");
  };

  if (!user && !offlineMode && showLanding) {
    return (
      <React.Suspense fallback={
        <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center font-mono text-[10px] tracking-widest gap-4">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span>BOOTING DEADLINEGENIE COGNITIVE CANVAS...</span>
        </div>
      }>
        <LandingPage3D onGetStarted={() => setShowLanding(false)} />
      </React.Suspense>
    );
  }

  if (!user && !offlineMode) {
    return (
      <LoginScreen 
        onLogin={handleLogin} 
        onEnterOffline={() => {
          setOfflineMode(true);
          localStorage.setItem("deadline_genie_offline", "true");
        }} 
        theme={theme}
      />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-amber-500/30 selection:text-white relative overflow-hidden" id="main-app-container">
      {/* Slow Global Aurora Background Effect */}
      <div className="aurora-container pointer-events-none">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>

      {/* GLOW DECORATIONS */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[450px] h-[450px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* HEADER SECTION */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40" id="site-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20" id="app-logo">
              <ShieldAlert className="h-5.5 w-5.5 text-black animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                DeadlineGenie AI Companion
                <span className="text-[10px] uppercase font-mono tracking-wider font-semibold bg-red-500/10 text-red-400 px-2 py-0.5 rounded border border-red-500/20 animate-pulse">
                  CRISIS READY
                </span>
              </h1>
              <p className="text-zinc-500 text-xs mt-0.5">Tactical deep focus engine & Google Workspace sync companion</p>
            </div>
          </div>

          {/* CLOCK & CRITICAL CRUNCH ALERTER & AUTH PORTAL */}
          <div className="flex items-center gap-4 text-xs flex-wrap">
            {maxPanicScore >= 80 && (
              <div className="hidden md:flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg animate-pulse">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span><strong>High Panic Risk:</strong> Action advised!</span>
              </div>
            )}
            
            <div className="relative">
              <div 
                onClick={() => setIsClockExpanded(!isClockExpanded)}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl p-1.5 pl-3.5 shadow-sm hover:bg-zinc-800/70 transition-all cursor-pointer select-none active:scale-98" 
                id="live-system-clock"
                title="Click to view detailed tactical countdown"
              >
                <div className="flex items-center gap-2 font-mono text-zinc-400 text-xs py-1">
                  <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
                  <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                </div>
                
                {/* Deadline Progress Indicator */}
                {nextDeadlineTask && (() => {
                  const getLocalDate = (dateStr: string) => {
                    const [year, month, day] = dateStr.split("-").map(Number);
                    return new Date(year, month - 1, day, 23, 59, 59);
                  };
                  const dueTime = getLocalDate(nextDeadlineTask.dueDate).getTime();
                  const diffMs = dueTime - currentTime.getTime();
                  const isOverdue = diffMs <= 0;
                  
                  // 48 hours max window representing urgency curve
                  const maxWindowMs = 48 * 60 * 60 * 1000;
                  const progressPercent = isOverdue ? 0 : Math.max(0, Math.min(100, (diffMs / maxWindowMs) * 100));
                  
                  // Determine format
                  let timeStr = "";
                  if (isOverdue) {
                    timeStr = "Overdue!";
                  } else {
                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                    if (hours > 24) {
                      const days = Math.floor(hours / 24);
                      timeStr = `${days}d ${hours % 24}h`;
                    } else {
                      timeStr = `${hours}h ${mins}m`;
                    }
                  }

                  // Determine bar color and pulse intensity based on urgency
                  const isCloseDeadline = !isOverdue && diffMs < 60 * 60 * 1000; // less than 60 minutes
                  let barColorClass = "bg-emerald-500";
                  let textClass = "text-emerald-400";
                  let containerBorderClass = "border-zinc-800/80";
                  let titleClass = "text-zinc-300 font-medium truncate max-w-[85px] sm:max-w-[110px]";

                  if (isOverdue) {
                    barColorClass = "bg-rose-600 animate-pulse";
                    textClass = "text-rose-500 font-extrabold animate-pulse";
                    containerBorderClass = "border-rose-500/30";
                  } else if (isCloseDeadline) {
                    barColorClass = "urgent-progress-flash";
                    textClass = "text-rose-400 font-extrabold animate-pulse";
                    titleClass = "urgent-text-flash font-extrabold truncate max-w-[85px] sm:max-w-[110px]";
                    containerBorderClass = "border-rose-500/40";
                  } else if (progressPercent < 20) {
                    barColorClass = "bg-rose-500 animate-pulse";
                    textClass = "text-rose-400 font-bold";
                    containerBorderClass = "border-rose-500/20";
                  } else if (progressPercent < 50) {
                    barColorClass = "bg-amber-500";
                    textClass = "text-amber-400 font-medium";
                    containerBorderClass = "border-amber-500/20";
                  }

                  return (
                    <div className={`flex items-center gap-2 bg-zinc-950 px-2.5 py-1 rounded-lg border ${containerBorderClass} text-[10px] font-sans transition-all max-w-[210px] sm:max-w-[270px] truncate`}>
                      <span className="text-zinc-500 shrink-0 uppercase font-bold tracking-wider">Next:</span>
                      <span className={titleClass} id={`clock-next-task-title-${nextDeadlineTask.id}`}>{nextDeadlineTask.title}</span>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Visual progress bar representing time remaining */}
                        <div className="w-10 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 shrink-0">
                          <div 
                            className={`h-full ${barColorClass} rounded-full transition-all duration-1000`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                        <span className={`font-mono text-[9px] uppercase tracking-tighter shrink-0 ${textClass}`}>{timeStr}</span>
                      </div>
                      
                      {isClockExpanded ? (
                        <ChevronUp className="h-3 w-3 text-zinc-500 shrink-0 ml-0.5" />
                      ) : (
                        <ChevronDown className="h-3 w-3 text-zinc-500 shrink-0 ml-0.5" />
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Outside click overlay */}
              {isClockExpanded && (
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={() => setIsClockExpanded(false)} 
                />
              )}

              {/* Elegant absolute clock expander dropdown */}
              <AnimatePresence>
                {isClockExpanded && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-3 z-50 w-[320px] sm:w-[380px] bg-zinc-950/98 border border-zinc-850 rounded-2xl p-5 shadow-2xl space-y-4 text-xs select-none backdrop-blur-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {nextDeadlineTask ? (() => {
                      const getLocalDate = (dateStr: string) => {
                        const [year, month, day] = dateStr.split("-").map(Number);
                        return new Date(year, month - 1, day, 23, 59, 59);
                      };
                      const dueTime = getLocalDate(nextDeadlineTask.dueDate).getTime();
                      const diffMs = dueTime - currentTime.getTime();
                      const isOverdue = diffMs <= 0;
                      const absMs = Math.abs(diffMs);

                      const seconds = Math.floor((absMs / 1000) % 60);
                      const minutes = Math.floor((absMs / (1000 * 60)) % 60);
                      const hours = Math.floor((absMs / (1000 * 60 * 60)) % 24);
                      const days = Math.floor(absMs / (1000 * 60 * 60 * 24));

                      const pad = (num: number) => String(num).padStart(2, "0");

                      const isCloseDeadline = !isOverdue && diffMs < 60 * 60 * 1000;
                      
                      const hasBreakdown = !!nextDeadlineTask.breakdown;
                      const totalSubtasks = hasBreakdown ? nextDeadlineTask.breakdown!.tacticalSteps.flatMap(s => s.checklist).length : 0;
                      const completedSubtasks = hasBreakdown ? nextDeadlineTask.breakdown!.tacticalSteps.flatMap(s => s.completedChecklist || []).length : 0;
                      const subtaskProgressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;
                      
                      return (
                        <>
                          {/* Header section with state label */}
                          <div className="flex items-center justify-between border-b border-zinc-900 pb-2.5">
                            <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-zinc-500">
                              Deadline Diagnostics
                            </span>
                            {isOverdue ? (
                              <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold bg-rose-500/15 border border-rose-500/30 text-rose-400 animate-pulse flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Overdue
                              </span>
                            ) : isCloseDeadline ? (
                              <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-pulse flex items-center gap-1">
                                <Timer className="h-3 w-3" /> Imminent
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[9px] uppercase font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                                On Track
                              </span>
                            )}
                          </div>

                          {/* Task Description & info */}
                          <div className="space-y-1">
                            <h3 className="font-bold text-sm text-white line-clamp-1">
                              {nextDeadlineTask.title}
                            </h3>
                            <div className="bg-zinc-900/50 border border-zinc-850/60 rounded-xl p-3 text-zinc-400 font-sans leading-relaxed text-[11px] max-h-20 overflow-y-auto pr-1">
                              {nextDeadlineTask.description || "No specific tactical objectives or background description defined for this milestone."}
                            </div>
                          </div>

                          {/* Tactical Step Progress Section */}
                          {hasBreakdown && totalSubtasks > 0 && (
                            <div className="space-y-2 border-t border-b border-zinc-900/60 py-2.5">
                              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
                                <span className="flex items-center gap-1">
                                  <Check className="h-3.5 w-3.5 text-amber-500" /> Checklist Roadmap
                                </span>
                                <span className="text-emerald-400">{completedSubtasks}/{totalSubtasks} steps ({subtaskProgressPercent}%)</span>
                              </div>
                              
                              {/* Animated Progress Bar */}
                              <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-850/80">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${subtaskProgressPercent}%` }}
                                  transition={{ duration: 0.5, ease: "easeOut" }}
                                  className="h-full rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)] bg-gradient-to-r from-amber-500 to-purple-500"
                                />
                              </div>

                              {/* Interactive Sub-task Checkboxes inside the clock card */}
                              <div className="bg-zinc-950/40 border border-zinc-900/80 rounded-xl p-2 max-h-[110px] overflow-y-auto space-y-2 scrollbar-thin">
                                {nextDeadlineTask.breakdown!.tacticalSteps.map((step, stepIdx) => (
                                  <div key={stepIdx} className="space-y-1">
                                    <div className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-tight">
                                      Phase {stepIdx + 1}: {step.title}
                                    </div>
                                    <div className="space-y-1 pl-1">
                                      {step.checklist.map((sub, subIdx) => {
                                        const isDone = step.completedChecklist?.includes(sub);
                                        return (
                                          <div 
                                            key={subIdx}
                                            onClick={() => handleToggleSubtaskInApp(nextDeadlineTask.id, stepIdx, sub)}
                                            className={`flex items-start gap-2 p-1.5 rounded-lg border transition-all duration-150 cursor-pointer text-[10px] ${
                                              isDone 
                                                ? "bg-zinc-950/20 border-zinc-900/40 text-zinc-500 line-through" 
                                                : "bg-zinc-900/40 border-zinc-850/50 text-zinc-300 hover:border-amber-500/20 hover:bg-zinc-900/60"
                                            }`}
                                          >
                                            <div className="shrink-0 mt-0.5 text-amber-500">
                                              {isDone ? (
                                                <Check className="h-3 w-3 text-amber-500 font-extrabold stroke-[3.5]" />
                                              ) : (
                                                <div className="h-3 w-3 rounded border border-zinc-600 hover:border-amber-500" />
                                              )}
                                            </div>
                                            <span className="font-semibold leading-relaxed text-left">{sub}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Instant Task Completion Action */}
                          <div className="bg-zinc-900/40 border border-zinc-850 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-emerald-500/30 transition-all">
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => {
                                  handleToggleTaskCompletion(nextDeadlineTask.id);
                                  setTimeout(() => setIsClockExpanded(false), 250);
                                }}
                                className="group/cb h-5 w-5 rounded-full border border-zinc-700 hover:border-emerald-500 flex items-center justify-center hover:bg-emerald-500/10 transition-all cursor-pointer"
                                title="Click to secure milestone / Mark task as complete"
                              >
                                <Check className="h-3 w-3 text-transparent group-hover/cb:text-emerald-400 transition-all stroke-[3]" />
                              </button>
                              <div className="flex flex-col text-left">
                                <span className="font-semibold text-zinc-200 text-[11px] leading-tight">Secure Milestone</span>
                                <span className="text-[9px] text-zinc-500">Mark complete to secure deadline</span>
                              </div>
                            </div>
                            <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                              Crush Task
                            </span>
                          </div>

                          {/* Tactical Phase Stepper Progress Indicator */}
                          {(() => {
                            const hasBreakdown = !!nextDeadlineTask.breakdown;
                            if (!hasBreakdown || !nextDeadlineTask.breakdown!.tacticalSteps || nextDeadlineTask.breakdown!.tacticalSteps.length === 0) {
                              return (
                                <div className="bg-zinc-900/30 border border-zinc-850/60 rounded-xl p-4 text-center text-[10px] text-zinc-500 italic">
                                  No plan generated yet. Go to AI Game Plan to get started.
                                </div>
                              );
                            }

                            const steps = nextDeadlineTask.breakdown!.tacticalSteps;
                            return (
                              <div className="bg-zinc-900/30 border border-zinc-850/60 rounded-xl p-3.5 space-y-3.5 text-left">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className="font-bold text-zinc-400 uppercase tracking-wider font-mono text-left">Phase Progress</span>
                                  <span className="font-mono text-zinc-500 font-bold uppercase text-[9px] tracking-tight">
                                    {steps.length} Phases Defined
                                  </span>
                                </div>

                                {/* Horizontal stepper visual nodes & progress bars */}
                                <div className="flex items-center justify-between gap-1 relative py-1">
                                  {steps.map((step, idx, arr) => {
                                    const total = step.checklist.length;
                                    const completed = step.completedChecklist?.length || 0;
                                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                                    const isStepCompleted = pct === 100 && total > 0;
                                    const isStepActive = !isStepCompleted && pct > 0;
                                    
                                    return (
                                      <React.Fragment key={idx}>
                                        {/* Step Node */}
                                        <div className="flex flex-col items-center flex-1 relative min-w-0">
                                          <div 
                                            className={`h-7 w-7 rounded-full flex items-center justify-center font-mono text-[10px] font-bold border transition-all duration-300 select-none ${
                                              isStepCompleted 
                                                ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]" 
                                                : isStepActive 
                                                  ? "bg-amber-500/10 border-amber-500 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]" 
                                                  : "bg-zinc-900/60 border-zinc-800 text-zinc-500"
                                            }`}
                                            title={`${step.title}: ${completed}/${total} completed`}
                                          >
                                            {isStepCompleted ? (
                                              <Check className="h-3.5 w-3.5 stroke-[3.5]" />
                                            ) : (
                                              idx + 1
                                            )}
                                          </div>
                                          
                                          {/* Step Title Label */}
                                          <span className="text-[8px] font-semibold text-zinc-400 mt-1.5 truncate max-w-full text-center px-1" title={step.title}>
                                            {step.title}
                                          </span>
                                          
                                          {/* Step Percentage Label */}
                                          <span className={`text-[8px] font-mono mt-0.5 ${isStepCompleted ? "text-emerald-400 font-bold" : pct > 0 ? "text-amber-400 font-bold" : "text-zinc-600"}`}>
                                            {pct}%
                                          </span>
                                        </div>
                                        
                                        {/* Connector Line with animated completion width */}
                                        {idx < arr.length - 1 && (
                                          <div className="h-0.5 flex-1 bg-zinc-850/80 max-w-[40px] -mt-6 rounded-full overflow-hidden">
                                            <div 
                                              className={`h-full bg-gradient-to-r ${isStepCompleted ? "from-emerald-500 to-emerald-500" : "from-amber-500 to-zinc-800"} transition-all duration-500`} 
                                              style={{ width: isStepCompleted ? "100%" : `${pct}%` }}
                                            />
                                          </div>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Grid Ticking Countdown */}
                          <div className="space-y-1.5">
                            <div className="text-[9px] uppercase tracking-wider font-mono font-bold text-zinc-500 text-center">
                              {isOverdue ? "time elapsed since deadline" : "precise tactical remaining window"}
                            </div>
                            <div className="flex justify-center gap-2 font-mono text-center">
                              <div className="bg-zinc-900/80 border border-zinc-850/40 rounded-xl px-2.5 py-2 min-w-[55px] sm:min-w-[65px]">
                                <div className="text-base sm:text-lg font-black text-white">{pad(days)}</div>
                                <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-sans">days</div>
                              </div>
                              <div className="bg-zinc-900/80 border border-zinc-850/40 rounded-xl px-2.5 py-2 min-w-[55px] sm:min-w-[65px]">
                                <div className="text-base sm:text-lg font-black text-white">{pad(hours)}</div>
                                <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-sans">hours</div>
                              </div>
                              <div className="bg-zinc-900/80 border border-zinc-850/40 rounded-xl px-2.5 py-2 min-w-[55px] sm:min-w-[65px]">
                                <div className="text-base sm:text-lg font-black text-white">{pad(minutes)}</div>
                                <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-sans">minutes</div>
                              </div>
                              <div className="bg-zinc-900/80 border border-zinc-850/40 rounded-xl px-2.5 py-2 min-w-[55px] sm:min-w-[65px]">
                                <div 
                                  className={`text-base sm:text-lg font-black ${
                                    isOverdue ? "text-rose-500 animate-pulse" : isCloseDeadline ? "text-orange-500 animate-pulse" : "text-emerald-400"
                                  }`}
                                >
                                  {pad(seconds)}
                                </div>
                                <div className="text-[8px] uppercase tracking-wider text-zinc-500 font-sans">seconds</div>
                              </div>
                            </div>
                          </div>

                          {/* Quick Action Button */}
                          <div className="pt-2 border-t border-zinc-900 flex flex-col gap-2">
                            <div className="flex gap-2">
                              <button
                                onClick={async () => {
                                  await handlePromoteTaskToFirst(nextDeadlineTask.id);
                                  setIsClockExpanded(false);
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-red-600/20 to-amber-600/20 hover:from-red-600/35 hover:to-amber-600/35 text-red-400 hover:text-red-300 font-bold text-[11px] flex items-center justify-center gap-1.5 border border-red-500/20 transition-all active:scale-95 cursor-pointer"
                                title="Instantly set importance to high and move to top of the dashboard order"
                                id="clock-promote-first-btn"
                              >
                                <Zap className="h-3.5 w-3.5 text-amber-500 animate-pulse" />
                                <span>Promote to First</span>
                              </button>

                              <button
                                onClick={() => {
                                  handleViewPlan(nextDeadlineTask.id);
                                  setIsClockExpanded(false);
                                }}
                                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-semibold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/5 transition-all active:scale-95"
                              >
                                <Cpu className="h-3.5 w-3.5" />
                                <span>Tactical AI Plan</span>
                              </button>
                            </div>

                            <button
                              onClick={() => setIsClockExpanded(false)}
                              className="w-full py-2 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white transition-all cursor-pointer text-xs"
                            >
                              Collapse
                            </button>
                          </div>
                        </>
                      );
                    })() : (
                      <div className="text-center py-4 space-y-2">
                        <Check className="h-8 w-8 text-emerald-500 mx-auto bg-emerald-500/10 p-1.5 rounded-full" />
                        <h4 className="font-bold text-white text-xs">All Milestones Secured</h4>
                        <p className="text-zinc-500 text-[10px] px-2">No active upcoming deadlines are registered. Add a task to initiate countdown monitoring.</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle (Dark/Light) */}
            <button
              onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer flex items-center justify-center h-8 w-8 active:scale-95"
              title={theme === "dark" ? "Switch to Light Theme" : "Switch to Dark Theme"}
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 text-amber-500" />
              ) : (
                <Moon className="h-4 w-4 text-purple-400" />
              )}
            </button>

            {/* Quick manual lock button */}
            {pinCode && isPinEnabled && (
              <button
                onClick={handleLockApp}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-850 hover:bg-zinc-800 text-red-400 hover:text-red-300 transition-all cursor-pointer flex items-center justify-center h-8 w-8 active:scale-95"
                title="Lock Application Screen"
              >
                <Lock className="h-4 w-4 animate-pulse" />
              </button>
            )}

            {/* Google Authentication state */}
            {user ? (
              <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-850 px-3 py-1 rounded-xl">
                <span className="text-[10px] text-zinc-400 font-mono font-semibold hidden sm:inline">{user.email}</span>
                <button 
                  onClick={handleLogout}
                  className="text-zinc-400 hover:text-white transition flex items-center gap-1 cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="bg-purple-500 hover:bg-purple-400 text-white font-bold py-1.5 px-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-500/10 transition"
              >
                <LogIn className="h-3.5 w-3.5" />
                Connect Calendar
              </button>
            )}
          </div>
        </div>
      </header>

      {/* GLOBAL ALERTS CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <AnimatePresence>
          {apiWarning && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-amber-500/10 border border-amber-500/20 p-3.5 rounded-xl text-amber-300 text-xs flex items-start gap-2.5 relative"
              id="warning-alert-banner"
            >
              <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Advisory:</span>
                <p>{apiWarning}</p>
              </div>
              <button 
                onClick={() => setApiWarning(null)} 
                className="text-zinc-500 hover:text-white font-semibold cursor-pointer shrink-0 ml-2"
              >
                Dismiss
              </button>
            </motion.div>
          )}

          {activeUnprioritized.length > 0 && !isLoadingPriorities && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-850 p-3.5 rounded-xl text-zinc-300 text-xs flex items-center justify-between gap-4 mt-2"
              id="pending-analysis-banner"
            >
              <span className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500 shrink-0" />
                <span>You have <strong>{activeUnprioritized.length}</strong> raw initiatives unmapped by the Gemini prioritizer.</span>
              </span>
              <button
                onClick={handlePrioritizeAll}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-xs transition-colors shrink-0 cursor-pointer"
              >
                Map with Gemini AI
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* EMERGENCY CRISIS PROTOCOL INTERCEPT HUD */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2">
        <PanicButton tasks={bufferedTasks} onCompleteTask={handleCompleteTaskFromPanic} />
      </div>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6" id="primary-app-layout">
        <div className="space-y-8">
          
          {/* NAVIGATION BAR - Sleek Stitch theme styling */}
          <div className="flex border-b border-zinc-900 overflow-x-auto scrollbar-none" id="primary-app-navigation">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "dashboard" 
                  ? "border-amber-500 text-amber-400" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab("add_task")}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "add_task" 
                  ? "border-amber-500 text-amber-400" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <PlusCircle className="h-4 w-4" />
              Add Task
            </button>
            <button
              onClick={() => setActiveTab("agent_plan")}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "agent_plan" 
                  ? "border-amber-500 text-amber-400" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Cpu className="h-4 w-4" />
              Agent Plan
            </button>
            <button
              onClick={() => setActiveTab("calendar_sync")}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "calendar_sync" 
                  ? "border-amber-500 text-amber-400" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Calendar Sync
            </button>
            <button
              onClick={() => setActiveTab("insights")}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "insights" 
                  ? "border-amber-500 text-amber-400" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Award className="h-4 w-4" />
              Insights
            </button>
            <button
              onClick={() => setActiveTab("habits")}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "habits" 
                  ? "border-amber-500 text-amber-400" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Heart className="h-4 w-4" />
              Habits
            </button>
            <button
              onClick={() => setActiveTab("buffer_shield")}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                activeTab === "buffer_shield" 
                  ? "border-amber-500 text-amber-400" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Shield className="h-4 w-4" />
              Buffer Shield
            </button>
          </div>

          {/* VIEWS CONTROLLER */}
          <div className="min-h-[400px]" id="views-viewport">
            <AnimatePresence mode="wait">
              {activeTab === "dashboard" && (
                <motion.div
                  key="dashboard-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <Dashboard 
                    tasks={bufferedTasks}
                    habits={habits}
                    onHabitsChange={handleHabitsChange}
                    onTasksChange={handleTasksChange}
                    onPrioritizeAll={handlePrioritizeAll}
                    isLoadingPriorities={isLoadingPriorities}
                    onViewPlan={handleViewPlan}
                    userEmail={user ? user.email : null}
                    onLogin={handleLogin}
                    onLogout={handleLogout}
                    accessToken={accessToken}
                    currentTime={currentTime}
                    onStartFocusTask={setActiveFocusTask}
                  />
                </motion.div>
              )}

              {activeTab === "add_task" && (
                <motion.div
                  key="add-task-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <AddTask 
                    tasks={bufferedTasks}
                    onAddTask={handleAddTask}
                    onNavigateToDashboard={() => setActiveTab("dashboard")}
                  />
                </motion.div>
              )}

              {activeTab === "agent_plan" && (
                <motion.div
                  key="agent-plan-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <AgentPlan 
                    tasks={bufferedTasks}
                    onTasksChange={handleTasksChange}
                    onBreakdownTask={handleBreakdownTask}
                    isBreakingDown={isBreakingDown}
                    selectedTaskId={selectedPlanTaskId}
                    onSelectTaskId={setSelectedPlanTaskId}
                    userEmail={user?.email}
                  />
                </motion.div>
              )}

              {activeTab === "calendar_sync" && (
                <motion.div
                  key="calendar-sync-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <CalendarSync 
                    tasks={bufferedTasks}
                    habits={habits}
                    schedule={schedule}
                    onGenerateSchedule={handleGenerateSchedule}
                    isLoadingSchedule={isLoadingSchedule}
                    accessToken={accessToken}
                    onLogin={handleLogin}
                    userEmail={user?.email}
                  />
                </motion.div>
              )}

              {activeTab === "insights" && (
                <motion.div
                  key="insights-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <Insights 
                    tasks={bufferedTasks}
                    habits={habits}
                    onRestoreTask={(id) => handleToggleComplete(id, true)}
                  />
                </motion.div>
              )}

              {activeTab === "habits" && (
                <motion.div
                  key="habits-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <HabitTracker 
                    habits={habits}
                    onHabitsChange={handleHabitsChange}
                  />
                </motion.div>
              )}

              {activeTab === "buffer_shield" && (
                <motion.div
                  key="buffer-shield-panel"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.2 }}
                >
                  <BufferShield 
                    tasks={tasks}
                    bufferOffsetHours={bufferOffsetHours}
                    onSetBufferOffsetHours={handleSetBufferOffsetHours}
                    userEmail={user ? user.email : null}
                    isPinEnabled={isPinEnabled}
                    onSetPinEnabled={handleSetPinEnabled}
                    pinCode={pinCode}
                    onSetPinCode={handleSetPinCode}
                    onLockApp={handleLockApp}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* GLOBAL DISTRACTION-FREE FOCUS SESSION OVERLAY */}
      <AnimatePresence>
        {activeFocusTask && (
          <FocusSession 
            task={activeFocusTask} 
            onClose={() => setActiveFocusTask(null)} 
            onComplete={(taskId, actualMinutes) => {
              handleToggleComplete(taskId, false, actualMinutes);
              setActiveFocusTask(null);
            }} 
          />
        )}
      </AnimatePresence>

      {/* UNDO PROMOTE TOAST NOTIFICATION */}
      <AnimatePresence>
        {undoState?.visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-800 shadow-2xl px-4 py-3 rounded-2xl flex items-center gap-4 z-50 text-sm"
          >
            <div className="flex flex-col">
              <span className="text-white font-medium">Task Promoted</span>
              <span className="text-zinc-400 text-xs">Importance set to high and moved to top.</span>
            </div>
            <div className="w-px h-8 bg-zinc-800 mx-1"></div>
            <button
              onClick={handleUndoPromote}
              className="text-amber-500 font-bold hover:text-amber-400 hover:bg-amber-500/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              Undo
            </button>
            <button 
              onClick={() => {
                if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
                setUndoState(null);
              }}
              className="text-zinc-500 hover:text-zinc-300 ml-1 p-1"
            >
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GLOBALLY ACCESSIBLE VOICE FEEDBACK BANNER (SPEECH FEEDBACK) */}
      <AnimatePresence>
        {voiceFeedback && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 right-6 md:left-auto md:right-8 md:w-96 bg-zinc-950/95 border border-amber-500/40 text-amber-400 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 z-50 backdrop-blur-md"
            id="vocal-feedback-panel"
          >
            <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping shrink-0" />
            <div className="text-xs">
              <span className="font-bold block uppercase tracking-wider font-mono text-[9px] text-zinc-500 mb-0.5">DeadlineGenie Voice Feedback</span>
              <p className="font-semibold text-white leading-relaxed">"{voiceFeedback}"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GLOBAL HANDS-FREE VOICE CONTROLLER BUTTON AND HUD */}
      {voiceSpeechSupported && (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3" id="global-hands-free-voice-system">
          {/* HELP COMPANION SHEET */}
          <AnimatePresence>
            {isVoiceHelpOpen && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-zinc-950 border border-zinc-800 text-zinc-300 p-5 rounded-2xl w-80 shadow-2xl space-y-3 backdrop-blur-lg"
              >
                <div className="flex justify-between items-center border-b border-zinc-900 pb-2">
                  <h3 className="font-bold text-amber-500 text-xs tracking-wider uppercase flex items-center gap-1.5">
                    <HelpCircle className="h-4 w-4" />
                    Hands-Free Vocabulary
                  </h3>
                  <button 
                    onClick={() => setIsVoiceHelpOpen(false)}
                    className="text-zinc-500 hover:text-white transition cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="text-[11px] space-y-2 max-h-60 overflow-y-auto pr-1">
                  <div>
                    <span className="font-mono font-bold text-amber-400">"Navigate to [tab]"</span>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Go to dashboard, add task, agent plan, calendar sync, insights, or habits.</p>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-amber-400">"Start focus session"</span>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Triggers a distractions-free full-screen sprint on the highest priority task.</p>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-amber-400">"Delete task [optional name]"</span>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Deletes first active task, or target matching task.</p>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-amber-400">"Complete task [optional name]"</span>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Completes the matching task instantly.</p>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-amber-400">"Create task [task title]"</span>
                    <p className="text-zinc-500 text-[10px] mt-0.5">Instantly registers a new objective.</p>
                  </div>
                </div>
                
                <p className="text-[10px] text-zinc-600 font-mono text-center border-t border-zinc-900 pt-2">Powered by Web Speech API</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ACTIVE STATUS PANEL */}
          <AnimatePresence>
            {isVoiceActive && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bg-zinc-950/90 border border-zinc-850 py-2 px-4 rounded-xl shadow-xl flex items-center gap-2 max-w-xs text-xs"
              >
                <div className="flex gap-0.5 items-end justify-center h-2.5 w-6 shrink-0">
                  {[1, 2, 3, 4].map((v) => (
                    <div 
                      key={v}
                      className="w-0.5 bg-amber-500 rounded-full animate-bounce"
                      style={{ height: "100%", animationDuration: `${0.3 + v * 0.1}s` }}
                    />
                  ))}
                </div>
                <div className="truncate text-zinc-400 italic">
                  {voiceTranscript || "Listening..."}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN FLOATING VOICE TRIGGER */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsVoiceHelpOpen(prev => !prev)}
              className="p-3 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-white text-zinc-400 rounded-full shadow-lg transition duration-200 cursor-pointer animate-pulse"
              title="Show hands-free vocal commands directory"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </button>
            <button
              onClick={toggleGlobalVoiceControl}
              className={`p-4 rounded-full shadow-2xl border transition-all duration-300 relative group cursor-pointer ${
                isVoiceActive 
                  ? "bg-red-500/20 border-red-500 text-red-400 scale-110" 
                  : "bg-zinc-900 border-zinc-800 hover:bg-zinc-850 hover:border-amber-500/40 text-zinc-300 hover:text-amber-400"
              }`}
              id="global-hands-free-trigger"
              title={isVoiceActive ? "Turn off global voice control" : "Turn on global voice control"}
            >
              {isVoiceActive && (
                <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping pointer-events-none" />
              )}
              {isVoiceActive ? <Mic className="h-5 w-5 animate-pulse" /> : <MicOff className="h-5 w-5" />}
            </button>
          </div>
        </div>
      )}

      {/* FOOTER COOLDOWN & INFO */}
      <footer className="border-t border-zinc-900 bg-zinc-950 mt-16 py-8" id="site-footer">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-600 flex items-center gap-2">
            <span>DeadlineGenie AI Companion applet. All focus systems locked.</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleClearEverything}
              className="text-zinc-600 hover:text-red-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              id="system-reset-btn"
            >
              <PowerOff className="h-3.5 w-3.5" />
              Reset System Data
            </button>
          </div>
        </div>
      </footer>

      {/* FULL-SCREEN PIN LOCK INTERCEPT */}
      <AnimatePresence>
        {isPinEnabled && pinCode && isAppLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
          >
            <AppLockScreen 
              correctPin={pinCode} 
              onUnlock={() => setIsAppLocked(false)} 
              userEmail={user ? user.email : null} 
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
