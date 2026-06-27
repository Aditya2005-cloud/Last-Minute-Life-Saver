<div align="center">
  
# 🧞‍♂️ DeadlineGenie 

**Your AI-Powered Last-Minute Life Saver**

[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-38B2AC.svg)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Powered%20By-Google%20Gemini-amber.svg)](https://deepmind.google/technologies/gemini/)

DeadlineGenie is a tactical productivity companion designed to proactively help you plan, prioritize, and crush looming deadlines. 
By utilizing artificial intelligence, it breaks down complex projects into bite-sized actionable steps, guiding your focus and keeping you on track through high-focus interventions and smart scheduling.

[Features](#-key-features) • [Purpose](#-purpose--why-use-it) • [Tech Stack](#-technology-stack) • [Getting Started](#-running-locally) • [Contributing](#-contributing)

</div>

---

## ✨ Key Features

* **🧠 AI Game Plan**: Let AI break down complex, looming deadlines into simple, bite-sized tasks. Understand the AI's reasoning process and take immediate, friction-free first steps.
* **🚨 Urgency Mode (Panic Button)**: In a last-minute panic? Activate Urgency Mode to freeze distractions, configure a dedicated focus block, and receive immediate action directives to meet your deadline.
* **📊 Task Analytics**: Review your productivity trends over the last 7 days with beautifully rendered completion charts.
* **📋 Task Hub**: Add details, prioritize tasks with AI, and unpack high-focus step-by-step plans using dynamic Eisenhower matrices.
* **⏱️ Action Plan & Focus Sessions**: Commit to your tasks with dedicated focus sessions and an actionable checklist roadmap.
* **📅 Calendar Synchronization**: Connect with Google Workspace for automatic scheduling, agenda mapping, and smart calendar interception.
* **📈 Habit Tracker**: Build and maintain essential daily habits with a built-in streak tracker.
* **🌗 Light & Dark Themes**: Work comfortably at any time of day with carefully crafted, elegant light and dark modes.

## 🚀 Purpose & Why Use It?

We've all been there—staring at a deadline that's approaching way too fast, feeling paralyzed by where to begin. DeadlineGenie is built for those precise moments of overwhelming panic. Its primary purpose is to **bypass cognitive paralysis by telling you exactly what to do next.**

Whether you're a student cramming for finals, a developer sprinting toward a launch, or a professional managing overlapping projects, DeadlineGenie operates as your personal productivity assistant. It isolates distractions, establishes your focus vectors, and provides the step-by-step blueprints you need to execute efficiently. Stop stressing about how to start, and start executing.

## 🛠️ Technology Stack

DeadlineGenie is built using a modern full-stack web architecture:

* **Frontend**: React (v18+), Vite, Tailwind CSS (v4), Framer Motion (for smooth, purposeful animations), Lucide React (Icons), Recharts (for data visualization).
* **Backend**: Express.js, TypeScript.
* **AI Integration**: Google Gemini API for intelligent task breakdown, deadline diagnostics, and tactical advice.
* **Database**: Firebase/Firestore for robust, durable cloud persistence of your tasks and habits.

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
   cp .env.example .env
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
   npm run start
   ```

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

*Please ensure that you adhere to the project's styling and architectural guidelines (Tailwind utility classes, modular React components).*

## 📄 License

This project is open-source and available under the MIT License.
