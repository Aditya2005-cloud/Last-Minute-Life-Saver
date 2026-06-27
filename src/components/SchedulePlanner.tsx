import React, { useState } from "react";
import { Task, Habit, ScheduleItem } from "../types";
import { 
  Calendar, 
  Clock, 
  Download, 
  Eye, 
  RefreshCw, 
  Zap, 
  Coffee, 
  ShieldAlert, 
  Activity,
  Heart,
  CalendarCheck
} from "lucide-react";
import { motion } from "motion/react";

interface SchedulePlannerProps {
  tasks: Task[];
  habits: Habit[];
  schedule: ScheduleItem[];
  onGenerateSchedule: (workingHoursStart: string, workingHoursEnd: string) => Promise<void>;
  isLoadingSchedule: boolean;
}

export default function SchedulePlanner({
  tasks,
  habits,
  schedule,
  onGenerateSchedule,
  isLoadingSchedule
}: SchedulePlannerProps) {
  const [workingHoursStart, setWorkingHoursStart] = useState("08:00 AM");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("06:00 PM");

  const handleOptimize = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateSchedule(workingHoursStart, workingHoursEnd);
  };

  const handleExportICS = () => {
    if (schedule.length === 0) return;
    
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Last Minute Life Saver//Schedule//EN\n";
    const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "");
    
    schedule.forEach((item, index) => {
      const timeRegex = /(\d+):(\d+)\s*(AM|PM)/i;
      const match = item.time.match(timeRegex);
      if (match) {
        let hr = parseInt(match[1]);
        const min = match[2];
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hr < 12) hr += 12;
        if (ampm === "AM" && hr === 12) hr = 0;
        
        const hrStr = String(hr).padStart(2, "0");
        const startIso = `${todayStr}T${hrStr}${min}00`;
        
        // Compute approximate end time based on duration
        const todayDateStr = new Date().toISOString().split("T")[0];
        const dummyStartStr = `${todayDateStr}T${hrStr}:${min}:00`;
        const startMs = new Date(dummyStartStr).getTime();
        
        let endIso = "";
        if (!isNaN(startMs)) {
          const endMs = startMs + item.durationMinutes * 60000;
          const endDate = new Date(endMs);
          
          const endHr = String(endDate.getHours()).padStart(2, "0");
          const endMin = String(endDate.getMinutes()).padStart(2, "0");
          endIso = `${todayStr}T${endHr}${endMin}00`;
        } else {
          // Fallback if Date parsing is sketchy
          const fallbackEndHr = String((hr + 1) % 24).padStart(2, "0");
          endIso = `${todayStr}T${fallbackEndHr}${min}00`;
        }
        
        icsContent += "BEGIN:VEVENT\n";
        icsContent += `UID:uid_${index}_${Date.now()}@lastminutelifesaver.app\n`;
        icsContent += `DTSTAMP:${todayStr}T000000Z\n`;
        icsContent += `DTSTART;TZID=Local:${startIso}\n`;
        icsContent += `DTEND;TZID=Local:${endIso}\n`;
        icsContent += `SUMMARY:${item.activity}\n`;
        icsContent += `DESCRIPTION:${item.description.replace(/,/g, "\\,")} (Duration: ${item.durationMinutes} mins)\n`;
        icsContent += "END:VEVENT\n";
      }
    });
    
    icsContent += "END:VCALENDAR";
    
    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Crisis_Survival_Schedule_${new Date().toISOString().split('T')[0]}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTypeIcon = (type: ScheduleItem["type"]) => {
    switch (type) {
      case "focus":
        return <Zap className="h-4 w-4 text-amber-400 shrink-0" />;
      case "break":
        return <Coffee className="h-4 w-4 text-emerald-400 shrink-0" />;
      case "buffer":
        return <ShieldAlert className="h-4 w-4 text-red-400 shrink-0" />;
      case "habit":
        return <Heart className="h-4 w-4 text-cyan-400 shrink-0" />;
    }
  };

  const getTypeBadgeStyles = (type: ScheduleItem["type"]) => {
    switch (type) {
      case "focus":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "break":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "buffer":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "habit":
        return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    }
  };

  return (
    <div className="space-y-6" id="schedule-planner-section">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <CalendarCheck className="h-6 w-6 text-amber-400" />
            AI Hourly Block-Planner
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Interleave hyper-focus sessions, mental cooling reboots, and high-urgency habits.</p>
        </div>

        {schedule.length > 0 && (
          <button
            onClick={handleExportICS}
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs rounded-lg border border-zinc-700 transition-colors cursor-pointer"
            id="export-ics-btn"
          >
            <Download className="h-3.5 w-3.5" />
            Export to Google/Outlook
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* PARAMETERS PANEL (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800/80 rounded-xl p-6 shadow-xl relative overflow-hidden" id="schedule-parameters">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/40 to-transparent" />
          
          <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5 text-amber-500" />
            Sprint Parameters
          </h3>

          <form onSubmit={handleOptimize} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Start Shift</label>
              <select
                value={workingHoursStart}
                onChange={e => setWorkingHoursStart(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                id="start-shift-select"
              >
                <option value="06:00 AM">06:00 AM (Early Rise)</option>
                <option value="07:00 AM">07:00 AM</option>
                <option value="08:00 AM">08:00 AM</option>
                <option value="09:00 AM">09:00 AM (Standard)</option>
                <option value="10:00 AM">10:00 AM</option>
                <option value="11:00 AM">11:00 AM</option>
                <option value="12:00 PM">12:00 PM</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Ceasefire Shift</label>
              <select
                value={workingHoursEnd}
                onChange={e => setWorkingHoursEnd(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500 transition-all"
                id="end-shift-select"
              >
                <option value="04:00 PM">04:00 PM</option>
                <option value="05:00 PM">05:00 PM (Standard)</option>
                <option value="06:00 PM">06:00 PM</option>
                <option value="08:00 PM">08:00 PM</option>
                <option value="10:00 PM">10:00 PM</option>
                <option value="11:59 PM">11:59 PM (Midnight Oil)</option>
              </select>
            </div>

            <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/80 text-xs text-zinc-400 space-y-2">
              <span className="font-semibold text-zinc-300 block">System Feeds Detected:</span>
              <div className="flex items-center justify-between">
                <span>Active deadlined tasks:</span>
                <span className="font-mono text-amber-400 font-semibold">{tasks.filter(t => !t.completed).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Habit constraints:</span>
                <span className="font-mono text-cyan-400 font-semibold">{habits.length}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoadingSchedule || tasks.filter(t => !t.completed).length === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-semibold text-sm rounded-lg border border-transparent shadow-lg shadow-orange-500/15 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              id="optimize-schedule-submit"
            >
              {isLoadingSchedule ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-black" />
                  Generating Chrono Plan...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 fill-current text-black" />
                  Optimize Day Architecture
                </>
              )}
            </button>
          </form>
        </div>

        {/* TIMELINE DISPLAY (8 cols) */}
        <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-6 shadow-xl" id="schedule-timeline-container">
          {schedule.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <Calendar className="h-12 w-12 text-zinc-700 mx-auto animate-pulse" />
              <div>
                <h3 className="text-zinc-400 font-medium">Timeline currently offline</h3>
                <p className="text-zinc-600 text-xs max-w-sm mx-auto mt-1">
                  Click 'Optimize Day Architecture' to let Gemini allocate your hours and configure deep buffer margins.
                </p>
              </div>
            </div>
          ) : (
            <div className="relative border-l-2 border-zinc-800 ml-4 pl-6 space-y-6" id="schedule-timeline">
              {schedule.map((item, index) => (
                <div key={index} className="relative group" id={`schedule-item-${index}`}>
                  {/* Timeline Circle Marker */}
                  <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border bg-zinc-950 flex items-center justify-center transition-colors group-hover:scale-110 ${
                    item.type === "focus" ? "border-amber-500" :
                    item.type === "break" ? "border-emerald-500" :
                    item.type === "buffer" ? "border-red-500" : "border-cyan-500"
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      item.type === "focus" ? "bg-amber-500" :
                      item.type === "break" ? "bg-emerald-500" :
                      item.type === "buffer" ? "bg-red-500" : "bg-cyan-500"
                    }`} />
                  </div>

                  {/* Schedule Card */}
                  <div className="bg-zinc-900 hover:bg-zinc-850/80 border border-zinc-800/80 rounded-xl p-4 transition-all hover:translate-x-1 duration-200">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs text-zinc-400 bg-zinc-950 px-2 py-1 rounded border border-zinc-850 flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-zinc-500" />
                          {item.time}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 border rounded uppercase tracking-wider font-mono ${getTypeBadgeStyles(item.type)}`}>
                          {item.type}
                        </span>
                      </div>
                      <span className="text-zinc-500 text-xs font-medium">{item.durationMinutes} mins</span>
                    </div>

                    <h4 className="text-sm font-semibold text-white mt-3 flex items-center gap-2">
                      {getTypeIcon(item.type)}
                      {item.activity}
                    </h4>

                    {item.description && (
                      <p className="text-zinc-400 text-xs mt-1.5 pl-6 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
