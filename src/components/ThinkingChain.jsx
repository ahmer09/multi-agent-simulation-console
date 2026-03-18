import React, { useState } from 'react';

/**
 * ThinkingChain — shows every agent step in chronological order as a timeline.
 * Each event type gets its own visual treatment (thinking, tool call, response, etc.)
 */
export default function ThinkingChain({ agent, events }) {
  if (!agent) {
    return (
      <div className="thinking-chain">
        <div className="inspector-empty">
          <span style={{ fontSize: '1.5rem' }}>🔍</span>
          <span>Click an agent card to inspect its thinking chain.</span>
        </div>
      </div>
    );
  }

  // Filter events for this agent, in chronological order
  const agentEvents = events
    .filter(e => e.data?.agentId === agent.agentId)
    .sort((a, b) => a.timestamp - b.timestamp);

  const promptsEvent = agentEvents.find(e => e.event === 'agent:prompts');
  const completionEvent = agentEvents.find(e => e.event === 'agent:complete');

  // Compute totals
  const responses = agentEvents.filter(e => e.event === 'agent:response');
  const totalTokensIn = responses.reduce((sum, r) => sum + (r.data?.usage?.inputTokens || 0), 0);
  const totalTokensOut = responses.reduce((sum, r) => sum + (r.data?.usage?.outputTokens || 0), 0);
  const totalDuration = completionEvent?.data?.totalDurationMs || 0;

  return (
    <div className="thinking-chain">
      {/* ── Agent Header ─────────────────────── */}
      <div className="tc-header">
        <div className="tc-agent-name">
          {agent.agentId === 'lead_agent' ? '🧠 Lead Agent' : `🔍 ${agent.agentId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`}
        </div>
        <div className="tc-agent-meta">
          {agent.role && <span className="tc-tag">{agent.role}</span>}
          {agent.status && <span className={`tc-tag ${agent.status}`}>{agent.status}</span>}
        </div>
        {(totalTokensIn > 0 || totalDuration > 0) && (
          <div className="tc-summary-stats">
            {totalDuration > 0 && (
              <span className="tc-pill duration">⏱ {(totalDuration / 1000).toFixed(1)}s</span>
            )}
            {totalTokensIn > 0 && (
              <span className="tc-pill tokens">📊 {totalTokensIn}→{totalTokensOut} tokens</span>
            )}
            {agent.toolCalls > 0 && (
              <span className="tc-pill tools">🔧 {agent.toolCalls} tools</span>
            )}
          </div>
        )}
      </div>

      {/* ── System Prompt (collapsible) ──────── */}
      {promptsEvent && (
        <PromptBlock
          label={promptsEvent.data.phase === 'synthesis' ? 'Synthesis Prompt' : 'System Prompt'}
          systemPrompt={promptsEvent.data.systemPrompt}
          userInput={promptsEvent.data.userInput}
        />
      )}

      {/* ── Objective ────────────────────────── */}
      {agent.objective && (
        <div className="tc-step-card tc-objective">
          <div className="tc-step-icon">🎯</div>
          <div className="tc-step-body">
            <div className="tc-step-label">Objective</div>
            <div className="tc-step-text">{agent.objective}</div>
          </div>
        </div>
      )}

      {/* ── Timeline Steps ───────────────────── */}
      <div className="tc-timeline">
        {agentEvents.map((evt, i) => (
          <TimelineStep key={i} event={evt} index={i} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════ */

function PromptBlock({ label, systemPrompt, userInput }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyPrompt = () => {
    navigator.clipboard.writeText(systemPrompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div className="tc-prompt-block">
      <div className="tc-prompt-header" onClick={() => setExpanded(!expanded)}>
        <span className="tc-prompt-chevron">{expanded ? '▾' : '▸'}</span>
        <span className="tc-prompt-label">📋 {label}</span>
        <span className="tc-prompt-length">{systemPrompt.length} chars</span>
        <button className="tc-prompt-copy" onClick={(e) => { e.stopPropagation(); copyPrompt(); }}>
          {copied ? '✓ Copied' : '📋 Copy'}
        </button>
      </div>
      {expanded && (
        <div className="tc-prompt-content">
          <pre>{systemPrompt}</pre>
          {userInput && (
            <>
              <div className="tc-prompt-divider">User Input</div>
              <pre className="tc-prompt-user">{userInput.slice(0, 1500)}{userInput.length > 1500 ? '\n... (truncated)' : ''}</pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function TimelineStep({ event, index }) {
  const { event: eventType, data } = event;

  switch (eventType) {
    case 'agent:thinking':
      return (
        <div className="tc-step thinking">
          <div className="tc-step-dot thinking" />
          <div className="tc-step-card">
            <div className="tc-step-icon">💭</div>
            <div className="tc-step-body">
              <div className="tc-step-label">
                Thinking
                {data.iteration && <span className="tc-iter">iter {data.iteration}/{data.maxIterations}</span>}
              </div>
              <div className="tc-step-text">{data.message || 'Processing...'}</div>
            </div>
          </div>
        </div>
      );

    case 'agent:tool_call':
      return (
        <div className="tc-step tool-call">
          <div className="tc-step-dot tool" />
          <div className="tc-step-card">
            <div className="tc-step-icon">🔧</div>
            <div className="tc-step-body">
              <div className="tc-step-label">
                Tool Call: <span className="tc-tool-name">{data.tool}</span>
                {data.iteration && <span className="tc-iter">iter {data.iteration}</span>}
              </div>
              {data.reasoning && (
                <div className="tc-step-reasoning">"{data.reasoning}"</div>
              )}
              <ExpandableCode label="Arguments" content={JSON.stringify(data.args, null, 2)} />
            </div>
          </div>
        </div>
      );

    case 'agent:tool_result':
      return (
        <div className="tc-step tool-result">
          <div className="tc-step-dot result" />
          <div className="tc-step-card">
            <div className="tc-step-icon">📥</div>
            <div className="tc-step-body">
              <div className="tc-step-label">
                Tool Result: <span className="tc-tool-name">{data.tool}</span>
                {data.durationMs > 0 && <span className="tc-pill duration sm">⏱ {(data.durationMs / 1000).toFixed(1)}s</span>}
              </div>
              <ExpandableCode label="Result" content={JSON.stringify(data.result, null, 2)} maxHeight={150} />
            </div>
          </div>
        </div>
      );

    case 'agent:response':
      return (
        <div className="tc-step response">
          <div className="tc-step-dot response" />
          <div className="tc-step-card">
            <div className="tc-step-icon">📤</div>
            <div className="tc-step-body">
              <div className="tc-step-label">
                LLM Response
                {data.phase && <span className="tc-phase">[{data.phase}]</span>}
                {data.iteration && <span className="tc-iter">iter {data.iteration}</span>}
              </div>
              <div className="tc-step-badges">
                {data.durationMs > 0 && <span className="tc-pill duration sm">⏱ {(data.durationMs / 1000).toFixed(1)}s</span>}
                {data.usage && (
                  <span className="tc-pill tokens sm">
                    {data.usage.inputTokens || '?'}→{data.usage.outputTokens || '?'} tok
                  </span>
                )}
                {data.model && <span className="tc-pill model sm">{data.model}</span>}
              </div>
              <ExpandableCode label="Raw Response" content={data.content} maxHeight={200} />
            </div>
          </div>
        </div>
      );

    case 'agent:decomposition':
      return (
        <div className="tc-step decomposition">
          <div className="tc-step-dot decomp" />
          <div className="tc-step-card highlight">
            <div className="tc-step-icon">📊</div>
            <div className="tc-step-body">
              <div className="tc-step-label">
                Decomposition Plan
                {data.durationMs > 0 && <span className="tc-pill duration sm">⏱ {(data.durationMs / 1000).toFixed(1)}s</span>}
                {data.tokensIn > 0 && <span className="tc-pill tokens sm">{data.tokensIn}→{data.tokensOut} tok</span>}
              </div>
              <div className="tc-step-text">
                Complexity: <strong>{data.plan?.complexity_tier || 'unknown'}</strong> · {data.plan?.subtasks?.length || 0} subtasks
              </div>
              {data.plan?.reasoning && (
                <div className="tc-step-reasoning">"{data.plan.reasoning}"</div>
              )}
              {data.plan?.subtasks?.map((st, i) => (
                <div key={i} className="tc-subtask">
                  <span className="tc-subtask-num">{i + 1}</span>
                  <span className="tc-subtask-text">{st.objective}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case 'agent:synthesis':
      return (
        <div className="tc-step synthesis">
          <div className="tc-step-dot synth" />
          <div className="tc-step-card highlight">
            <div className="tc-step-icon">✨</div>
            <div className="tc-step-body">
              <div className="tc-step-label">
                Synthesis
                {data.durationMs > 0 && <span className="tc-pill duration sm">⏱ {(data.durationMs / 1000).toFixed(1)}s</span>}
              </div>
              {data.synthesis?.confidence && (
                <div className="tc-step-badges">
                  <span className={`tc-pill confidence ${data.synthesis.confidence}`}>
                    {data.synthesis.confidence === 'high' ? '🟢' : data.synthesis.confidence === 'medium' ? '🟡' : '🔴'}
                    {data.synthesis.confidence}
                  </span>
                </div>
              )}
              <ExpandableCode label="Synthesis JSON" content={JSON.stringify(data.synthesis, null, 2)} maxHeight={200} />
            </div>
          </div>
        </div>
      );

    case 'agent:complete':
      return (
        <div className="tc-step complete">
          <div className="tc-step-dot done" />
          <div className="tc-step-card highlight done">
            <div className="tc-step-icon">✅</div>
            <div className="tc-step-body">
              <div className="tc-step-label">Complete</div>
              <div className="tc-step-badges">
                {data.totalDurationMs > 0 && <span className="tc-pill duration sm">⏱ {(data.totalDurationMs / 1000).toFixed(1)}s total</span>}
                {data.iterations > 0 && <span className="tc-pill sm">{data.iterations} iterations</span>}
                {data.result?.confidence && (
                  <span className={`tc-pill confidence ${data.result.confidence}`}>
                    {data.result.confidence === 'high' ? '🟢' : data.result.confidence === 'medium' ? '🟡' : '🔴'}
                    {data.result.confidence}
                  </span>
                )}
              </div>
              {data.result?.summary && (
                <div className="tc-step-text" style={{ marginTop: 6 }}>
                  {data.result.summary.slice(0, 200)}{data.result.summary.length > 200 ? '...' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      );

    case 'agent:error':
      return (
        <div className="tc-step error">
          <div className="tc-step-dot error" />
          <div className="tc-step-card error">
            <div className="tc-step-icon">❌</div>
            <div className="tc-step-body">
              <div className="tc-step-label">Error</div>
              <div className="tc-step-text error">{data.error}</div>
            </div>
          </div>
        </div>
      );

    // Skip spawned, status, prompts — they're shown elsewhere
    case 'agent:spawned':
    case 'agent:status':
    case 'agent:prompts':
      return null;

    default:
      return null;
  }
}

function ExpandableCode({ label, content, maxHeight = 200 }) {
  const [expanded, setExpanded] = useState(false);

  if (!content) return null;

  const isLong = content.length > 300;

  return (
    <details className="tc-expandable" open={!isLong}>
      <summary>{label} ({content.length > 1000 ? `${(content.length / 1000).toFixed(1)}k` : content.length} chars)</summary>
      <pre style={{ maxHeight: expanded ? 'none' : maxHeight }}>
        {expanded ? content : content.slice(0, 2000)}
        {!expanded && content.length > 2000 ? '\n... (truncated)' : ''}
      </pre>
      {content.length > 2000 && (
        <button className="tc-expand-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Collapse' : 'Show All'}
        </button>
      )}
    </details>
  );
}
