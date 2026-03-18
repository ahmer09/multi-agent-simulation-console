import React from 'react';

export default function ResponseView({ runResult, events }) {
  // Gather sub-agent results from events
  const subAgentCompletions = events.filter(e => e.event === 'agent:complete' && e.data?.agentId !== 'lead_agent');
  const synthesisEvent = events.find(e => e.event === 'agent:synthesis');
  const synthesis = synthesisEvent?.data?.synthesis || runResult?.result;

  if (!runResult && subAgentCompletions.length === 0) {
    return (
      <div className="response-view">
        <div className="inspector-empty">
          <span style={{ fontSize: '1.5rem' }}>💬</span>
          <span>The final response will appear here after a run completes.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="response-view">
      {/* ── Synthesis / Final Answer ── */}
      {synthesis && (
        <div className="response-section response-synthesis">
          <div className="response-section-header">
            <span className="response-section-icon">✨</span>
            <h3>Final Synthesis</h3>
            {synthesis.confidence && (
              <span className={`confidence-pill ${synthesis.confidence}`}>
                {synthesis.confidence === 'high' ? '🟢' : synthesis.confidence === 'medium' ? '🟡' : '🔴'}
                {synthesis.confidence}
              </span>
            )}
          </div>

          <div className="response-body">
            {synthesis.synthesis || (typeof synthesis === 'string' ? synthesis : '')}
          </div>

          {synthesis.key_findings?.length > 0 && (
            <div className="response-findings">
              <h4>Key Findings</h4>
              <ul>
                {synthesis.key_findings.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {synthesis.contradictions?.length > 0 && (
            <div className="response-findings contradictions">
              <h4>⚠ Contradictions</h4>
              <ul>
                {synthesis.contradictions.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}

          {synthesis.gaps?.length > 0 && (
            <div className="response-findings gaps">
              <h4>🔍 Gaps</h4>
              <ul>
                {synthesis.gaps.map((g, i) => (
                  <li key={i}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Individual Sub-Agent Results ── */}
      {subAgentCompletions.length > 0 && (
        <div className="response-section">
          <div className="response-section-header">
            <span className="response-section-icon">🔍</span>
            <h3>Sub-Agent Results ({subAgentCompletions.length})</h3>
          </div>

          {subAgentCompletions.map((evt, i) => {
            const result = evt.data?.result;
            if (!result) return null;

            return (
              <details key={i} className="response-agent-result" open={i === 0}>
                <summary>
                  <span className="agent-result-name">{evt.data.agentId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                  {result.confidence && (
                    <span className={`confidence-pill small ${result.confidence}`}>
                      {result.confidence}
                    </span>
                  )}
                  {result.tool_calls_made != null && (
                    <span className="agent-result-meta">🔧 {result.tool_calls_made} tools</span>
                  )}
                </summary>

                <div className="agent-result-body">
                  {result.summary && (
                    <p className="agent-result-summary">{result.summary}</p>
                  )}

                  {result.key_findings?.length > 0 && (
                    <div className="agent-result-findings">
                      <h5>Findings</h5>
                      <ul>
                        {result.key_findings.map((f, j) => (
                          <li key={j}>{f}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.sources?.length > 0 && (
                    <div className="agent-result-sources">
                      <h5>Sources</h5>
                      <ul>
                        {result.sources.map((s, j) => (
                          <li key={j}>
                            <a href={s} target="_blank" rel="noopener noreferrer">{s}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.caveats?.length > 0 && (
                    <div className="agent-result-caveats">
                      {result.caveats.map((c, j) => (
                        <span key={j} className="caveat-tag">{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {/* ── Run Stats ── */}
      {runResult && (
        <div className="response-stats">
          {runResult.duration_ms && (
            <div className="stat">
              <span className="stat-label">Duration</span>
              <span className="stat-value">{(runResult.duration_ms / 1000).toFixed(1)}s</span>
            </div>
          )}
          {runResult.totalEvents && (
            <div className="stat">
              <span className="stat-label">Events</span>
              <span className="stat-value">{runResult.totalEvents}</span>
            </div>
          )}
          {runResult.subAgentResults && (
            <div className="stat">
              <span className="stat-label">Agents</span>
              <span className="stat-value">{runResult.subAgentResults.length}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
