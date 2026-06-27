export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  importance: "high" | "medium" | "low";
  estimatedMinutes: number;
  category: string;
  completed: boolean;
  panicScore?: number;
  matrixQuadrant?: "do_first" | "schedule" | "delegate" | "eliminate";
  aiReasoning?: string;
  breakdown?: TaskBreakdown;
  orderIndex?: number;
  completedAt?: string; // ISO date string or YYYY-MM-DD
  actualMinutes?: number; // Actual time spent on completion
}

export interface TaskBreakdown {
  estimatedMinutesTotal: number;
  tacticalSteps: {
    title: string;
    durationMinutes: number;
    checklist: string[];
    completedChecklist?: string[]; // track client completion
  }[];
  requiredResources: string[];
  immediateFirstStep: string;
  reasoningSteps?: string[]; // Chain of thought reasoning showing autonomous planning
}

export interface Habit {
  id: string;
  name: string;
  frequency: "daily" | "weekly";
  completedDates: string[]; // YYYY-MM-DD
  streak: number;
}

export interface ScheduleItem {
  time: string;
  activity: string;
  durationMinutes: number;
  type: "focus" | "break" | "buffer" | "habit";
  taskId: string | null;
  description: string;
}

export interface PepTalk {
  cheerSpeech: string;
  tacticalSprint: {
    title: string;
    durationMinutes: number;
    focusDirectives: string[];
  };
}
