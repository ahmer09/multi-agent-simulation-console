import React, { useRef, useEffect } from 'react';

function getEventBadge(event) {
  if (event.includes('spawned')) return { label: 'spawn', cls: 'spawn' };
  if (event.includes('thinking')) return { label: 'think', cls: 'think' };
  if (event.includes('tool_call') && !event.includes('tool_result')) return { label: 'tool', cls: 'tool' };
  if (event.includes('tool_result')) return { label: 'result', cls: 'result' };
  if (event.includes('error')) return { label: 'error', cls: 'error' };
  if (event.includes('complete') || event.includes('synthesis') || event.includes('decomposition')) return { label: 'done', cls: 'done' };
  return { label: 'info', cls: 'info' };
}

function formatEventMessage(event, data) {
  if (event === 'agent:spawned') {
    const name = data.agentId === 'lead_agent' ? 'Lead Agent' : data.agentId;
    const phase = data.phase ? ` (${data.phase})` : '';
    return `${name} spawned${phase}`;
  }
  if (event === 'agent:thinking') {
    const name = data.agentId === 'lead_agent' ? 'Lead Agent' : data.agentId;
    return `${name} thinking... ${data.message || `iteration ${data.iteration || '?'}`}`;
  }
  if (event === 'agent:tool_call') {
    return `${data.agentId} → ${data.tool}(${JSON.stringify(data.args || {}).slice(0, 60)})`;
  }
  if (event === 'agent:tool_result') {
    return `${data.agentId} ← ${data.tool} returned ${data.result?.error ? 'error' : 'ok'}`;
  }
  if (event === 'agent:complete') {
    return `${data.agentId} completed (${data.result?.confidence || 'unknown'} confidence)`;
  }
  if (event === 'agent:decomposition') {
    return `Decomposed into ${data.plan?.subtasks?.length || 0} subtasks (${data.plan?.complexity_tier || '?'})`;
  }
  if (event === 'agent:synthesis') {
    return `Synthesis complete (${data.synthesis?.confidence || 'unknown'} confidence)`;
  }
  if (event === 'agent:error') {
    return `Error: ${data.error || 'Unknown error'}`;
  }
  if (event === 'system:info' || event === 'system:warning') {
    return data.message || JSON.stringify(data);
  }
  if (event === 'run:started') {
    return `Run started: "${(data.query || '').slice(0, 50)}..."`;
  }
  if (event === 'run:complete') {
    return `Run complete in ${((data.duration_ms || 0) / 1000).toFixed(1)}s`;
  }
  if (event === 'run:error') {
    return `Run failed: ${data.error}`;
  }
  return `${event}: ${JSON.stringify(data).slice(0, 80)}`;
}

function formatTime(timestamp) {
  if (!timestamp) return '';
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function EventLog({ events }) {
  const endRef = useRef(null);
  const containerRef = useRef(null);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    if (autoScrollRef.current && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (el) {
      const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
      autoScrollRef.current = isAtBottom;
    }
  };

  if (events.length === 0) {
    return (
      <div className="inspector-empty">
        <span style={{ fontSize: '1.5rem' }}>📋</span>
        <span>Events will appear here as agents work.</span>
      </div>
    );
  }

  return (
    <div
      className="event-log"
      ref={containerRef}
      onScroll={handleScroll}
      style={{ overflowY: 'auto', flex: 1, paddingBottom: 8 }}
    >
      {events.map((evt, i) => {
        const badge = getEventBadge(evt.event);
        return (
          <div key={i} className="event-item">
            <span className="event-time">{formatTime(evt.timestamp)}</span>
            <span className={`event-badge ${badge.cls}`}>{badge.label}</span>
            <span className="event-message">{formatEventMessage(evt.event, evt.data)}</span>
          </div>
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
