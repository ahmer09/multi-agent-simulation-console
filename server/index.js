import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { AgentManager } from './agents/agentManager.js';
import { registerMockTools } from './tools/mockTools.js';
import { getAllTools } from './tools/registry.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3001;
const agentManager = new AgentManager();

// ── Register Tools ────────────────────────────────────────
console.log('\n🔧 Registering tools...');
registerMockTools();

// ── REST API ──────────────────────────────────────────────
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', tools: getAllTools().length, uptime: process.uptime() });
});

app.get('/api/tools', (req, res) => {
  res.json({ tools: getAllTools() });
});

app.get('/api/runs', (req, res) => {
  res.json({ runs: agentManager.getAllRuns() });
});

// ── WebSocket ─────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`\n🔌 Client connected: ${socket.id}`);

  socket.on('run:query', async (data) => {
    const { query, config = {} } = data;

    if (!query || typeof query !== 'string') {
      socket.emit('run:error', { error: 'Query is required and must be a string.' });
      return;
    }

    console.log(`\n🚀 New query: "${query.slice(0, 80)}..." (provider: ${config.provider || 'auto'})`);

    try {
      await agentManager.executeQuery(query, config, (event, eventData) => {
        socket.emit(event, eventData);
      });
    } catch (err) {
      socket.emit('run:error', { error: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// ── Start Server ──────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║        🧠  NIOM — Agent Simulation Console       ║
╠══════════════════════════════════════════════════╣
║  Server:    http://localhost:${PORT}               ║
║  WebSocket: ws://localhost:${PORT}                 ║
║  Tools:     ${String(getAllTools().length).padEnd(36)}║
║  Claude:    ${process.env.ANTHROPIC_API_KEY ? '✅ Configured'.padEnd(36) : '❌ Not configured'.padEnd(36)}║
║  Gemini:    ${process.env.GOOGLE_API_KEY ? '✅ Configured'.padEnd(36) : '❌ Not configured'.padEnd(36)}║
║  OpenAI:    ${process.env.OPENAI_API_KEY ? '✅ Configured'.padEnd(36) : '❌ Not configured'.padEnd(36)}║
╚══════════════════════════════════════════════════╝
  `);
});
