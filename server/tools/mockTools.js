import { registerTool } from './registry.js';

/**
 * Register all mock tools.
 * Each returns plausible fake data with artificial delays
 * to simulate real tool latency.
 */
export function registerMockTools() {
  // ─── Web Search ─────────────────────────────────────────
  registerTool(
    'web_search',
    'Search the web for information. Returns a list of search results with titles, snippets, and URLs. Use short 2-5 word queries for best results.',
    {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query (keep short, 2-5 words)' },
        num_results: { type: 'number', description: 'Number of results to return (default: 5)' },
      },
      required: ['query'],
    },
    async (args) => {
      await simulateLatency(300, 800);
      const numResults = args.num_results || 5;
      const results = generateSearchResults(args.query, numResults);
      return { query: args.query, total_results: results.length, results };
    }
  );

  // ─── Read Document ──────────────────────────────────────
  registerTool(
    'read_document',
    'Read and extract text content from a URL or document. Returns the document text and metadata.',
    {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL of the document to read' },
      },
      required: ['url'],
    },
    async (args) => {
      await simulateLatency(400, 1000);
      return {
        url: args.url,
        title: `Document: ${extractDomain(args.url)}`,
        content: generateDocumentContent(args.url),
        word_count: 450 + Math.floor(Math.random() * 500),
        fetched_at: new Date().toISOString(),
      };
    }
  );

  // ─── Calculate ──────────────────────────────────────────
  registerTool(
    'calculate',
    'Evaluate mathematical expressions or perform calculations. Returns the numeric result.',
    {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Mathematical expression to evaluate' },
      },
      required: ['expression'],
    },
    async (args) => {
      await simulateLatency(100, 300);
      try {
        // Safe eval for basic math only
        const sanitized = args.expression.replace(/[^0-9+\-*/().%\s]/g, '');
        const result = Function('"use strict"; return (' + sanitized + ')')();
        return { expression: args.expression, result, type: typeof result };
      } catch (e) {
        return { expression: args.expression, error: `Cannot evaluate: ${e.message}` };
      }
    }
  );

  // ─── Analyze Data ───────────────────────────────────────
  registerTool(
    'analyze_data',
    'Analyze a dataset or text corpus. Returns statistical summaries, key themes, and patterns.',
    {
      type: 'object',
      properties: {
        data: { type: 'string', description: 'The data or text to analyze' },
        analysis_type: { type: 'string', description: 'Type of analysis: summary, sentiment, themes, statistics' },
      },
      required: ['data', 'analysis_type'],
    },
    async (args) => {
      await simulateLatency(500, 1200);
      return {
        analysis_type: args.analysis_type,
        results: {
          summary: 'The data shows consistent patterns across multiple dimensions with notable variation in secondary metrics.',
          themes: ['technology adoption', 'market dynamics', 'regulatory impact'],
          sentiment: 'predominantly neutral with positive trends',
          confidence: 0.82,
        },
      };
    }
  );

  console.log('  ✓ Registered 4 mock tools: web_search, read_document, calculate, analyze_data');
}

// ─── Helper functions ──────────────────────────────────────

function simulateLatency(minMs, maxMs) {
  const delay = minMs + Math.random() * (maxMs - minMs);
  return new Promise(r => setTimeout(r, delay));
}

function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return url.slice(0, 30);
  }
}

function generateSearchResults(query, count) {
  const words = query.toLowerCase().split(/\s+/);
  const domains = ['arxiv.org', 'nature.com', 'ieee.org', 'techcrunch.com', 'reuters.com', 'bbc.com', 'wikipedia.org', 'medium.com'];
  const results = [];

  for (let i = 0; i < count; i++) {
    const domain = domains[i % domains.length];
    results.push({
      title: `${capitalize(words.join(' '))} — ${['Analysis', 'Overview', 'Report', 'Study', 'Investigation'][i % 5]} (${2023 + (i % 3)})`,
      url: `https://${domain}/article/${words.join('-')}-${i + 1}`,
      snippet: `Comprehensive ${['analysis', 'review', 'study', 'examination', 'report'][i % 5]} of ${query}. Key findings suggest significant developments in recent years with implications for multiple sectors...`,
      published: `202${3 + (i % 3)}-${String(1 + (i * 3) % 12).padStart(2, '0')}-${String(5 + i * 7 % 25).padStart(2, '0')}`,
    });
  }

  return results;
}

function generateDocumentContent(url) {
  return `[Document content extracted from ${url}]\n\nThis document discusses several key aspects of the topic. Recent research indicates that significant progress has been made in this area since 2023. Industry experts highlight three main developments:\n\n1. Increased adoption across enterprise sectors with a 40% year-over-year growth rate.\n2. New regulatory frameworks that have shaped the competitive landscape.\n3. Technological breakthroughs enabling previously impossible applications.\n\nThe analysis suggests continued momentum through 2025-2026 with some notable challenges in scalability and governance. Multiple independent studies corroborate these findings.\n\n[End of extracted content]`;
}

function capitalize(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}
