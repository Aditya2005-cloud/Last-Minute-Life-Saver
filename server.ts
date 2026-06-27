import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

// Shared Gemini Client Lazy-Initialization
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not defined. AI functionality will fallback to high-quality heuristic templates.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const app = express();
app.use(express.json());

const PORT = 3000;

// HELPER: Fallback handler for requests when GEMINI_API_KEY is missing or invalid
const hasValidKey = () => !!process.env.GEMINI_API_KEY;

// -------------------------------------------------------------
// Google Calendar API Core Proxies (Syncs with OAuth)
// -------------------------------------------------------------

// Route: Get primary calendar events
app.get("/api/calendar/events", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Missing Google Calendar Authorization header" });
  }

  try {
    const timeMin = new Date().toISOString();
    const calendarUrl = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=20&singleEvents=true&orderBy=startTime`;
    
    const response = await fetch(calendarUrl, {
      headers: { "Authorization": token }
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Google Calendar Fetch failed: ${errText}` });
    }

    const data = await response.json();
    const formattedEvents = (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.summary || "Untitled Event",
      startTime: item.start?.dateTime || item.start?.date,
      endTime: item.end?.dateTime || item.end?.date,
      color: "#8b5cf6", // Purple accent
      isExternal: true
    }));

    res.json({ events: formattedEvents });
  } catch (error: any) {
    console.error("Fetch calendar events failed:", error);
    res.status(500).json({ error: error.message || "Failed to fetch calendar events" });
  }
});

// Route: Create calendar focus block event
app.post("/api/calendar/events", async (req, res) => {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ error: "Missing Google Calendar Authorization header" });
  }

  const { title, startTime, endTime, description } = req.body;
  if (!title || !startTime || !endTime) {
    return res.status(400).json({ error: "Missing title, startTime, or endTime for event creation." });
  }

  try {
    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        summary: title,
        description: description || "Scheduled by DeadlineGenie AI Companion",
        start: { dateTime: startTime },
        end: { dateTime: endTime }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Google Calendar Create failed: ${errText}` });
    }

    const data = await response.json();
    res.json({ success: true, eventId: data.id, eventUrl: data.htmlLink });
  } catch (error: any) {
    console.error("Create calendar event failed:", error);
    res.status(500).json({ error: error.message || "Failed to create calendar event." });
  }
});

// -------------------------------------------------------------
// Endpoint 1: Task Prioritization & Eisenhower Matrix classification
// -------------------------------------------------------------
app.post("/api/prioritize", async (req, res) => {
  try {
    const { tasks } = req.body;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: "Invalid or empty tasks array." });
    }

    if (!hasValidKey()) {
      // Return beautiful high-quality fallback heuristics
      const evaluated = tasks.map(task => {
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        const hoursLeft = Math.max(0.1, (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
        let panicScore = 20;
        let quadrant = "schedule";

        if (hoursLeft <= 12) {
          panicScore = 95;
          quadrant = "do_first";
        } else if (hoursLeft <= 36) {
          panicScore = 75;
          quadrant = "do_first";
        } else if (task.importance === "high") {
          panicScore = 60;
          quadrant = "schedule";
        } else if (task.importance === "low" && hoursLeft > 72) {
          panicScore = 10;
          quadrant = "eliminate";
        } else {
          panicScore = 40;
          quadrant = "delegate";
        }

        return {
          id: task.id,
          panicScore,
          matrixQuadrant: quadrant,
          aiReasoning: `Heuristic: Due in ${Math.round(hoursLeft)} hrs with ${task.importance} priority. Break into micro-milestones immediately.`,
          suggestedTimeBlockMinutes: task.estimatedMinutes || 45
        };
      });
      return res.json({ evaluated, isFallback: true });
    }

    const ai = getGeminiClient();
    const prompt = `Analyze the following tasks and calculate their "Panic Index" (0-100) based on urgency, importance, and deadlines. Categorize them into Eisenhower Matrix quadrants: 'do_first', 'schedule', 'delegate', 'eliminate'. Provide a comforting yet extremely tactical sci-fi style advisory (max 20 words) for each.

Current date/time: ${new Date().toISOString()}

Tasks:
${JSON.stringify(tasks, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            evaluated: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  panicScore: { type: Type.INTEGER, description: "A score from 0 to 100 on how critical this task is right now." },
                  matrixQuadrant: { 
                    type: Type.STRING, 
                    description: "Eisenhower Matrix Quadrant: 'do_first' (urgent & important), 'schedule' (not urgent but important), 'delegate' (urgent but not important), 'eliminate' (neither)." 
                  },
                  aiReasoning: { type: Type.STRING, description: "Brief comforting, action-focused tip (max 20 words)." },
                  suggestedTimeBlockMinutes: { type: Type.INTEGER, description: "Suggested focus block duration in minutes." }
                },
                required: ["id", "panicScore", "matrixQuadrant", "aiReasoning", "suggestedTimeBlockMinutes"]
              }
            }
          },
          required: ["evaluated"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("Prioritize Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Failed to prioritize tasks." });
  }
});

