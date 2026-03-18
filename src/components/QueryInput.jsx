import React from 'react';

export default function QueryInput({ query, setQuery, onRun, isRunning }) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !isRunning) {
      onRun();
    }
  };

  return (
    <div className="query-input-section">
      <textarea
        className="query-textarea"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter a query to test your multi-agent system...&#10;&#10;Examples:&#10;• Compare React vs Vue for enterprise apps&#10;• How does quantum computing affect cryptography?&#10;• Analyze the impact of AI on healthcare in 2025"
        disabled={isRunning}
      />
      <div className="query-controls">
        <button
          className="btn btn-primary"
          onClick={onRun}
          disabled={isRunning || !query.trim()}
        >
          {isRunning ? (
            <>
              <span className="status-spinner" style={{ width: 12, height: 12, border: '2px solid transparent', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              Running...
            </>
          ) : (
            <>🚀 Run Query</>
          )}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setQuery('')}
          disabled={isRunning}
          title="Clear query"
        >
          ✕
        </button>
      </div>
      {!isRunning && (
        <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', marginTop: 8 }}>
          Ctrl+Enter to run
        </div>
      )}
    </div>
  );
}
