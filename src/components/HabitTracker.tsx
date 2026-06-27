import React, { useState } from "react";
import { Habit } from "../types";
import { Plus, Flame, CheckCircle, Circle, Trash2, ShieldCheck, Award, Gift, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface HabitTrackerProps {
  habits: Habit[];
  onHabitsChange: (habits: Habit[]) => void;
}

const DAYS_OF_WEEK = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const SUGGESTIONS = [
  { name: "Inbox Zero Sweep", desc: "Flush cognitive backlogs." },
  { name: "1L Hydration Core", desc: "Physical energy baseline." },
  { name: "Stretch & Posture reset", desc: "Anti-fatigue realignment." },
  { name: "Daily Blueprint Review", desc: "Confirm tactical timeline." },
  { name: "Digital Detox Hour", desc: "Disconnect distraction sources." }
];

export default function HabitTracker({
  habits,
  onHabitsChange
}: HabitTrackerProps) {
  const [newHabitName, setNewHabitName] = useState("");

  const handleAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name: newHabitName.trim(),
      frequency: "daily",
      completedDates: [],
      streak: 0
    };

    onHabitsChange([...habits, newHabit]);
    setNewHabitName("");
  };

  const handleAddSuggested = (name: string) => {
    if (habits.some(h => h.name.toLowerCase() === name.toLowerCase())) return;
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      frequency: "daily",
      completedDates: [],
      streak: 0
    };
    onHabitsChange([...habits, newHabit]);
  };

  const handleToggleHabitToday = (id: string) => {
    const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    
    onHabitsChange(habits.map(habit => {
      if (habit.id === id) {
        let dates = [...habit.completedDates];
        let streak = habit.streak;

        if (dates.includes(todayStr)) {
          // Remove completion for today
          dates = dates.filter(d => d !== todayStr);
          streak = calculateStreak(dates);
        } else {
          // Add completion for today
          dates.push(todayStr);
          streak = calculateStreak(dates);
        }

        return {
          ...habit,
          completedDates: dates,
          streak
        };
      }
      return habit;
    }));
  };

  const handleDeleteHabit = (id: string) => {
    onHabitsChange(habits.filter(h => h.id !== id));
  };

  // Helper to calculate streaks
  const calculateStreak = (dates: string[]): number => {
    if (dates.length === 0) return 0;
    
    const sortedDates = [...dates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const checkDate = new Date(today);
    
    // Check if completed today or yesterday to continue streak
    const todayStr = checkDate.toISOString().split("T")[0];
    const yesterday = new Date(checkDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    
    if (!sortedDates.includes(todayStr) && !sortedDates.includes(yesterdayStr)) {
      return 0;
    }

    // Loop backwards and check consecutive days
    let cursor = sortedDates.includes(todayStr) ? new Date(today) : new Date(yesterday);
    
    while (true) {
      const cursorStr = cursor.toISOString().split("T")[0];
      if (sortedDates.includes(cursorStr)) {
        currentStreak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }

    return currentStreak;
  };

  // Helper to generate the last 30 days
  const get30Days = () => {
    const dates = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push({
        dateStr: d.toISOString().split("T")[0],
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString("en-US", { month: "short" }),
        raw: d
      });
    }
    return dates;
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const last30Days = get30Days();
  const firstDayOfWeek = last30Days[0].raw.getDay(); // index 0-6 for oldest day
  const paddingArray = Array.from({ length: firstDayOfWeek });

  return (
    <div className="space-y-6" id="habit-tracker-section">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-cyan-400" />
          Friction-Reduction Habits
        </h2>
        <p className="text-zinc-400 text-sm mt-1">Sustain mini habits (detox, check-ins, hydration) to buffer your energy during deep crunches.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* ADD HABIT FORM & SUGGESTIONS (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500/40 to-transparent" />
            
            <h3 className="text-base font-medium text-white mb-3">Install Habit Loop</h3>
            
            <form onSubmit={handleAddHabit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Habit Command Name</label>
                <input
                  type="text"
                  value={newHabitName}
                  onChange={e => setNewHabitName(e.target.value)}
                  placeholder="e.g. Inbox Zero check-in, 1L Water..."
                  className="w-full bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
                  required
                  id="habit-name-input"
                />
              </div>

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-cyan-400 font-medium text-xs rounded-lg border border-zinc-700 transition-colors cursor-pointer"
                id="submit-habit-btn"
              >
                <Plus className="h-3.5 w-3.5" />
                Activate Routine
              </button>
            </form>
          </div>

          {/* SUGGESTION ENGINE */}
          <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-xl p-5 space-y-3 shadow-md">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-cyan-400" />
              Pre-Configured Loops
            </h4>
            <div className="space-y-2">
              {SUGGESTIONS.map((sug) => {
                const alreadyEnrolled = habits.some(h => h.name.toLowerCase() === sug.name.toLowerCase());
                return (
                  <button
                    key={sug.name}
                    disabled={alreadyEnrolled}
                    onClick={() => handleAddSuggested(sug.name)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex justify-between items-center ${
                      alreadyEnrolled 
                        ? "bg-zinc-950/40 border-zinc-900 text-zinc-600 cursor-not-allowed" 
                        : "bg-zinc-950/80 border-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white cursor-pointer"
                    }`}
                  >
                    <div>
                      <span className="font-semibold block">{sug.name}</span>
                      <span className="text-[10px] text-zinc-500">{sug.desc}</span>
                    </div>
                    {!alreadyEnrolled && <Plus className="h-3.5 w-3.5 text-cyan-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* LIST HABITS WITH HEATMAP INTEGRATION (8 cols) */}
        <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 shadow-xl" id="habits-list-card">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-medium text-white">Active Habit Blueprints</h3>
            <div className="flex items-center gap-3 text-xs text-zinc-500 font-mono">
              <span className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-cyan-400 rounded-sm" /> Completed
              </span>
              <span className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 bg-zinc-800 rounded-sm" /> Missed
              </span>
            </div>
          </div>

          {habits.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <ShieldCheck className="h-12 w-12 text-zinc-700 mx-auto" />
              <div>
                <h3 className="text-zinc-400 font-medium text-sm">No Habits Enlisted</h3>
                <p className="text-zinc-600 text-xs mt-1">Configure micro-goals or choose a pre-configured loop to launch.</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6" id="habits-grid">
              <AnimatePresence>
                {habits.map(habit => {
                  const isCompletedToday = habit.completedDates.includes(todayStr);
                  return (
                    <motion.div
                      key={habit.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      className={`border rounded-xl p-5 transition-all flex flex-col md:flex-row gap-6 justify-between items-start md:items-center ${
                        isCompletedToday 
                          ? "bg-cyan-950/10 border-cyan-500/20 shadow-inner" 
                          : "bg-zinc-900 border-zinc-800/80 hover:border-zinc-700/60"
                      }`}
                      id={`habit-card-${habit.id}`}
                    >
                      {/* Left Block: Habit State & Info */}
                      <div className="space-y-4 shrink-0 max-w-xs w-full md:w-auto">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleHabitToday(habit.id)}
                            className={`rounded-full transition-colors shrink-0 ${
                              isCompletedToday ? "text-cyan-400" : "text-zinc-600 hover:text-cyan-400"
                            }`}
                            id={`toggle-habit-${habit.id}`}
                          >
                            {isCompletedToday ? (
                              <CheckCircle className="h-7 w-7 shrink-0 fill-cyan-400/10" />
                            ) : (
                              <Circle className="h-7 w-7 shrink-0" />
                            )}
                          </button>

                          <div>
                            <h4 className={`text-base font-semibold tracking-tight transition-all ${
                              isCompletedToday ? "line-through text-zinc-500 font-normal" : "text-white"
                            }`}>
                              {habit.name}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Flame className={`h-4 w-4 ${habit.streak > 0 ? "text-orange-500 fill-orange-500/20" : "text-zinc-600"}`} />
                              <span className="text-xs font-mono font-bold text-zinc-400">
                                Streak: {habit.streak} days
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Streak reward and badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          {habit.streak >= 7 ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30 text-[10px] text-amber-300 font-extrabold tracking-wide shadow-lg shadow-amber-500/5 animate-pulse">
                              <Award className="h-3 w-3 text-amber-400" />
                              🏆 7-Day Mastery Reward Active
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-950 border border-zinc-900 text-[10px] text-zinc-500 font-mono">
                              <Gift className="h-3 w-3 text-zinc-600" />
                              Next Reward: {7 - (habit.streak % 7)} days left
                            </div>
                          )}

                          <button
                            onClick={() => handleDeleteHabit(habit.id)}
                            className="p-1.5 text-zinc-600 hover:text-red-400 rounded-lg hover:bg-zinc-950/50 transition-colors"
                            id={`delete-habit-${habit.id}`}
                            title="Decommission Habit loop"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Right Block: Habit Heatmap Grid (30 days calendar-style) */}
                      <div className="bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-850/80 w-full md:w-auto">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
                            30-Day Pulse
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 text-center">
                          {/* Week headers */}
                          {DAYS_OF_WEEK.map((day) => (
                            <div key={day} className="text-[9px] font-mono font-bold text-zinc-600 w-6">
                              {day}
                            </div>
                          ))}
                          
                          {/* Padding */}
                          {paddingArray.map((_, idx) => (
                            <div key={`pad-${idx}`} className="w-6 h-6 rounded bg-transparent" />
                          ))}
                          
                          {/* Days */}
                          {last30Days.map((dayInfo) => {
                            const isCompleted = habit.completedDates.includes(dayInfo.dateStr);
                            const isToday = dayInfo.dateStr === todayStr;
                            
                            return (
                              <div
                                key={dayInfo.dateStr}
                                title={`${dayInfo.monthName} ${dayInfo.dayNum} (${dayInfo.dayName}): ${isCompleted ? 'Completed' : 'Missed'}`}
                                className={`w-6 h-6 rounded-md flex items-center justify-center text-[9px] font-mono font-semibold transition-all duration-200 cursor-help relative group ${
                                  isCompleted
                                    ? "bg-cyan-400 text-black font-extrabold shadow-sm shadow-cyan-400/20 hover:scale-110"
                                    : isToday
                                    ? "bg-zinc-900 border border-cyan-500/40 text-cyan-400 hover:border-cyan-400 font-bold"
                                    : "bg-zinc-800/50 hover:bg-zinc-700/60 text-zinc-500 hover:text-zinc-300"
                                }`}
                              >
                                {dayInfo.dayNum}
                                
                                {/* Micro Hover Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-zinc-950 text-white text-[10px] px-2.5 py-1 rounded-lg border border-zinc-800 shadow-xl whitespace-nowrap z-50 font-sans">
                                  {dayInfo.monthName} {dayInfo.dayNum}: <span className={isCompleted ? "text-cyan-400 font-bold" : "text-zinc-500"}>{isCompleted ? "Completed" : "Missed"}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