// -------------------------------------------------------------
// Endpoint 2: AI Day Scheduler / Calendar Optimizer
// -------------------------------------------------------------
app.post("/api/schedule", async (req, res) => {
  try {
    const { tasks, habits, workingHoursStart, workingHoursEnd } = req.body;
    const startHour = workingHoursStart || "09:00 AM";
    const endHour = workingHoursEnd || "05:00 PM";

    if (!hasValidKey()) {
      // Heuristic scheduler fallback
      const scheduleItems = [];
      const activeTasks = (tasks || []).filter((t: any) => !t.completed);
      const activeHabits = habits || [];

      // Add a quick morning kickoff
      scheduleItems.push({
        time: "09:00 AM",
        activity: "Morning High-Focus Alignment",
        durationMinutes: 15,
        type: "buffer",
        taskId: null,
        description: "Plan the day, review deadlines, and lock focus."
      });

      let minutesCursor = 15;
      
      activeHabits.forEach((h: any, index: number) => {
        scheduleItems.push({
          time: `${String(9 + Math.floor((minutesCursor) / 60)).padStart(2, '0')}:${String((minutesCursor) % 60).padStart(2, '0')} AM`,
          activity: `Habit: ${h.name}`,
          durationMinutes: 15,
          type: "habit",
          taskId: null,
          description: "Micro-consistency session to build daily momentum."
        });
        minutesCursor += 15;
      });

      activeTasks.slice(0, 3).forEach((task: any) => {
        const hr = 9 + Math.floor(minutesCursor / 60);
        const ampm = hr >= 12 ? "PM" : "AM";
        const displayHr = hr > 12 ? hr - 12 : hr;
        
        scheduleItems.push({
          time: `${String(displayHr).padStart(2, '0')}:${String(minutesCursor % 60).padStart(2, '0')} ${ampm}`,
          activity: `Focus Block: ${task.title}`,
          durationMinutes: task.estimatedMinutes || 45,
          type: "focus",
          taskId: task.id,
          description: `Direct focus to complete the core components of: ${task.title}`
        });
        minutesCursor += task.estimatedMinutes || 45;

        // Add break
        const breakHr = 9 + Math.floor(minutesCursor / 60);
        const breakampm = breakHr >= 12 ? "PM" : "AM";
        const breakdisplayHr = breakHr > 12 ? breakHr - 12 : breakHr;
        scheduleItems.push({
          time: `${String(breakdisplayHr).padStart(2, '0')}:${String(minutesCursor % 60).padStart(2, '0')} ${breakampm}`,
          activity: "Cognitive Reboot / Buffer",
          durationMinutes: 10,
          type: "break",
          taskId: null,
          description: "Hydrate, stretch, and let your prefrontal cortex rest."
        });
        minutesCursor += 10;
      });

      return res.json({ schedule: scheduleItems, isFallback: true });
    }

    const ai = getGeminiClient();
    const prompt = `You are an elite sci-fi AI hyper-scheduler called 'DeadlineGenie'. Create a detailed hour-by-hour day plan starting from ${startHour} to ${endHour}. 
Optimize the day for maximum performance under a heavy deadline load. Interleave intense 'focus' blocks for tasks, micro-time blocks for 'habits', short relaxing 'breaks', and proactive 'buffer' zones for last-minute emergencies.

Tasks (in priority order):
${JSON.stringify(tasks, null, 2)}

Active Habits:
${JSON.stringify(habits, null, 2)}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            schedule: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  time: { type: Type.STRING, description: "Display time, e.g., '10:30 AM'." },
                  activity: { type: Type.STRING, description: "Name of the scheduled item." },
                  durationMinutes: { type: Type.INTEGER, description: "Duration in minutes." },
                  type: { type: Type.STRING, description: "Can be 'focus', 'break', 'buffer', or 'habit'." },
                  taskId: { type: Type.STRING, description: "Task ID associated with this block, or null.", nullable: true },
                  description: { type: Type.STRING, description: "Action directive or reassurance for this block (max 15 words)." }
                },
                required: ["time", "activity", "durationMinutes", "type", "description"]
              }
            }
          },
          required: ["schedule"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("Schedule Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate schedule." });
  }
});

// -------------------------------------------------------------
// Endpoint 3: Task Breakdown / Autonomous Game Plan & Transparent Reasoning
// -------------------------------------------------------------
app.post("/api/breakdown", async (req, res) => {
  try {
    const { task } = req.body;
    if (!task) {
      return res.status(400).json({ error: "Missing task details." });
    }

    if (!hasValidKey()) {
      // Heuristic breakdown with step-by-step reasoning steps!
      return res.json({
        estimatedMinutesTotal: task.estimatedMinutes || 60,
        tacticalSteps: [
          {
            title: "Setup & Preparation",
            durationMinutes: Math.round((task.estimatedMinutes || 60) * 0.15),
            checklist: ["Silence phone & activate deep focus", "Gather all reference materials"]
          },
          {
            title: "Core Heavy Lifting",
            durationMinutes: Math.round((task.estimatedMinutes || 60) * 0.6),
            checklist: ["Draft the structural elements", "Build the raw minimum viable output first"]
          },
          {
            title: "Refinement & Polish",
            durationMinutes: Math.round((task.estimatedMinutes || 60) * 0.25),
            checklist: ["Verify against initial criteria", "Format and package for submission"]
          }
        ],
        requiredResources: ["Quiet workspace", "Primary references", "Full hydration"],
        immediateFirstStep: "Turn off notifications and open your document canvas right now.",
        reasoningSteps: [
          "Initiating cognitive optimization protocol...",
          "Analyzing deadline constraints and task complexity...",
          "Synthesizing high-velocity action checklist to bypass procrastination...",
          "Unpacking 3-phase micro-sprint blueprint for rapid execution."
        ],
        isFallback: true
      });
    }

    const ai = getGeminiClient();
    const prompt = `You are an elite micro-execution coach called 'DeadlineGenie'. Break down this task into an incredibly tactical, bite-sized survival game plan.
CRITICAL requirement: You must provide a 3-5 step 'reasoningSteps' array showing your step-by-step agentic planning process before arriving at the subtask breakdown. Make your chain-of-thought clear, transparent, and motivating.

Task to break down:
Title: ${task.title}
Description: ${task.description || "No description provided."}
Estimated Duration: ${task.estimatedMinutes || 60} mins
Category: ${task.category || "General"}
Urgency Level: ${task.importance || "medium"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            estimatedMinutesTotal: { type: Type.INTEGER },
            tacticalSteps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Milestone phase title." },
                  durationMinutes: { type: Type.INTEGER, description: "Sub-block duration in minutes." },
                  checklist: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Explicit physical or digital checkbox actions."
                  }
                },
                required: ["title", "durationMinutes", "checklist"]
              }
            },
            requiredResources: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Items, software, or mindsets required to complete this immediately."
            },
            immediateFirstStep: { type: Type.STRING, description: "The single, ultra-simple micro-action the user should take within the next 30 seconds." },
            reasoningSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3-5 conversational, comforting, step-by-step reasoning statements showing the agent's thoughts."
            }
          },
          required: ["estimatedMinutesTotal", "tacticalSteps", "requiredResources", "immediateFirstStep", "reasoningSteps"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("Breakdown Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate breakdown." });
  }
});

