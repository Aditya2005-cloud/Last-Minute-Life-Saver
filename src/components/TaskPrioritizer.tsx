import React, { useState } from "react";
import { Task, TaskBreakdown } from "../types";
import {
  AlertTriangle,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Zap,
  CheckCircle2,
  Circle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Play,
  Compass,
  LayoutGrid,
  ListTodo,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TaskPrioritizerProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onPrioritizeAll: () => Promise<void>;
  isLoadingPriorities: boolean;
  onBreakdownTask: (taskId: string) => Promise<void>;
  isBreakingDown: Record<string, boolean>;
}

export default function TaskPrioritizer({
  tasks,
  onTasksChange,
  onPrioritizeAll,
  isLoadingPriorities,
  onBreakdownTask,
  isBreakingDown,
}: TaskPrioritizerProps) {
  // Task Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [importance, setImportance] = useState<"high" | "medium" | "low">(
    "medium",
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState(45);
  const [category, setCategory] = useState("Work");

  // Local UI state
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"matrix" | "list">("matrix");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: title.trim(),
      description: description.trim(),
      dueDate:
        dueDate || new Date(Date.now() + 86400000).toISOString().split("T")[0],
      importance,
      estimatedMinutes: Number(estimatedMinutes) || 45,
      category,
      completed: false,
      orderIndex: 0,
    };

    // Update orderIndex of all other tasks sequentially
    const updated = [newTask, ...tasks].map((t, idx) => ({
      ...t,
      orderIndex: idx,
    }));

    onTasksChange(updated);
    setTitle("");
    setDescription("");
    setDueDate("");
    setImportance("medium");
    setEstimatedMinutes(45);
  };

  const handleDelete = (id: string) => {
    onTasksChange(tasks.filter((t) => t.id !== id));
    if (expandedTaskId === id) setExpandedTaskId(null);
  };

  const toggleComplete = (id: string) => {
    onTasksChange(
      tasks.map((t) => {
        if (t.id === id) {
          return { ...t, completed: !t.completed };
        }
        return t;
      }),
    );
  };

  const toggleSubtask = (
    taskId: string,
    stepIndex: number,
    subtaskText: string,
  ) => {
    onTasksChange(
      tasks.map((t) => {
        if (t.id === taskId && t.breakdown) {
          const steps = [...t.breakdown.tacticalSteps];
          const step = { ...steps[stepIndex] };
          const completed = step.completedChecklist || [];

          let newCompleted;
          if (completed.includes(subtaskText)) {
            newCompleted = completed.filter((c) => c !== subtaskText);
          } else {
            newCompleted = [...completed, subtaskText];
          }

          steps[stepIndex] = { ...step, completedChecklist: newCompleted };
          return { ...t, breakdown: { ...t.breakdown, tacticalSteps: steps } };
        }
        return t;
      }),
    );
  };

  // Group tasks for Eisenhower Matrix
  const getQuadrantTasks = (
    quadrant: "do_first" | "schedule" | "delegate" | "eliminate",
  ) => {
    return tasks.filter(
      (t) =>
        t.matrixQuadrant === quadrant ||
        (!t.matrixQuadrant && getDefaultQuadrant(t) === quadrant),
    );
  };

  const getDefaultQuadrant = (
    task: Task,
  ): "do_first" | "schedule" | "delegate" | "eliminate" => {
    const dueTime = new Date(task.dueDate).getTime();
    const hoursLeft = (dueTime - Date.now()) / (1000 * 60 * 60);

    if (task.importance === "high" && hoursLeft < 24) return "do_first";
    if (task.importance === "high") return "schedule";
    if (hoursLeft < 24) return "delegate";
    return "eliminate";
  };

  const getPanicBadgeColor = (score: number) => {
    if (score >= 80) return "bg-red-500/10 text-red-400 border-red-500/30";
    if (score >= 50)
      return "bg-amber-500/10 text-amber-400 border-amber-500/30";
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  };

  const getUrgencyText = (score: number) => {
    if (score >= 80) return "Critical Crunch";
    if (score >= 50) return "Pressing";
    return "Sustained Velocity";
  };

  return (
    <div className="space-y-8" id="task-prioritizer-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <ListTodo className="h-6 w-6 text-amber-400" />
            Task Hub
          </h2>
          <p className="text-zinc-400 text-sm mt-1">
            Add details, score with AI, and unpack high-focus step-by-step plans.
          </p>
        </div>

        <button
          onClick={onPrioritizeAll}
          disabled={isLoadingPriorities || tasks.length === 0}
          className="relative inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-semibold text-sm rounded-lg transition-all duration-200 shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed group overflow-hidden"
          id="ai-prioritize-btn"
        >
          {isLoadingPriorities ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Recalculating Matrix...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 fill-current animate-pulse" />
              AI Hyper-Prioritize ({tasks.length})
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* TASK CREATOR (4 cols) */}
        <div
          className="lg:col-span-4 bg-zinc-900 border border-zinc-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden"
          id="task-creation-card"
        >
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/40 via-orange-500/40 to-transparent" />

          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5 text-amber-500" />
            Log New Initiative
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                What needs doing?
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Finish physics lab write-up..."
                className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                required
                id="task-title-input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                Context & Details (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Include graphs and citations for Chapter 4..."
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all resize-none"
                id="task-desc-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Deadline
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  id="task-duedate-input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Est. Minutes
                </label>
                <input
                  type="number"
                  value={estimatedMinutes}
                  onChange={(e) =>
                    setEstimatedMinutes(Math.max(5, Number(e.target.value)))
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  min="5"
                  required
                  id="task-duration-input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Importance
                </label>
                <select
                  value={importance}
                  onChange={(e) => setImportance(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  id="task-importance-select"
                >
                  <option value="high" className="bg-zinc-900 text-white">
                    🔥 High Priority
                  </option>
                  <option value="medium" className="bg-zinc-900 text-white">
                    ⚡ Medium Priority
                  </option>
                  <option value="low" className="bg-zinc-900 text-white">
                    ☕ Low Priority
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Work, Study"
                  className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  id="task-category-input"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-sm rounded-lg border border-zinc-700 transition-all cursor-pointer"
              id="submit-task-btn"
            >
              Add Project File
            </button>
          </form>
        </div>

        {/* TASK VIEW & GRIDS (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* TAB BAR & STATS */}
          <div
            className="flex items-center justify-between border-b border-zinc-800 pb-3"
            id="task-view-header"
          >
            <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-800/80">
              <button
                onClick={() => setActiveTab("matrix")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === "matrix"
                    ? "bg-amber-500 text-black shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
                id="view-matrix-tab"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Eisenhower Matrix
              </button>
              <button
                onClick={() => setActiveTab("list")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                  activeTab === "list"
                    ? "bg-amber-500 text-black shadow-md"
                    : "text-zinc-400 hover:text-white"
                }`}
                id="view-list-tab"
              >
                <Compass className="h-3.5 w-3.5" />
                All Initiatives ({tasks.length})
              </button>
            </div>

            <div className="text-xs text-zinc-500 flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {
                  tasks.filter((t) => !t.completed && (t.panicScore || 0) >= 70)
                    .length
                }{" "}
                High-Risk
              </span>
              <span>•</span>
              <span>
                {tasks.filter((t) => t.completed).length}/{tasks.length}{" "}
                Completed
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === "matrix" ? (
              /* EISENHOWER MATRIX VIEW */
              <motion.div
                key="matrix-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                id="eisenhower-grid-container"
              >
                {/* DO FIRST */}
                <div
                  className="bg-zinc-900/60 rounded-xl p-5 flex flex-col min-h-[240px] shadow-lg hover:shadow-red-500/5 transition-all duration-350 stitch-border"
                  id="matrix-do-first"
                >
                  <div className="flex items-center justify-between border-b border-red-500/15 pb-2 mb-3">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      1. Do Immediately
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Urgent & Important
                    </span>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[240px] pr-1">
                    {getQuadrantTasks("do_first").length === 0 ? (
                      <p className="text-xs text-zinc-600 italic py-4 text-center">
                        Clear horizon. No instant threats.
                      </p>
                    ) : (
                      getQuadrantTasks("do_first").map((task) => (
                        <TaskMiniItem
                          key={task.id}
                          task={task}
                          onToggleComplete={toggleComplete}
                          onDelete={handleDelete}
                          isExpanded={expandedTaskId === task.id}
                          onToggleExpand={() =>
                            setExpandedTaskId(
                              expandedTaskId === task.id ? null : task.id,
                            )
                          }
                          onBreakdown={onBreakdownTask}
                          isBreakingDown={isBreakingDown[task.id]}
                          toggleSubtask={toggleSubtask}
                          badgeColor={getPanicBadgeColor(task.panicScore || 80)}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* SCHEDULE */}
                <div
                  className="bg-zinc-900/60 rounded-xl p-5 flex flex-col min-h-[240px] shadow-lg hover:shadow-amber-500/5 transition-all duration-350 stitch-border"
                  id="matrix-schedule"
                >
                  <div className="flex items-center justify-between border-b border-amber-500/15 pb-2 mb-3">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-amber-500" />
                      2. Schedule Blocks
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Important but Calm
                    </span>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[240px] pr-1">
                    {getQuadrantTasks("schedule").length === 0 ? (
                      <p className="text-xs text-zinc-600 italic py-4 text-center">
                        No structural work mapped yet.
                      </p>
                    ) : (
                      getQuadrantTasks("schedule").map((task) => (
                        <TaskMiniItem
                          key={task.id}
                          task={task}
                          onToggleComplete={toggleComplete}
                          onDelete={handleDelete}
                          isExpanded={expandedTaskId === task.id}
                          onToggleExpand={() =>
                            setExpandedTaskId(
                              expandedTaskId === task.id ? null : task.id,
                            )
                          }
                          onBreakdown={onBreakdownTask}
                          isBreakingDown={isBreakingDown[task.id]}
                          toggleSubtask={toggleSubtask}
                          badgeColor={getPanicBadgeColor(task.panicScore || 50)}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* DELEGATE */}
                <div
                  className="bg-zinc-900/60 rounded-xl p-5 flex flex-col min-h-[240px] shadow-lg hover:shadow-blue-500/5 transition-all duration-350 stitch-border"
                  id="matrix-delegate"
                >
                  <div className="flex items-center justify-between border-b border-blue-500/15 pb-2 mb-3">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-blue-400" />
                      3. Offload / Automate
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Urgent but Low Impact
                    </span>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[240px] pr-1">
                    {getQuadrantTasks("delegate").length === 0 ? (
                      <p className="text-xs text-zinc-600 italic py-4 text-center">
                        No tasks designated for automation.
                      </p>
                    ) : (
                      getQuadrantTasks("delegate").map((task) => (
                        <TaskMiniItem
                          key={task.id}
                          task={task}
                          onToggleComplete={toggleComplete}
                          onDelete={handleDelete}
                          isExpanded={expandedTaskId === task.id}
                          onToggleExpand={() =>
                            setExpandedTaskId(
                              expandedTaskId === task.id ? null : task.id,
                            )
                          }
                          onBreakdown={onBreakdownTask}
                          isBreakingDown={isBreakingDown[task.id]}
                          toggleSubtask={toggleSubtask}
                          badgeColor={getPanicBadgeColor(task.panicScore || 35)}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* ELIMINATE */}
                <div
                  className="bg-zinc-900/60 rounded-xl p-5 flex flex-col min-h-[240px] shadow-lg hover:shadow-zinc-500/5 transition-all duration-350 stitch-border"
                  id="matrix-eliminate"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Trash2 className="h-3.5 w-3.5 text-zinc-500" />
                      4. Minimize Noise
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Neither / Backburner
                    </span>
                  </div>
                  <div className="space-y-2 flex-1 overflow-y-auto max-h-[240px] pr-1">
                    {getQuadrantTasks("eliminate").length === 0 ? (
                      <p className="text-xs text-zinc-600 italic py-4 text-center">
                        Backburner list is pristine.
                      </p>
                    ) : (
                      getQuadrantTasks("eliminate").map((task) => (
                        <TaskMiniItem
                          key={task.id}
                          task={task}
                          onToggleComplete={toggleComplete}
                          onDelete={handleDelete}
                          isExpanded={expandedTaskId === task.id}
                          onToggleExpand={() =>
                            setExpandedTaskId(
                              expandedTaskId === task.id ? null : task.id,
                            )
                          }
                          onBreakdown={onBreakdownTask}
                          isBreakingDown={isBreakingDown[task.id]}
                          toggleSubtask={toggleSubtask}
                          badgeColor={getPanicBadgeColor(task.panicScore || 10)}
                        />
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* REGULAR LIST VIEW */
              <motion.div
                key="list-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
                id="flat-task-list"
              >
                {tasks.length === 0 ? (
                  <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-12 text-center">
                    <HelpCircle className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                    <h3 className="text-zinc-400 font-medium">
                      No deadlines recorded
                    </h3>
                    <p className="text-zinc-600 text-xs mt-1">
                      Use the panel on the left to file your first task.
                    </p>
                  </div>
                ) : (
                  tasks.map((task) => (
                    <TaskMiniItem
                      key={task.id}
                      task={task}
                      onToggleComplete={toggleComplete}
                      onDelete={handleDelete}
                      isExpanded={expandedTaskId === task.id}
                      onToggleExpand={() =>
                        setExpandedTaskId(
                          expandedTaskId === task.id ? null : task.id,
                        )
                      }
                      onBreakdown={onBreakdownTask}
                      isBreakingDown={isBreakingDown[task.id]}
                      toggleSubtask={toggleSubtask}
                      badgeColor={getPanicBadgeColor(
                        task.panicScore ||
                          (task.importance === "high" ? 75 : 40),
                      )}
                      showCategory
                    />
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/* HELPER COMPONENT FOR GRID ITEMS AND ACCORDION DETAILS */
interface TaskMiniItemProps {
  key?: string;
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onBreakdown: (id: string) => Promise<void>;
  isBreakingDown: boolean;
  toggleSubtask: (
    taskId: string,
    stepIndex: number,
    subtaskText: string,
  ) => void;
  badgeColor: string;
  showCategory?: boolean;
}

function TaskMiniItem({
  task,
  onToggleComplete,
  onDelete,
  isExpanded,
  onToggleExpand,
  onBreakdown,
  isBreakingDown,
  toggleSubtask,
  badgeColor,
  showCategory = false,
}: TaskMiniItemProps) {
  // Calculate checklist progress
  let totalSteps = 0;
  let completedSteps = 0;
  if (task.breakdown && task.breakdown.tacticalSteps) {
    task.breakdown.tacticalSteps.forEach((step) => {
      totalSteps += step.checklist.length;
      completedSteps += (step.completedChecklist || []).length;
    });
  }
  const progressPercent =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <motion.div
      layout
      whileHover={{ y: -2, scale: 1.01 }}
      className={`border rounded-lg p-3.5 transition-all duration-300 shadow-md ${
        task.completed
          ? "bg-zinc-950/40 border-zinc-900/60 opacity-60 hover:shadow-none"
          : "bg-zinc-900/90 border-zinc-800/80 hover:border-zinc-700/60 hover:shadow-[0_0_15px_rgba(245,158,11,0.04)]"
      }`}
      id={`task-card-${task.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => onToggleComplete(task.id)}
          className="mt-0.5 text-zinc-500 hover:text-amber-400 transition-colors cursor-pointer"
          id={`toggle-complete-${task.id}`}
        >
          {task.completed ? (
            <CheckCircle2 className="h-4.5 w-4.5 text-amber-500" />
          ) : (
            <Circle className="h-4.5 w-4.5" />
          )}
        </button>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onToggleExpand}>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium ${task.completed ? "line-through text-zinc-500" : "text-white"}`}
            >
              {task.title}
            </span>
            {showCategory && (
              <span className="text-[10px] bg-zinc-850 px-1.5 py-0.5 rounded text-zinc-400 font-mono">
                {task.category}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {task.estimatedMinutes} mins
            </span>
            {task.panicScore !== undefined && (
              <span
                className={`px-1.5 py-0.2 border rounded text-[10px] font-semibold ${badgeColor}`}
              >
                Panic Index: {task.panicScore}
              </span>
            )}
          </div>

          {totalSteps > 0 && (
            <div
              className="mt-2.5 space-y-1"
              id={`task-progress-container-${task.id}`}
            >
              <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                <span>Plan Progress</span>
                <span className="font-semibold text-amber-400">
                  {completedSteps}/{totalSteps} Steps ({progressPercent}%)
                </span>
              </div>
              <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-900">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleExpand}
            className="p-1 text-zinc-400 hover:text-white rounded transition-colors cursor-pointer"
            id={`toggle-expand-btn-${task.id}`}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-1 text-zinc-500 hover:text-red-400 rounded transition-colors cursor-pointer"
            id={`delete-task-btn-${task.id}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ACCORDION EXPANSION FOR SUBTASKS & AI TIPS */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mt-3 pt-3 border-t border-zinc-800/80 text-xs"
            id={`task-expanded-${task.id}`}
          >
            {task.description && (
              <p className="text-zinc-400 mb-3 bg-zinc-950 p-2 rounded border border-zinc-850">
                {task.description}
              </p>
            )}

            {task.aiReasoning && (
              <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/10 p-2.5 rounded-lg mb-4 text-[11px] text-amber-300">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <span>
                  <strong>AI Strategist Tip:</strong> {task.aiReasoning}
                </span>
              </div>
            )}

            {/* ACTION PLAN SECTION */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-zinc-300 uppercase tracking-wider text-[10px]">
                  Autonomous Survival Guide
                </h4>
                {!task.breakdown && (
                  <button
                    onClick={() => onBreakdown(task.id)}
                    disabled={isBreakingDown}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold rounded text-[10px] transition-colors cursor-pointer"
                    id={`generate-plan-${task.id}`}
                  >
                    {isBreakingDown ? (
                      <>
                        <div className="w-2.5 h-2.5 border border-black border-t-transparent rounded-full animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Play className="h-2.5 w-2.5 fill-current" />
                        Generate Step-by-Step Blueprint
                      </>
                    )}
                  </button>
                )}
              </div>

              {task.breakdown ? (
                <div className="bg-zinc-950 border border-zinc-850 rounded-lg p-3 space-y-4">
                  {/* Immediate Action Alert */}
                  <div className="bg-red-500/10 border border-red-500/20 p-2 rounded text-red-400 font-medium">
                    🔥 <strong>Instant Next Action:</strong>{" "}
                    {task.breakdown.immediateFirstStep}
                  </div>

                  {/* Plan Steps */}
                  <div className="space-y-3">
                    <span className="text-[10px] text-zinc-500 font-mono tracking-wide uppercase block">
                      Execution Stages:
                    </span>
                    {task.breakdown.tacticalSteps.map((step, stepIdx) => (
                      <div
                        key={stepIdx}
                        className="space-y-1.5 border-l border-zinc-800 pl-3.5 relative ml-1.5"
                      >
                        <div className="absolute w-2 h-2 rounded-full bg-amber-500/60 -left-[4.5px] top-1.5" />
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-zinc-300">
                            {step.title}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {step.durationMinutes} mins
                          </span>
                        </div>
                        <ul className="space-y-1 mt-1">
                          {step.checklist.map((check, checkIdx) => {
                            const isCompleted = (
                              step.completedChecklist || []
                            ).includes(check);
                            return (
                              <li
                                key={checkIdx}
                                className="flex items-start gap-2 text-zinc-400"
                              >
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleSubtask(task.id, stepIdx, check)
                                  }
                                  className="mt-0.5 text-zinc-600 hover:text-amber-500 transition-colors"
                                  id={`subtask-check-${task.id}-${stepIdx}-${checkIdx}`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-500" />
                                  ) : (
                                    <Circle className="h-3.5 w-3.5" />
                                  )}
                                </button>
                                <span
                                  className={`text-[11px] leading-relaxed ${isCompleted ? "line-through text-zinc-600" : ""}`}
                                >
                                  {check}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {/* Required Assets */}
                  <div>
                    <span className="text-[10px] text-zinc-500 font-mono tracking-wide uppercase block mb-1">
                      Pre-flight Assets Required:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {task.breakdown.requiredResources.map((res, idx) => (
                        <span
                          key={idx}
                          className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded font-mono"
                        >
                          {res}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-zinc-600 italic">
                  No breakdown computed. Deploy Gemini mapping to extract
                  milestones.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
