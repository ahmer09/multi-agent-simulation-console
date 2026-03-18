import React from 'react';

function AgentCard({ agent, isSelected, onClick }) {
  const isLead = agent.role === 'orchestrator';
  const statusClass = agent.status || 'thinking';

  return (
    <div
      className={`agent-card ${isLead ? 'lead' : 'sub'} ${isSelected ? 'active' : ''}`}
      onClick={() => onClick(agent)}
    >
      <div className="agent-card-header">
        <div className="agent-card-title">
          <div className="agent-icon">
            {isLead ? '🧠' : '🔍'}
          </div>
          <div>
            <h3>{agent.agentId === 'lead_agent' ? 'Lead Agent' : agent.agentId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</h3>
            <div className="agent-role">
              {isLead
                ? (agent.phase === 'synthesis' ? 'Synthesizing Results' : 'Orchestrator')
                : 'Sub-Agent'}
            </div>
          </div>
        </div>
        <div className={`agent-status-badge ${statusClass}`}>
          {(statusClass === 'thinking' || statusClass === 'tool_call') && (
            <div className="status-spinner" />
          )}
          {statusClass === 'thinking' && 'Thinking'}
          {statusClass === 'tool_call' && 'Tool Call'}
          {statusClass === 'done' && '✓ Done'}
          {statusClass === 'error' && '✕ Error'}
          {statusClass === 'idle' && 'Idle'}
        </div>
      </div>

      {agent.objective && (
        <div className="agent-card-body">
          <div className="objective">{agent.objective}</div>
        </div>
      )}

      <div className="agent-card-footer">
        {agent.toolCalls > 0 && (
          <div className="agent-metric">
            <span className="metric-icon">🔧</span>
            {agent.toolCalls} tool calls
          </div>
        )}
        {agent.duration > 0 && (
          <div className="agent-metric">
            <span className="metric-icon">⏱</span>
            {(agent.duration / 1000).toFixed(1)}s
          </div>
        )}
        {agent.confidence && (
          <div className="agent-metric">
            <span className="metric-icon">
              {agent.confidence === 'high' ? '🟢' : agent.confidence === 'medium' ? '🟡' : '🔴'}
            </span>
            {agent.confidence}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentFlow({ agents, selectedAgent, onSelectAgent, runResult }) {
  if (agents.length === 0) {
    return (
      <div className="agent-flow">
        <div className="flow-empty">
          <div className="flow-empty-icon">🧠</div>
          <p>Enter a query and click <strong>Run</strong> to watch agents work step-by-step.</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
            The Lead Agent will decompose your query, spawn sub-agents, and synthesize the results.
          </p>
        </div>
      </div>
    );
  }

  const leadAgent = agents.find(a => a.agentId === 'lead_agent');
  const subAgents = agents.filter(a => a.agentId !== 'lead_agent');

  return (
    <div className="agent-flow">
      {/* Lead Agent Card */}
      {leadAgent && (
        <AgentCard
          agent={leadAgent}
          isSelected={selectedAgent?.agentId === leadAgent.agentId}
          onClick={onSelectAgent}
        />
      )}

      {/* Connector */}
      {subAgents.length > 0 && (
        <div className={`connector ${leadAgent?.status !== 'done' ? 'animated' : ''}`} />
      )}

      {/* Sub-Agents */}
      {subAgents.length > 0 && (
        <div className="sub-agents-group">
          <div className="sub-agents-header">
            <div className="sub-agents-line" />
            <span className="sub-agents-label">
              {subAgents.length} Sub-Agent{subAgents.length !== 1 ? 's' : ''}
            </span>
            <div className="sub-agents-line" />
          </div>

          {subAgents.map(agent => (
            <AgentCard
              key={agent.agentId}
              agent={agent}
              isSelected={selectedAgent?.agentId === agent.agentId}
              onClick={onSelectAgent}
            />
          ))}
        </div>
      )}

      {/* Run Result Summary */}
      {runResult && (
        <>
          <div className="connector" />
          <div className="run-summary">
            <h3>✨ Synthesis Complete</h3>
            <div className="synthesis-text">
              {runResult.synthesis || runResult.result?.synthesis || 'No synthesis available.'}
            </div>
            {(runResult.key_findings || runResult.result?.key_findings)?.length > 0 && (
              <ul className="findings-list">
                {(runResult.key_findings || runResult.result?.key_findings).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
            <div className="run-meta">
              {runResult.duration_ms && (
                <span>⏱ {(runResult.duration_ms / 1000).toFixed(1)}s total</span>
              )}
              {runResult.confidence && (
                <span>🎯 {runResult.confidence} confidence</span>
              )}
              {runResult.totalEvents && (
                <span>📊 {runResult.totalEvents} events</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