// -------------------------------------------------------------
// Endpoint 4: Panic Button Pep Talk & Sprint Intervention
// -------------------------------------------------------------
app.post("/api/peptalk", async (req, res) => {
  try {
    const { task, panicIntensity } = req.body;
    const taskTitle = task ? task.title : "All looming deadlines";

    if (!hasValidKey()) {
      return res.json({
        cheerSpeech: `Listen closely: Panic is just energy without a plan. You have exactly what it takes to crush "${taskTitle}" right now. Take a deep, slow breath. We are muting the noise. Focus only on the next 15 minutes. No multi-tasking. Just write, build, or solve. Let's make this happen!`,
        tacticalSprint: {
          title: "15-Minute Critical Spark Sprint",
          durationMinutes: 15,
          focusDirectives: [
            "Mute every browser tab except the workspace",
            "Write the absolute worst, ugliest draft or outline possible in 10 minutes",
            "Polish the first paragraph or line for 5 minutes"
          ]
        },
        isFallback: true
      });
    }

    const ai = getGeminiClient();
    const prompt = `The user is in a full LAST-MINUTE CRISIS for task: "${taskTitle}". Panic level is ${panicIntensity || "Extreme"}/100.
Generate an intense, high-impact tactical pep talk (max 60 words) that immediately cuts through anxiety and builds absolute confidence.
Also, design a hyper-focused "Survival Sprint" (10-30 minutes max) to initiate action IMMEDIATELY.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            cheerSpeech: { type: Type.STRING, description: "The direct, empowering, calming yet highly motivating speech text." },
            tacticalSprint: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING, description: "The name of the sprint, e.g., 'The 20-Minute Zero-Friction Sprint'." },
                durationMinutes: { type: Type.INTEGER, description: "Duration in minutes." },
                focusDirectives: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "3-4 highly specific, zero-excuse focus instructions."
                }
              },
              required: ["title", "durationMinutes", "focusDirectives"]
            }
          },
          required: ["cheerSpeech", "tacticalSprint"]
        }
      }
    });

    const result = JSON.parse(response.text || "{}");
    res.json(result);
  } catch (error: any) {
    console.error("Pep Talk Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate survival pep talk." });
  }
});

// -------------------------------------------------------------
// Endpoint: Task Nudge Generation for Urgent Tasks
// -------------------------------------------------------------
app.post("/api/nudge", async (req, res) => {
  try {
    const { taskTitle, urgency } = req.body;
    if (!taskTitle) {
      return res.status(400).json({ error: "Missing taskTitle parameter." });
    }

    if (!hasValidKey()) {
      return res.json({
        nudge: `Hey there! This is a brief active nudge for "${taskTitle}". The clock is ticking down, so let's cut through the static and lock in your focus now. You've got this!`,
        isFallback: true
      });
    }

    const ai = getGeminiClient();
    const prompt = `You are 'DeadlineGenie', an active productivity companion. The user has an urgent task: "${taskTitle}". Generate a brief, highly motivating, sharp and direct verbal nudge (max 25 words) to push them to take action immediately. Tone should be reassuring, tactical, and clear.`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const nudgeText = response.text?.trim() || `Time is running out for: ${taskTitle}. Let's take the first step now!`;
    res.json({ nudge: nudgeText });
  } catch (error: any) {
    console.error("Nudge Endpoint Error:", error);
    res.status(500).json({ error: error.message || "Failed to generate nudge." });
  }
});

