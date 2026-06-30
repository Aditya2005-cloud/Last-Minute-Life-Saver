<div align="center">
  
# 🧞‍♂️ DeadlineGenie 

**Your AI-Powered Last-Minute Life Saver**

*Project Submission for **Vibe2Ship Hackathon***

[![React](https://img.shields.io/badge/React-18/19-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC.svg)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Powered%20By-Google%20Gemini-amber.svg)](https://deepmind.google/technologies/gemini/)

DeadlineGenie is a tactical productivity companion designed to proactively help you plan, prioritize, and crush looming deadlines. 
By utilizing artificial intelligence, it breaks down complex projects into bite-sized actionable steps, guiding your focus and keeping you on track through high-focus interventions and smart scheduling.

[Submission Details](#-vibe2ship-hackathon-submission) • [Features](#-key-features) • [Purpose](#-purpose--why-use-it) • [Tech Stack](#-technology-stack) • [Getting Started](#-running-locally)

</div>

---

## 🏆 Vibe2Ship Hackathon Submission

### 🎯 Problem Statement Selected
**The Last-Minute Life Saver** — Building an AI-powered productivity companion that proactively helps users plan, prioritize, and complete tasks before deadlines are missed, going beyond passive reminders to drive meaningful action.

### 💡 Solution Overview
DeadlineGenie is a tactical AI productivity companion that helps users beat deadlines by breaking down overwhelming tasks into clear, actionable steps. Instead of a passive to-do list, it uses an AI agent powered by Google Gemini to reason about each task — understanding urgency, breaking large goals into bite-sized subtasks, and guiding the user through focused execution rather than just storing reminders.

The app includes a dedicated “Urgency Mode” for last-minute panic situations, syncs with the user’s calendar for realistic scheduling, and tracks productivity trends and habits over time to build sustainable deadline-beating behavior.

---

## ✨ Key Features

* **🧠 AI Game Plan** — Gemini-powered task breakdown that splits complex deadlines into bite-sized, actionable subtasks with visible AI reasoning.
* **🚨 Urgency Mode (Panic Button)** — A focused crisis mode that freezes distractions and gives immediate action directives when a deadline is critically close.
* **📋 Task Hub & Prioritizer** — AI-assisted task prioritization using an Eisenhower-matrix-style approach.
* **⏱️ Focus Sessions** — Dedicated, checklist-driven work sessions for committed execution.
* **📅 Calendar Synchronization** — Connects with Google Calendar for automatic scheduling and agenda mapping.
* **📊 Task Analytics** — Visual 7-day productivity and completion trend charts.
* **🗃️ Completed Task Archive** — Searchable, filterable history of finished tasks with one-click restore.
* **📈 Habit Tracker** — Daily streak tracking with reset/confirmation controls.
* **✨ 3D Immersive Landing Experience** — A scroll-driven interactive 3D scene built with Three.js/React Three Fiber introducing the app’s concept, with a lightweight 2D fallback for performance.
* **🌗 Light & Dark Themes** — Fully designed and polished for both modes.

---

## 🛠️ Technology Stack

DeadlineGenie is built using a modern full-stack web architecture:

* **Frontend**: React (v18/19), TypeScript, Vite, Tailwind CSS (v4), Framer Motion (for smooth, purposeful animations), Lucide React (Icons), Recharts (for data visualization), Three.js / React Three Fiber / `@react-three/drei` (for 3D graphics).
* **Backend**: Express.js, TypeScript.
* **AI Integration**: Google Gemini API for intelligent task breakdown, deadline diagnostics, and tactical advice.
* **Database**: Firebase/Firestore for robust, durable cloud persistence of your tasks and habits.

---

## ☁️ Google Technologies Utilized

* **Google Gemini API** — Core AI reasoning engine for task breakdown, prioritization, and tactical guidance.
* **Google AI Studio** — Primary build environment used to develop and iterate on the application.
* **Google Calendar** — Calendar synchronization for scheduling and agenda mapping.
* **Firebase / Firestore** — Cloud data persistence for tasks and habits.
* **Google Cloud Run** — Production deployment of the application.

---

## 🚀 Purpose & Why Use It?

We've all been there—staring at a deadline that's approaching way too fast, feeling paralyzed by where to begin. DeadlineGenie is built for those precise moments of overwhelming panic. Its primary purpose is to **bypass cognitive paralysis by telling you exactly what to do next.**

Whether you're a student cramming for finals, a developer sprinting toward a launch, or a professional managing overlapping projects, DeadlineGenie operates as your personal productivity assistant. It isolates distractions, establishes your focus vectors, and provides the step-by-step blueprints you need to execute efficiently. Stop stressing about how to start, and start executing.

---

## 💻 Running Locally

### Prerequisites

* [Node.js](https://nodejs.org/en/) (v18+)
* npm (Node Package Manager)

### Setup & Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repository-url>
   cd <your-repository-name>
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Copy the example environment file and fill in your API keys:
   ```bash
   copy .env.example .env
   ```
   > 🔑 **Note**: You will need a Google Gemini API Key (`GEMINI_API_KEY`) to power the AI features, and Firebase configuration if persistence is enabled.

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   *The server will typically run on `http://localhost:3000`.*

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---
## Drive link for documention 

https://docs.google.com/document/d/1hlNlyhcY_hcJKK0wcu4cqDII53NKQuby/edit?usp=drivesdk&ouid=109735196744443954718&rtpof=true&sd=true


## 📄 License

This project is open-source and available under the MIT License.
