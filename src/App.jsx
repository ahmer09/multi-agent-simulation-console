import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from './utils/socket.js';
import QueryInput from './components/QueryInput.jsx';
import Settings from './components/Settings.jsx';
import AgentFlow from './components/AgentFlow.jsx';
import EventLog from './components/EventLog.jsx';
import StepInspector from './components/StepInspector.jsx';
import ResponseView from './components/ResponseView.jsx';

const DEFAULT_CONFIG = {
  provider: 'claude',
  model: 'claude-sonnet-4-20250514',
  useMock: true,
  maxSubAgents: 5,
  maxToolCalls: 10,
};

export default function App() {
  const [query, setQuery] = useState('');
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isRunning, setIsRunning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [runResult, setRunResult] = useState(null);
  const [rightTab, setRightTab] = useState('events'); // 'events' | 'inspector' | 'response'

  const socketRef = useRef(null);

  // ── Socket Setup ──────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // Agent events
    const agentEvents = [
      'agent:spawned', 'agent:status', 'agent:thinking',
      'agent:tool_call', 'agent:tool_result', 'agent:response',
      'agent:complete', 'agent:error', 'agent:decomposition', 'agent:synthesis',
      'agent:prompts',
    ];

    const systemEvents = ['system:info', 'system:warning', 'system:error'];
    const runEvents = ['run:started', 'run:complete', 'run:error'];

    const handleEvent = (eventName) => (data) => {
      // Add to event log
      setEvents(prev => [...prev, { event: eventName, data, timestamp: data.timestamp || Date.now() }]);

      // Update agent state
      if (eventName === 'agent:spawned') {
        setAgents(prev => {
          // Check if agent already exists (lead agent can be spawned twice for synthesis)
          const existing = prev.find(a => a.agentId === data.agentId && a.phase === data.phase);
          if (existing) return prev;

          // For lead agent re-entry for synthesis, update existing
          if (data.agentId === 'lead_agent') {
            const existingLead = prev.find(a => a.agentId === 'lead_agent');
            if (existingLead && data.phase === 'synthesis') {
              return prev.map(a =>
                a.agentId === 'lead_agent'
                  ? { ...a, phase: 'synthesis', status: 'thinking', role: data.role }
                  : a
              );
            }
          }

          return [...prev, {
            agentId: data.agentId,
            role: data.role,
            phase: data.phase,
            objective: data.objective,
            status: 'thinking',
            toolCalls: 0,
            duration: 0,
            confidence: null,
          }];
        });
      }

      if (eventName === 'agent:status' || eventName === 'agent:thinking') {
        setAgents(prev => prev.map(a =>
          a.agentId === data.agentId
            ? { ...a, status: data.status || 'thinking', phase: data.phase || a.phase }
            : a
        ));
      }

      if (eventName === 'agent:tool_call') {
        setAgents(prev => prev.map(a =>
          a.agentId === data.agentId
            ? { ...a, status: 'tool_call', toolCalls: (a.toolCalls || 0) + 1 }
            : a
        ));
      }

      if (eventName === 'agent:complete') {
        setAgents(prev => prev.map(a =>
          a.agentId === data.agentId
            ? { ...a, status: 'done', confidence: data.result?.confidence }
            : a
        ));
      }

      if (eventName === 'agent:error') {
        setAgents(prev => prev.map(a =>
          a.agentId === data.agentId
            ? { ...a, status: 'error' }
            : a
        ));
      }

      if (eventName === 'run:complete') {
        setIsRunning(false);
        setRunResult(data);
        setRightTab('response');
      }

      if (eventName === 'run:error') {
        setIsRunning(false);
      }
    };

    [...agentEvents, ...systemEvents, ...runEvents].forEach(evt => {
      socket.on(evt, handleEvent(evt));
    });

    return () => {
      [...agentEvents, ...systemEvents, ...runEvents].forEach(evt => {
        socket.off(evt);
      });
    };
  }, []);

  // ── Run Query ────────────────────────────────
  const handleRun = useCallback(() => {
    if (!query.trim() || isRunning) return;

    // Reset state
    setAgents([]);
    setEvents([]);
    setSelectedAgent(null);
    setRunResult(null);
    setIsRunning(true);

    socketRef.current?.emit('run:query', {
      query: query.trim(),
      config,
    });
  }, [query, config, isRunning]);

  // ── Select Agent ─────────────────────────────
  const handleSelectAgent = useCallback((agent) => {
    setSelectedAgent(prev =>
      prev?.agentId === agent.agentId ? null : agent
    );
    setRightTab('inspector');
  }, []);

  return (
    <div className="app">
      {/* ── Header ─────────────────────────────── */}
      <header className="app-header">
        <div className="app-logo">
          <div className="logo-icon">⚡</div>
          <div>
            <h1>NIOM</h1>
            <div className="app-subtitle">Multi-Agent Simulation Console</div>
          </div>
        </div>
        <div className="app-status">
          <div className="status-indicator">
            <div className={`status-dot ${isConnected ? '' : 'disconnected'}`} />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          {isRunning && (
            <div className="status-indicator" style={{ color: 'var(--accent-purple)' }}>
              <div className="status-spinner" style={{ width: 10, height: 10, border: '2px solid transparent', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Processing...
            </div>
          )}
        </div>
      </header>

      {/* ── Left Panel: Query + Settings ───────── */}
      <div className="panel" style={{ background: 'var(--bg-secondary)' }}>
        <div className="panel-header">
          <h2>Query</h2>
        </div>
        <div className="panel-content" style={{ padding: 0 }}>
          <QueryInput
            query={query}
            setQuery={setQuery}
            onRun={handleRun}
            isRunning={isRunning}
          />
          <div className="divider" style={{ margin: '0 var(--space-lg)' }} />
          <div className="panel-header">
            <h2>Settings</h2>
          </div>
          <Settings config={config} setConfig={setConfig} />
        </div>
      </div>

      {/* ── Center Panel: Agent Flow ────────────── */}
      <div className="panel" style={{ background: 'var(--bg-primary)' }}>
        <div className="panel-header">
          <h2>Agent Flow</h2>
        </div>
        <AgentFlow
          agents={agents}
          selectedAgent={selectedAgent}
          onSelectAgent={handleSelectAgent}
          runResult={runResult}
        />
      </div>

      {/* ── Right Panel: Events + Inspector ─────── */}
      <div className="panel" style={{ background: 'var(--bg-secondary)' }}>
        <div className="panel-header" style={{ display: 'flex', gap: 0 }}>
          <button
            onClick={() => setRightTab('events')}
            style={{
              background: 'none',
              border: 'none',
              color: rightTab === 'events' ? 'var(--accent-purple)' : 'var(--text-tertiary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              padding: '0 var(--space-md) 0 0',
              borderBottom: rightTab === 'events' ? '2px solid var(--accent-purple)' : '2px solid transparent',
              paddingBottom: 4,
            }}
          >
            Events ({events.length})
          </button>
          <button
            onClick={() => setRightTab('inspector')}
            style={{
              background: 'none',
              border: 'none',
              color: rightTab === 'inspector' ? 'var(--accent-purple)' : 'var(--text-tertiary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              padding: '0 var(--space-md)',
              borderBottom: rightTab === 'inspector' ? '2px solid var(--accent-purple)' : '2px solid transparent',
              paddingBottom: 4,
            }}
          >
            Inspector
          </button>
          <button
            onClick={() => setRightTab('response')}
            style={{
              background: 'none',
              border: 'none',
              color: rightTab === 'response' ? 'var(--accent-green)' : 'var(--text-tertiary)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              padding: '0 var(--space-md)',
              borderBottom: rightTab === 'response' ? '2px solid var(--accent-green)' : '2px solid transparent',
              paddingBottom: 4,
            }}
          >
            Response
          </button>
        </div>
        <div className="panel-content" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          {rightTab === 'events' && (
            <div style={{ flex: 1, overflow: 'auto', padding: 'var(--space-md)' }}>
              <EventLog events={events} />
            </div>
          )}
          {rightTab === 'inspector' && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <StepInspector agent={selectedAgent} events={events} />
            </div>
          )}
          {rightTab === 'response' && (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <ResponseView runResult={runResult} events={events} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
