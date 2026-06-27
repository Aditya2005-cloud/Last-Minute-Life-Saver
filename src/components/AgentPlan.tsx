import React, { useState, useEffect } from "react";
import { Task } from "../types";
import { 
  Zap, 
  Cpu, 
  HelpCircle, 
  ShieldCheck, 
  Compass, 
  Play, 
  CheckCircle, 
  Circle,
  Clock,
  ArrowRight,
  ListTodo,
  Mail,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";

interface AgentPlanProps {
  tasks: Task[];
  onTasksChange: (tasks: Task[]) => void;
  onBreakdownTask: (taskId: string) => Promise<void>;
  isBreakingDown: Record<string, boolean>;
  selectedTaskId: string | null;
  onSelectTaskId: (id: string | null) => void;
  userEmail?: string | null;
}

export default function AgentPlan({
  tasks,
  onTasksChange,
  onBreakdownTask,
  isBreakingDown,
  selectedTaskId,
  onSelectTaskId,
  userEmail
}: AgentPlanProps) {
  const activeTasks = tasks.filter(t => !t.completed);
  
  // Email Automation States
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState(userEmail || "adityaxtyzhd@gmail.com");

  useEffect(() => {
    if (userEmail) {
      setTargetEmail(userEmail);
    }
  }, [userEmail]);

  const handleEmailPlan = async () => {
    if (!currentTask || !currentTask.breakdown) return;
    setIsEmailing(true);
    setEmailStatus(null);
    try {
      const breakdown = currentTask.breakdown;
      const stepsHtml = (breakdown.tacticalSteps || []).map((step: any, idx: number) => `
        <div style="margin-bottom: 20px; border-left: 3px solid #f59e0b; padding-left: 15px;">
          <h3 style="color: #ffffff; margin: 0; font-size: 16px;">Phase ${idx + 1}: ${step.title} (${step.durationMinutes} mins)</h3>
          <ul style="color: #a1a1aa; margin: 5px 0 0 0; padding-left: 20px;">
            ${(step.checklist || []).map((sub: string) => `<li style="margin-bottom: 5px;">${sub}</li>`).join("")}
          </ul>
        </div>
      `).join("");

      const resourcesHtml = (breakdown.requiredResources || []).map((res: string) => `
        <span style="background-color: #18181b; color: #a1a1aa; border: 1px solid #27272a; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 11px; margin-right: 5px; display: inline-block;"># ${res}</span>
      `).join("");

      const htmlBody = `
        <div style="background-color: #09090b; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; border-radius: 16px; border: 1px solid #27272a; max-width: 600px; margin: 0 auto;">
          <div style="border-bottom: 1px solid #27272a; padding-bottom: 15px; margin-bottom: 20px;">
            <span style="color: #f59e0b; font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 1.5px; font-family: monospace;">DeadlineGenie AI Companion</span>
            <h1 style="color: #ffffff; font-size: 22px; margin: 5px 0 0 0;">Tactical Survival Game Plan</h1>
            <p style="color: #71717a; font-size: 13px; margin: 3px 0 0 0;">Objective: <strong>${currentTask.title}</strong></p>
          </div>

          <div style="background-color: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.25); padding: 15px; border-radius: 12px; margin-bottom: 25px;">
            <h4 style="color: #f59e0b; text-transform: uppercase; font-size: 11px; font-family: monospace; margin: 0 0 5px 0;">Immediate Friction-Free Step</h4>
            <p style="color: #e4e4e7; font-size: 14px; font-weight: bold; margin: 0; line-height: 1.4;">"${breakdown.immediateFirstStep}"</p>
          </div>

          <div style="margin-bottom: 25px;">
            <h4 style="color: #71717a; text-transform: uppercase; font-size: 10px; font-family: monospace; margin: 0 0 15px 0; letter-spacing: 1px;">Step-By-Step Tactical Roadmap</h4>
            ${stepsHtml}
          </div>

          ${breakdown.requiredResources && breakdown.requiredResources.length > 0 ? `
          <div style="border-top: 1px solid #27272a; padding-top: 15px; margin-bottom: 20px;">
            <h4 style="color: #71717a; text-transform: uppercase; font-size: 10px; font-family: monospace; margin: 0 0 10px 0; letter-spacing: 1px;">Required Resources</h4>
            <div>${resourcesHtml}</div>
          </div>
          ` : ""}

          <div style="border-top: 1px solid #27272a; padding-top: 15px; text-align: center;">
            <p style="color: #52525b; font-size: 11px; margin: 0;">Automated with &hearts; by DeadlineGenie AI Companion. Keep focus vectors secured.</p>
          </div>
        </div>
      `;

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: targetEmail || undefined,
          subject: `DeadlineGenie Game Plan: ${currentTask.title}`,
          html: htmlBody
        })
      });

      if (!response.ok) throw new Error("Email dispatch failed.");
      
      setEmailStatus("Game Plan dispatched successfully to your inbox!");
      setTimeout(() => setEmailStatus(null), 5000);
    } catch (err: any) {
      console.error(err);
      setEmailStatus(`Failed to send email: ${err.message || "Unknown error"}`);
    } finally {
      setIsEmailing(false);
    }
  };

  // Local state for streaming typewriter effects of reasoningSteps
  const [streamedReasoning, setStreamedReasoning] = useState<string[]>([]);
  const [currentReasoningIndex, setCurrentReasoningIndex] = useState(0);

  // Default selected task if none set
  const currentTask = tasks.find(t => t.id === selectedTaskId) || activeTasks[0] || null;

  useEffect(() => {
    if (currentTask?.id && !selectedTaskId) {
      onSelectTaskId(currentTask.id);
    }
  }, [currentTask, selectedTaskId, onSelectTaskId]);

  // Reset typewriter stream when task changes or new breakdown occurs
  useEffect(() => {
    if (currentTask?.breakdown?.reasoningSteps) {
      setStreamedReasoning([]);
      setCurrentReasoningIndex(0);
    }
  }, [currentTask?.id, currentTask?.breakdown]);

  // Typewriter stepping logic
  useEffect(() => {
    const steps = currentTask?.breakdown?.reasoningSteps;
    if (steps && currentReasoningIndex < steps.length) {
      const timer = setTimeout(() => {
        setStreamedReasoning(prev => [...prev, steps[currentReasoningIndex]]);
        setCurrentReasoningIndex(prev => prev + 1);
      }, 700); // interval between steps
      return () => clearTimeout(timer);
    }
  }, [currentTask?.breakdown, currentReasoningIndex]);

  const handleToggleSubtask = (stepIndex: number, subtaskText: string) => {
    if (!currentTask || !currentTask.breakdown) return;

    const steps = [...currentTask.breakdown.tacticalSteps];
    const step = { ...steps[stepIndex] };
    const completed = step.completedChecklist || [];
    
    let newCompleted;
    let added = false;
    if (completed.includes(subtaskText)) {
      newCompleted = completed.filter(c => c !== subtaskText);
    } else {
      newCompleted = [...completed, subtaskText];
      added = true;
    }
    
    steps[stepIndex] = { ...step, completedChecklist: newCompleted };
    
    // Update tasks
    const updatedTasks = tasks.map(t => {
      if (t.id === currentTask.id) {
        return {
          ...t,
          breakdown: {
            ...t.breakdown!,
            tacticalSteps: steps
          }
        };
      }
      return t;
    });

    onTasksChange(updatedTasks);

    // If step checked completed and all steps now complete, celebrate!
    if (added) {
      const totalSteps = steps.flatMap(s => s.checklist).length;
      const totalCompleted = steps.flatMap(s => s.completedChecklist || []).length;
      if (totalCompleted === totalSteps) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#f59e0b", "#c084fc", "#3b82f6"]
        });
      }
    }
  };

  const handleRunBreakdown = async () => {
    if (!currentTask) return;
    await onBreakdownTask(currentTask.id);
  };

  const hasBreakdown = !!currentTask?.breakdown;
  const totalSubtasks = hasBreakdown ? currentTask!.breakdown!.tacticalSteps.flatMap(s => s.checklist).length : 0;
  const completedSubtasks = hasBreakdown ? currentTask!.breakdown!.tacticalSteps.flatMap(s => s.completedChecklist || []).length : 0;
  const subtaskProgressPercent = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  return (
    <div className="space-y-8" id="agent-plan-container">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <Cpu className="h-6 w-6 text-amber-500 animate-pulse" />
          Autonomous Survival Blueprint
        </h2>
        <p className="text-zinc-400 text-sm mt-1">Break open looming objectives, view agent reasoning steps, and check off micro-checkpoints.</p>
      </div>

      {/* TASK SELECTOR PANEL */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-zinc-950 border border-zinc-900 p-4 rounded-2xl" id="plan-selector">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono mb-1">Analyze Target Initiative</label>
          <select
            value={selectedTaskId || ""}
            onChange={e => onSelectTaskId(e.target.value || null)}
            className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold cursor-pointer"
            id="plan-task-dropdown"
          >
            {activeTasks.length === 0 && <option value="">No active tasks available</option>}
            {activeTasks.map(t => (
              <option key={t.id} value={t.id}>{t.title} ({t.category})</option>
            ))}
          </select>
        </div>

        {currentTask && (
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 md:self-end shrink-0">
            <button
              onClick={handleRunBreakdown}
              disabled={isBreakingDown[currentTask.id]}
              className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-850 text-amber-400 font-bold text-xs rounded-xl border border-zinc-800 hover:border-amber-500/20 transition duration-200 cursor-pointer disabled:opacity-50 shrink-0"
              id="trigger-breakdown-btn"
            >
              {isBreakingDown[currentTask.id] ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  Unpacking Nodes...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  {hasBreakdown ? "Regenerate Blueprint" : "Generate Game Plan"}
                </span>
              )}
            </button>

            {hasBreakdown && (
              <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1 shrink-0">
                <input
                  type="email"
                  value={targetEmail}
                  onChange={e => setTargetEmail(e.target.value)}
                  placeholder="Recipient Email"
                  className="bg-transparent text-white text-xs px-2 py-1 focus:outline-none w-36 font-semibold"
                />
                <button
                  onClick={handleEmailPlan}
                  disabled={isEmailing}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-black font-bold text-[10px] rounded-lg transition duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  {isEmailing ? (
                    <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Mail className="h-3 w-3" />
                  )}
                  Email Plan
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {emailStatus && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3 rounded-xl bg-zinc-900 border border-amber-500/20 text-amber-400 text-xs font-mono flex items-center gap-2"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          {emailStatus}
        </motion.div>
      )}

      {currentTask ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="plan-grid">
          
          {/* LEFT COLUMN: Transparent Agentic Reasoning Stream (5 cols) */}
          <div className="lg:col-span-5 space-y-6" id="plan-reasoning-col">
            <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-6 relative overflow-hidden shadow-xl min-h-[250px]" id="reasoning-feed-card">
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-purple-500/30 to-transparent" />
              <div className="absolute inset-0 grid-dots opacity-10 pointer-events-none" />
              
              <div className="flex items-center gap-2 mb-4 border-b border-zinc-850 pb-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/25 flex items-center justify-center">
                  <Cpu className="h-4 w-4 text-purple-400 animate-spin" style={{ animationDuration: "12s" }} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-display">Agent Planning Trace</h4>
                  <p className="text-[10px] text-zinc-500 font-mono">Transparent chain-of-thought node stream</p>
                </div>
              </div>

              {hasBreakdown ? (
                <div className="space-y-4 font-mono text-xs text-zinc-300">
                  <AnimatePresence>
                    {streamedReasoning.map((step, idx) => (
                      <motion.div 
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-start gap-2 p-3 bg-zinc-950/80 rounded-lg border border-zinc-900"
                      >
                        <span className="text-purple-400 font-bold text-xs shrink-0">&raquo;</span>
                        <p className="leading-relaxed">{step}</p>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {currentReasoningIndex < (currentTask.breakdown?.reasoningSteps?.length || 0) && (
                    <div className="flex items-center gap-1.5 px-3 py-1 text-purple-500 font-semibold tracking-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-ping shrink-0" />
                      <span className="text-[10px]">Processing cognitive node trace...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-500 font-mono text-xs">
                  <HelpCircle className="h-8 w-8 text-zinc-700 mb-2" />
                  <p>Awaiting planning instructions.</p>
                  <p className="text-[10px] text-zinc-600 mt-1">Click "Generate Game Plan" to trigger agent reasoning models.</p>
                </div>
              )}
            </div>

            {/* QUICK START SPARKS CARD */}
            {hasBreakdown && currentTask.breakdown?.immediateFirstStep && (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/25 rounded-2xl p-5 shadow-lg relative overflow-hidden" id="immediate-spark-card">
                <span className="absolute -right-6 -bottom-6 w-20 h-20 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-1.5">
                  <Play className="h-3.5 w-3.5 fill-current text-amber-500 animate-pulse" />
                  Immediate Friction-Free Step
                </h4>
                <p className="text-zinc-200 text-sm font-bold mt-2 leading-relaxed">
                  "{currentTask.breakdown.immediateFirstStep}"
                </p>
                <p className="text-[10px] text-zinc-500 font-mono mt-1">Commit to this single action for 30 seconds to bypass cognitive paralysis.</p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Interactive Subtask Breakdown Timeline (7 cols) */}
          <div className="lg:col-span-7 space-y-6" id="plan-steps-col">
            <div className="bg-zinc-900/40 border border-zinc-850 rounded-2xl p-6 shadow-xl" id="breakdown-steps-card">
              <div className="border-b border-zinc-850 pb-4 mb-6">
                <h3 className="text-lg font-bold text-white font-display truncate">
                  Game Plan: {currentTask.title}
                </h3>
                
                {/* Visual Progress bar inside card header */}
                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between text-xs font-mono text-zinc-400 font-semibold">
                    <span>Task Completion Track</span>
                    <span>{completedSubtasks}/{totalSubtasks} Items ({subtaskProgressPercent}%)</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-850/60">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${subtaskProgressPercent}%` }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-amber-500 to-purple-500 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                    />
                  </div>
                </div>
              </div>

              {hasBreakdown ? (
                <div className="space-y-8" id="timeline-flow">
                  {currentTask.breakdown?.tacticalSteps.map((step, stepIdx) => (
                    <div key={stepIdx} className="relative pl-6 border-l border-zinc-800 space-y-3" id={`step-phase-${stepIdx}`}>
                      
                      {/* Timeline Dot Indicator */}
                      <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 border border-zinc-950 shadow-[0_0_8px_rgba(245,158,11,0.6)]" />

                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-white font-display">
                          Phase {stepIdx + 1}: {step.title}
                        </h4>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-950 text-[10px] font-mono text-zinc-400 border border-zinc-850">
                          <Clock className="h-3 w-3" />
                          {step.durationMinutes} mins
                        </span>
                      </div>

                      {/* Subtasks checklists */}
                      <div className="space-y-2">
                        {step.checklist.map((sub, subIdx) => {
                          const isDone = step.completedChecklist?.includes(sub);
                          return (
                            <div 
                              key={subIdx}
                              onClick={() => handleToggleSubtask(stepIdx, sub)}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-150 cursor-pointer ${
                                isDone 
                                  ? "bg-zinc-950/40 border-zinc-900 text-zinc-500 line-through" 
                                  : "bg-zinc-900/60 border-zinc-850/80 text-zinc-200 hover:border-amber-500/20 hover:bg-zinc-900"
                              }`}
                            >
                              <div className="shrink-0 mt-0.5 text-amber-500">
                                {isDone ? (
                                  <CheckCircle className="h-4.5 w-4.5 text-amber-500 fill-amber-500/10" />
                                ) : (
                                  <Circle className="h-4.5 w-4.5 text-zinc-600 hover:text-amber-500" />
                                )}
                              </div>
                              <span className="text-xs font-semibold leading-relaxed">{sub}</span>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  ))}

                  {/* Resource cards */}
                  {currentTask.breakdown?.requiredResources && (
                    <div className="pt-6 border-t border-zinc-850 space-y-2">
                      <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-widest block">Required Resources Checklist</span>
                      <div className="flex flex-wrap gap-2">
                        {currentTask.breakdown.requiredResources.map((res, rIdx) => (
                          <span 
                            key={rIdx} 
                            className="px-2.5 py-1 rounded bg-zinc-950 text-[10px] font-mono font-bold text-zinc-400 border border-zinc-850"
                          >
                            # {res}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-16 text-center text-zinc-500 font-mono text-xs">
                  <ListTodo className="h-10 w-10 text-zinc-800 mx-auto mb-3" />
                  <p>Survival blueprint not generated yet.</p>
                  <p className="text-[10px] text-zinc-600 mt-1">Initiate plan generation to build your step-by-step tactical sprint roadmap.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-zinc-950 border border-zinc-900 py-16 rounded-2xl text-center">
          <HelpCircle className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm font-semibold">No active initiatives available.</p>
          <p className="text-zinc-600 text-xs mt-1">Please create a new task on the Add Task screen first.</p>
        </div>
      )}
    </div>
  );
}