// -------------------------------------------------------------
// Endpoint 5: Dynamic Genie Autonomous Command Agent (Function Calling)
// -------------------------------------------------------------
app.post("/api/agent/command", async (req, res) => {
  const { prompt, tasks, events, current_time } = req.body;
  const token = req.headers.authorization; // Retrieve client OAuth token

  if (!prompt) {
    return res.status(400).json({ error: "No prompt query provided to the Genie agent." });
  }

  try {
    if (!hasValidKey()) {
      return res.json({
        message: `I received your request: "${prompt}". To unlock my full cognitive function-calling and autonomous sync capabilities, please add your GEMINI_API_KEY in the Secrets panel. For now, try clicking the quick action buttons to experience optimized planning!`,
        toolCalled: null
      });
    }

    const ai = getGeminiClient();
    
    // Register the 5 autonomous tools as function declarations
    const systemInstruction = `You are 'DeadlineGenie', an active autonomous AI productivity agent. You don't just chat; you solve problems by selecting the correct tools to prioritize tasks, break them down, schedule calendar blocks, detect conflicts, or send motivating reminders.
Current date/time: ${current_time || new Date().toISOString()}
User Google Calendar Access: ${token ? "CONNECTED" : "DISCONNECTED"}`;

    const tools = [
      {
        functionDeclarations: [
          {
            name: "prioritize_tasks",
            description: "Rank tasks based on urgency, importance, and deadlines. Returns a list of prioritized tasks.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                tasks: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      title: { type: Type.STRING },
                      dueDate: { type: Type.STRING },
                      importance: { type: Type.STRING },
                      estimatedMinutes: { type: Type.INTEGER }
                    },
                    required: ["id", "title", "dueDate", "importance", "estimatedMinutes"]
                  }
                }
              },
              required: ["tasks"]
            }
          },
          {
            name: "break_down_task",
            description: "Break down a specific task title into a survival micro-plan with step duration in minutes.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                taskTitle: { type: Type.STRING },
                deadline: { type: Type.STRING }
              },
              required: ["taskTitle", "deadline"]
            }
          },
          {
            name: "create_calendar_event",
            description: "Create a focused calendar block on Google Calendar.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                startTime: { type: Type.STRING },
                endTime: { type: Type.STRING }
              },
              required: ["title", "startTime", "endTime"]
            }
          },
          {
            name: "detect_conflicts",
            description: "Check if a proposed schedule time blocks conflict with other existing calendar events.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                proposedTime: { type: Type.STRING }
              },
              required: ["proposedTime"]
            }
          },
          {
            name: "generate_nudge",
            description: "Generate an urgency-aware, highly motivating reminder text nudge for a task.",
            parameters: {
              type: Type.OBJECT,
              properties: {
                taskTitle: { type: Type.STRING },
                urgency: { type: Type.STRING }
              },
              required: ["taskTitle", "urgency"]
            }
          }
        ]
      }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Execute the user's request: "${prompt}". Available tasks context: ${JSON.stringify(tasks || [])}. Available calendar events context: ${JSON.stringify(events || [])}.`,
      config: {
        systemInstruction,
        tools
      }
    });

    const candidate = response.candidates?.[0];
    const functionCalls = candidate?.content?.parts?.find((part: any) => part.functionCall);

    if (functionCalls) {
      const { name, args: rawArgs } = functionCalls.functionCall;
      const args = rawArgs as any;
      console.log(`Genie invoked tool autonomously: ${name}`, args);

      // Execute tool logic
      let toolResult: any = {};
      if (name === "prioritize_tasks") {
        toolResult = { status: "success", info: "Tasks prioritizer invoked." };
      } else if (name === "break_down_task") {
        toolResult = { status: "success", info: `Breakdown requested for: ${args.taskTitle}` };
      } else if (name === "create_calendar_event") {
        if (!token) {
          toolResult = { status: "failed", reason: "Google Calendar is not authenticated. Ask the user to connect via Sign In." };
        } else {
          try {
            const calendarRes = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
              method: "POST",
              headers: {
                "Authorization": token,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                summary: args.title,
                description: "Created autonomously by your DeadlineGenie companion",
                start: { dateTime: args.startTime },
                end: { dateTime: args.endTime }
              })
            });
            if (calendarRes.ok) {
              const calData = await calendarRes.json();
              toolResult = { status: "success", eventId: calData.id, link: calData.htmlLink };
            } else {
              const err = await calendarRes.text();
              toolResult = { status: "failed", reason: err };
            }
          } catch (e: any) {
            toolResult = { status: "error", message: e.message };
          }
        }
      } else if (name === "detect_conflicts") {
        const hasConflict = (events || []).some((e: any) => {
          const start = new Date(e.startTime).getTime();
          const end = new Date(e.endTime).getTime();
          const prop = new Date(args.proposedTime).getTime();
          return prop >= start && prop < end;
        });
        toolResult = { status: "success", conflictDetected: hasConflict, info: hasConflict ? "Conflict found on this slot." : "Slot is completely open." };
      } else if (name === "generate_nudge") {
        toolResult = { status: "success", nudge: `🔥 CRUNCH TIME: The system has analyzed "${args.taskTitle}". This deadline is creeping closer. Close all tabs, lock focus, and secure this milestone now!` };
      }

      // Return tool execution output to the client
      return res.json({
        message: `I have autonomously activated my **${name}** tool to handle your request.`,
        toolCalled: {
          name,
          arguments: args,
          result: toolResult
        }
      });
    }

    res.json({
      message: response.text || "Your wish is my command. How else can I help you beat your deadlines today?",
      toolCalled: null
    });

  } catch (error: any) {
    console.error("Genie Agent Error:", error);
    res.status(500).json({ error: error.message || "Failed to route command to Genie Agent." });
  }
});

