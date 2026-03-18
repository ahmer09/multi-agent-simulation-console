# 🤖 Multi-Agent Simulation Console

A web-based simulation environment for testing and visualizing **multi-agent AI orchestration** step-by-step — built with Vite + React on the frontend and Node.js + Express + Socket.IO on the backend.

---

## 📐 Architecture

```
React Dashboard :5173  ──Socket.IO──▶  Express Server :3001  ──▶  Lead Agent
                                                                       │
                                          ┌────────────────────────────┤
                                          │            │               │
                                       Sub-Agent 1  Sub-Agent 2  Sub-Agent N
                                          │            │               │
                                    ┌─────▼────────────▼───────────────▼──────┐
                                    │              Tool Registry               │
                                    │  web_search · read_document              │
                                    │  calculate  · analyze_data               │
                                    └──────────────────────────────────────────┘
                                          │            │               │
                                    ┌─────▼────────────▼───────────────▼──────┐
                                    │              LLM Adapter                 │
                                    │     Claude  ·  Gemini  ·  Mock           │
                                    └──────────────────────────────────────────┘
```

### How It Works

| Layer | Component | Role |
|---|---|---|
| **Frontend** | React Dashboard (`:5173`) | Simulation UI, real-time event stream |
| **Transport** | Socket.IO | Bi-directional live updates between UI and server |
| **Backend** | Express Server (`:3001`) | REST + WebSocket gateway, session management |
| **Orchestrator** | Lead Agent | Decomposes tasks and delegates to sub-agents |
| **Workers** | Sub-Agent 1…N | Independently execute assigned sub-tasks |
| **Tools** | Tool Registry | Shared capability layer for all agents |
| **LLM** | LLM Adapter | Abstraction over Claude, Gemini, and Mock providers |

---

## ✨ Features

- **Step-by-step simulation** — watch agents think, delegate, and act in real time
- **Dynamic sub-agent spawning** — lead agent creates N sub-agents based on task complexity
- **Pluggable Tool Registry** — agents share tools: `web_search`, `read_document`, `calculate`, `analyze_data`
- **Multi-LLM support** — swap between Claude, Gemini, or a Mock provider without changing agent logic
- **Live console** — Socket.IO streams every agent event to the React dashboard as it happens
- **Isolated agent contexts** — each sub-agent maintains its own state and reasoning chain

---

## 🗂️ Project Structure

```
multi-agent-simulation-console/
├── client/                  # Vite + React frontend
│   ├── src/
│   │   ├── components/      # Dashboard UI components
│   │   ├── hooks/           # Socket.IO hooks, state management
│   │   └── main.jsx
│   └── vite.config.js
│
├── server/                  # Node.js + Express backend
│   ├── agents/
│   │   ├── leadAgent.js     # Orchestrator — task decomposition & delegation
│   │   └── subAgent.js      # Worker agent — tool execution & LLM calls
│   ├── tools/
│   │   └── toolRegistry.js  # web_search, read_document, calculate, analyze_data
│   ├── llm/
│   │   └── llmAdapter.js    # Unified interface: Claude / Gemini / Mock
│   └── index.js             # Express + Socket.IO entry point
│
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+
- **npm** v9+
- API key(s) for your chosen LLM provider (Claude or Gemini)

### Installation

```bash
# Clone the repository
git clone https://github.com/ahmer09/multi-agent-simulation-console.git
cd multi-agent-simulation-console

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Environment Setup

Create a `.env` file in the `server/` directory:

```env
PORT=3001

# LLM Provider — choose one: "claude" | "gemini" | "mock"
LLM_PROVIDER=claude

# Anthropic (Claude)
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Google (Gemini)
GOOGLE_API_KEY=your_google_api_key_here
```

> Use `LLM_PROVIDER=mock` for local development without an API key.

### Running the App

```bash
# Terminal 1 — start the backend
npm run dev
# Dashboard running on http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## 🛠️ Tools Available to Agents

| Tool | Description |
|---|---|
| `web_search` | Search the web for real-time information |
| `read_document` | Parse and extract content from a document or URL |
| `calculate` | Perform mathematical or logical computations |
| `analyze_data` | Run analysis on structured data (JSON, CSV, etc.) |

Tools are registered centrally and shared across all sub-agents. Adding a new tool requires only a single entry in `toolRegistry.js`.

---


## 🧪 Running a Simulation

1. Open the dashboard at `http://localhost:5173`
2. Enter a task prompt (e.g., *"Research the latest trends in renewable energy and summarize the top 3"*)
3. Click **Run Simulation**
4. Watch the Lead Agent decompose the task, spawn sub-agents, and observe each agent calling tools and reasoning in real time
5. The final aggregated answer appears when all sub-agents complete

---
