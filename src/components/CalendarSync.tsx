import React, { useState, useEffect } from "react";
import { Task, Habit, ScheduleItem } from "../types";
import { 
  Calendar, 
  Clock, 
  Zap, 
  RefreshCw, 
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Mail,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface CalendarSyncProps {
  tasks: Task[];
  habits: Habit[];
  schedule: ScheduleItem[];
  onGenerateSchedule: (workingHoursStart: string, workingHoursEnd: string) => Promise<void>;
  isLoadingSchedule: boolean;
  accessToken: string | null;
  onLogin: () => void;
  userEmail?: string | null;
}

export interface ExternalCalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string;
  isExternal: boolean;
}

export default function CalendarSync({
  tasks,
  habits,
  schedule,
  onGenerateSchedule,
  isLoadingSchedule,
  accessToken,
  onLogin,
  userEmail
}: CalendarSyncProps) {
  const [workingHoursStart, setWorkingHoursStart] = useState("09:00 AM");
  const [workingHoursEnd, setWorkingHoursEnd] = useState("06:00 PM");
  
  // External events state
  const [externalEvents, setExternalEvents] = useState<ExternalCalendarEvent[]>([]);
  const [isLoadingExternal, setIsLoadingExternal] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);

  // Sync state trackers
  const [syncingItemId, setSyncingItemId] = useState<string | null>(null);
  const [syncedItemIds, setSyncedItemIds] = useState<string[]>([]);

  // Selected Date offset (for viewing different days in the week)
  const [dateOffset, setDateOffset] = useState(0);

  // Email Schedule States
  const [isEmailing, setIsEmailing] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [targetEmail, setTargetEmail] = useState(userEmail || "adityaxtyzhd@gmail.com");

  useEffect(() => {
    if (userEmail) {
      setTargetEmail(userEmail);
    }
  }, [userEmail]);

  const handleEmailSchedule = async () => {
    if (!schedule || schedule.length === 0) return;
    setIsEmailing(true);
    setEmailStatus(null);
    try {
      const scheduleHtml = schedule.map((item: ScheduleItem) => `
        <tr style="border-bottom: 1px solid #27272a;">
          <td style="padding: 12px; color: #f59e0b; font-weight: bold; font-family: monospace;">${item.time}</td>
          <td style="padding: 12px; color: #ffffff; font-weight: bold;">
            ${item.activity}
            ${item.description ? `<p style="color: #71717a; font-size: 11px; margin: 3px 0 0 0; font-weight: normal;">${item.description}</p>` : ""}
          </td>
          <td style="padding: 12px; color: #a1a1aa; font-family: monospace;">${item.durationMinutes} mins</td>
          <td style="padding: 12px;">
            <span style="background-color: ${item.type === "habit" ? "#065f46" : item.type === "focus" ? "#1e3a8a" : "#27272a"}; color: #ffffff; font-size: 10px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase;">${item.type}</span>
          </td>
        </tr>
      `).join("");

      const htmlBody = `
        <div style="background-color: #09090b; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 30px; border-radius: 16px; border: 1px solid #27272a; max-width: 650px; margin: 0 auto;">
          <div style="border-bottom: 1px solid #27272a; padding-bottom: 15px; margin-bottom: 20px;">
            <span style="color: #f59e0b; font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 1.5px; font-family: monospace;">DeadlineGenie AI Companion</span>
            <h1 style="color: #ffffff; font-size: 22px; margin: 5px 0 0 0;">Automated Focus Schedule</h1>
            <p style="color: #71717a; font-size: 13px; margin: 3px 0 0 0;">Synchronized Focus Blocks and Dynamic Routines</p>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; text-align: left;">
            <thead>
              <tr style="border-bottom: 2px solid #27272a; color: #71717a; font-size: 11px; text-transform: uppercase; font-family: monospace;">
                <th style="padding: 12px;">Time</th>
                <th style="padding: 12px;">Activity</th>
                <th style="padding: 12px;">Duration</th>
                <th style="padding: 12px;">Type</th>
              </tr>
            </thead>
            <tbody>
              ${scheduleHtml}
            </tbody>
          </table>

          <div style="border-top: 1px solid #27272a; padding-top: 15px; text-align: center;">
            <p style="color: #52525b; font-size: 11px; margin: 0;">Automated with &hearts; by DeadlineGenie AI Companion. Beat the clock, secure the bag.</p>
          </div>
        </div>
      `;

      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: targetEmail || undefined,
          subject: "DeadlineGenie: Your Optimized Focus Schedule",
          html: htmlBody
        })
      });

      if (!response.ok) throw new Error("Email dispatch failed.");
      
      setEmailStatus("Optimized focus schedule emailed successfully!");
      setTimeout(() => setEmailStatus(null), 5000);
    } catch (err: any) {
      console.error(err);
      setEmailStatus(`Email dispatch failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsEmailing(false);
    }
  };

  // Fetch Google Calendar events if accessToken is available
  const fetchGoogleCalendar = async () => {
    if (!accessToken) return;
    setIsLoadingExternal(true);
    setExternalError(null);
    try {
      const response = await fetch("/api/calendar/events", {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      if (!response.ok) {
        throw new Error(`Calendar fetch failed with status: ${response.status}`);
      }
      const data = await response.json();
      setExternalEvents(data.events || []);
    } catch (err: any) {
      console.error(err);
      setExternalError("Failed to fetch Google Calendar events. Try reconnecting your account.");
    } finally {
      setIsLoadingExternal(false);
    }
  };

  useEffect(() => {
    if (accessToken) {
      fetchGoogleCalendar();
    }
  }, [accessToken]);

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerateSchedule(workingHoursStart, workingHoursEnd);
  };

  // Sync focus block to actual Google Calendar
  const handleSyncToGoogleCalendar = async (item: ScheduleItem, index: number) => {
    if (!accessToken) {
      onLogin();
      return;
    }
    
    const uniqueId = item.taskId || `idx-${index}`;
    setSyncingItemId(uniqueId);
    try {
      // Determine dates based on today's target date
      const eventDate = new Date();
      eventDate.setDate(eventDate.getDate() + dateOffset);
      const dateStr = eventDate.toISOString().split("T")[0]; // YYYY-MM-DD

      // Parse hours/minutes from display string, e.g. "10:30 AM"
      const timeRegex = /(\d+):(\d+)\s*(AM|PM)/i;
      const match = item.time.match(timeRegex);
      if (!match) throw new Error("Invalid schedule block time format");

      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;

      // Start Date
      const startDate = new Date(eventDate);
      startDate.setHours(hours, minutes, 0, 0);

      // End Date
      const endDate = new Date(startDate.getTime() + item.durationMinutes * 60 * 1000);

      const response = await fetch("/api/calendar/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          title: item.activity,
          startTime: startDate.toISOString(),
          endTime: endDate.toISOString(),
          description: `${item.description} - Auto-scheduled by DeadlineGenie`
        })
      });

      if (!response.ok) {
        throw new Error("Failed to post focus block to Google Calendar");
      }

      setSyncedItemIds(prev => [...prev, uniqueId]);
      // Refetch calendar events to show on grid!
      fetchGoogleCalendar();
    } catch (err: any) {
      console.error(err);
      alert(`Calendar sync failed: ${err.message || "Unknown error"}`);
    } finally {
      setSyncingItemId(null);
    }
  };

  const getTargetDateLabel = () => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffset);
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case "focus": return "bg-amber-500/10 border-amber-500/35 text-amber-300";
      case "habit": return "bg-cyan-500/10 border-cyan-500/35 text-cyan-300";
      case "break": return "bg-emerald-500/10 border-emerald-500/35 text-emerald-300";
      case "buffer": return "bg-red-500/10 border-red-500/35 text-red-300";
      default: return "bg-zinc-900 border-zinc-800 text-zinc-300";
    }
  };

  return (
    <div className="space-y-8" id="calendar-sync-container">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-white flex items-center gap-2">
            <Calendar className="h-6 w-6 text-amber-500" />
            Workspace Calendar Grid
          </h2>
          <p className="text-zinc-400 text-sm mt-1">Combine physical Google Calendar meetings with automated high-velocity focus blocks.</p>
        </div>

        {accessToken && (
          <button
            onClick={fetchGoogleCalendar}
            disabled={isLoadingExternal}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 rounded-lg text-xs font-bold text-purple-400 flex items-center gap-1.5 transition duration-200 cursor-pointer disabled:opacity-50 shrink-0 self-start md:self-auto"
            id="sync-gcal-btn"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingExternal ? "animate-spin" : ""}`} />
            Refresh Calendar
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="calendar-grid-row">
        
        {/* LEFT COLUMN: Hour & Range Settings Form (4 cols) */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl space-y-6" id="calendar-settings">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-amber-500" />
            Scheduler Constraints
          </h3>

          <form onSubmit={handleCreateSchedule} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono mb-1.5">Start Limit</label>
                <select
                  value={workingHoursStart}
                  onChange={e => setWorkingHoursStart(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                >
                  <option value="07:00 AM">07:00 AM</option>
                  <option value="08:00 AM">08:00 AM</option>
                  <option value="09:00 AM">09:00 AM</option>
                  <option value="10:00 AM">10:00 AM</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-mono mb-1.5">End Limit</label>
                <select
                  value={workingHoursEnd}
                  onChange={e => setWorkingHoursEnd(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                >
                  <option value="04:00 PM">04:00 PM</option>
                  <option value="05:00 PM">05:00 PM</option>
                  <option value="06:00 PM">06:00 PM</option>
                  <option value="07:00 PM">07:00 PM</option>
                  <option value="08:00 PM">08:00 PM</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoadingSchedule || tasks.filter(t => !t.completed).length === 0}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer disabled:opacity-50"
              id="generate-blocks-btn"
            >
              {isLoadingSchedule ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4.5 w-4.5 fill-current" />
                  Generate Focus Blocks
                </>
              )}
            </button>
          </form>

          {schedule && schedule.length > 0 && (
            <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-3">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Mail className="h-3.5 w-3.5 text-amber-500" />
                Email Focus Schedule
              </h4>
              <p className="text-[10px] text-zinc-500 font-mono">Send an automated, responsive HTML agenda brief to your inbox.</p>
              
              <div className="space-y-2">
                <input
                  type="email"
                  value={targetEmail}
                  onChange={e => setTargetEmail(e.target.value)}
                  placeholder="Recipient Email"
                  className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                />
                
                <button
                  onClick={handleEmailSchedule}
                  disabled={isEmailing}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-850 text-amber-400 font-bold text-xs rounded-xl border border-zinc-800 hover:border-amber-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isEmailing ? (
                    <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Mail className="h-3.5 w-3.5" />
                  )}
                  Email Schedule Brief
                </button>
              </div>

              {emailStatus && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 rounded-lg bg-zinc-900 border border-amber-500/15 text-amber-400 text-[10px] font-mono flex items-center gap-1.5 animate-pulse"
                >
                  <div className="w-1 h-1 rounded-full bg-amber-400 animate-ping shrink-0" />
                  {emailStatus}
                </motion.div>
              )}
            </div>
          )}

          {/* Connection badge info */}
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 text-xs text-zinc-400 leading-relaxed space-y-3">
            <p className="font-semibold text-zinc-300">💡 Dynamic Integration Hint:</p>
            <p>Once focus blocks are generated, click "Sync to Google" on any block. The agent will push that item directly to your real calendar.</p>
            {!accessToken && (
              <button 
                onClick={onLogin} 
                className="w-full py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-xs font-bold rounded-lg transition cursor-pointer"
              >
                Sign In & Connect Calendar
              </button>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Weekly Overlaid Grid (8 cols) */}
        <div className="lg:col-span-8 space-y-4" id="calendar-timeline">
          
          {/* Day navigators */}
          <div className="flex items-center justify-between bg-zinc-950 border border-zinc-900 px-4 py-3 rounded-xl">
            <button
              onClick={() => setDateOffset(prev => prev - 1)}
              className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
            >
              <ChevronLeft className="h-4.5 w-4.5" />
            </button>
            <span className="font-display font-extrabold text-sm text-white">
              {getTargetDateLabel()}
            </span>
            <button
              onClick={() => setDateOffset(prev => prev + 1)}
              className="p-1.5 hover:bg-zinc-900 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
            >
              <ChevronRight className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Combine google calendar events & scheduled items */}
          <div className="bg-zinc-900/60 border border-zinc-850 rounded-2xl p-6 shadow-xl space-y-4" id="day-calendar-grid">
            
            {/* Show schedule items */}
            {schedule.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 font-mono text-xs">
                <Calendar className="h-10 w-10 text-zinc-850 mx-auto mb-3" />
                <p>No focus blocks scheduled for today.</p>
                <p className="text-[10px] text-zinc-600 mt-1">Set your constraints and click "Generate Focus Blocks" above.</p>
              </div>
            ) : (
              <div className="space-y-4" id="blocks-list">
                <span className="text-[10px] font-bold text-zinc-500 font-mono uppercase tracking-widest block mb-1">Overlaid Survival Blocks & Events</span>
                
                {/* External events warning */}
                {externalError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-xl text-xs text-red-400 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>{externalError}</span>
                  </div>
                )}

                {/* Render combined elements */}
                <div className="space-y-3.5 relative">
                  
                  {/* Google Calendar events */}
                  {accessToken && externalEvents.length > 0 && (
                    <div className="space-y-2 mb-4 p-3 bg-purple-500/5 border border-purple-500/15 rounded-xl">
                      <span className="text-[9px] font-bold text-purple-400 font-mono uppercase tracking-wider block">Google Calendar External Sync Blocks</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {externalEvents.map((evt) => (
                          <div 
                            key={evt.id}
                            className="bg-purple-950/10 border border-purple-500/25 rounded-lg p-2 text-xs flex flex-col justify-between"
                          >
                            <div>
                              <p className="font-bold text-white truncate">{evt.title}</p>
                              <p className="text-[10px] text-purple-300 font-mono mt-0.5">
                                {new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <span className="self-end inline-flex items-center gap-0.5 text-[8px] font-bold font-mono uppercase text-purple-400 mt-1.5">
                              Synced
                              <CheckCircle className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Focus blocks list */}
                  {schedule.map((item, idx) => {
                    const blockId = item.taskId || `idx-${idx}`;
                    const isSynced = syncedItemIds.includes(blockId);
                    const isSyncing = syncingItemId === blockId;

                    return (
                      <div 
                        key={idx}
                        className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition duration-200 ${getTypeStyle(item.type)}`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-zinc-400 shrink-0">
                              {item.time}
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 shrink-0" />
                            <span className="text-xs font-mono font-extrabold tracking-wider uppercase shrink-0">
                              {item.type} Block ({item.durationMinutes}m)
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white truncate mt-1">
                            {item.activity}
                          </h4>
                          <p className="text-xs text-zinc-400 leading-relaxed font-semibold">
                            {item.description}
                          </p>
                        </div>

                        {item.type === "focus" && (
                          <button
                            onClick={() => handleSyncToGoogleCalendar(item, idx)}
                            disabled={isSynced || isSyncing}
                            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold tracking-wider uppercase flex items-center gap-1 shrink-0 self-end sm:self-auto cursor-pointer transition ${
                              isSynced 
                                ? "bg-purple-500/10 text-purple-300 border border-purple-500/25" 
                                : "bg-zinc-950 hover:bg-zinc-850 text-white border border-zinc-850"
                            }`}
                          >
                            {isSyncing ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Syncing...
                              </>
                            ) : isSynced ? (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                In Calendar
                              </>
                            ) : (
                              <>
                                <Calendar className="h-3 w-3" />
                                Sync to Google
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