// -------------------------------------------------------------
// Endpoint 5: Email Automation Route
// -------------------------------------------------------------
app.post("/api/send-email", async (req, res) => {
  try {
    const { to, subject, html, text } = req.body;
    
    const userEmail = process.env.GMAIL_USER;
    const appPassword = process.env.GMAIL_APP_PASSWORD;

    if (!userEmail || !appPassword) {
      return res.status(400).json({ error: "Email automation configuration missing (GMAIL_USER / GMAIL_APP_PASSWORD)." });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: userEmail,
        pass: appPassword
      }
    });

    const mailOptions = {
      from: `"DeadlineGenie AI Companion" <${userEmail}>`,
      to: to || userEmail,
      subject: subject || "DeadlineGenie Tactical Update",
      text: text || "Your DeadlineGenie update is ready.",
      html: html || `<div>${text}</div>`
    };

    console.log(`Sending email to ${mailOptions.to}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);

    res.json({ success: true, messageId: info.messageId });
  } catch (error: any) {
    console.error("Email send failed:", error);
    res.status(500).json({ error: error.message || "Failed to transmit automatic email." });
  }
});

// -------------------------------------------------------------
// Endpoint 6: Fleeting Ideas & Brain-Dump Parser
// -------------------------------------------------------------
app.post("/api/parse-brain-dump", async (req, res) => {
  try {
    const { text, currentDate } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Invalid or empty brain-dump text." });
    }

    const todayStr = currentDate || new Date().toISOString().split("T")[0];

    if (!hasValidKey()) {
      // Heuristic fallback: split by lines or standard delimiters like commas or semicolons
      const lines = text
        .split(/\n|;|and also|then/)
        .map(line => line.trim())
        .filter(line => line.length > 3);

      const parsedTasks = lines.map((line, idx) => {
        // Simple heuristic for importance
        let importance: "high" | "medium" | "low" = "medium";
        if (/\b(urgent|asap|critical|important|must)\b/i.test(line)) {
          importance = "high";
        } else if (/\b(maybe|someday|low|minor|chill)\b/i.test(line)) {
          importance = "low";
        }

        // Simple heuristic for estimated minutes
        let estimatedMinutes = 30;
        const minsMatch = line.match(/(\d+)\s*(min|minute)/i);
        const hrsMatch = line.match(/(\d+)\s*(hr|hour)/i);
        if (minsMatch) {
          estimatedMinutes = parseInt(minsMatch[1], 10);
        } else if (hrsMatch) {
          estimatedMinutes = parseInt(hrsMatch[1], 10) * 60;
        }

        // Simple category deduction
        let category = "Personal";
        if (/\b(work|report|office|email|tax|meeting|client)\b/i.test(line)) {
          category = "Work";
        } else if (/\b(study|read|learn|exam|course|class)\b/i.test(line)) {
          category = "Education";
        } else if (/\b(buy|groceries|shopping|store|get)\b/i.test(line)) {
          category = "Shopping";
        } else if (/\b(gym|run|workout|health|doctor|water|hydrate)\b/i.test(line)) {
          category = "Health";
        }

        // Determine date
        let dueDate = todayStr;
        if (/\b(tomorrow)\b/i.test(line)) {
          const tomorrowDate = new Date();
          tomorrowDate.setDate(tomorrowDate.getDate() + 1);
          dueDate = tomorrowDate.toISOString().split("T")[0];
        } else if (/\b(next week)\b/i.test(line)) {
          const nextWeekDate = new Date();
          nextWeekDate.setDate(nextWeekDate.getDate() + 7);
          dueDate = nextWeekDate.toISOString().split("T")[0];
        }

        // Clean up title
        let title = line.replace(/^(remember to|need to|should|i have to|i must|please)\s+/i, "");
        title = title.charAt(0).toUpperCase() + title.slice(1);
        if (title.length > 50) {
          title = title.substring(0, 47) + "...";
        }

        return {
          id: `heuristic-${Date.now()}-${idx}`,
          title,
          description: line,
          dueDate,
          importance,
          estimatedMinutes,
          category,
          completed: false
        };
      });

      return res.json({ tasks: parsedTasks, isFallback: true });
    }

    const ai = getGeminiClient();
    const prompt = `You are an elite productivity parsing assistant. The user has provided a brain-dump of fleeting ideas and tasks.
Parse the text into distinct, actionable, and structured task objects.

Current date is: ${todayStr} (use this as a base for relative dates like 'tomorrow', 'next week', 'by Friday', etc. Format all due dates as YYYY-MM-DD).

Brain-dump text:
"${text}"

Extract the following fields for each task:
1. title: A concise, actionable title (max 45 chars).
2. description: Additional context from the text, if any.
3. dueDate: Estimated due date formatted as YYYY-MM-DD.
4. importance: "high", "medium", or "low".
5. estimatedMinutes: Integer estimation of task duration. If not specified, default to 30 or 45 based on task complexity.
6. category: A short category name like "Work", "Personal", "Health", "Finance", "Study", or "Shopping".
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  dueDate: { type: Type.STRING, description: "Due date in YYYY-MM-DD format." },
                  importance: { type: Type.STRING, enum: ["high", "medium", "low"] },
                  estimatedMinutes: { type: Type.INTEGER },
                  category: { type: Type.STRING }
                },
                required: ["title", "description", "dueDate", "importance", "estimatedMinutes", "category"]
              }
            }
          },
          required: ["tasks"]
        }
      }
    });

    const result = JSON.parse(response.text || '{"tasks": []}');
    res.json(result);
  } catch (error: any) {
    console.error("Parse Brain Dump Error:", error);
    res.status(500).json({ error: error.message || "Failed to parse brain-dump." });
  }
});

// -------------------------------------------------------------
// Vite Server Integration
// -------------------------------------------------------------
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DeadlineGenie AI Core Server booting on port ${PORT}`);
  });
}

start();
