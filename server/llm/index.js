import * as claude from './claude.js';
import * as gemini from './gemini.js';
import * as openai from './openai.js';

const adapters = {
  claude,
  gemini,
  openai,
};

/**
 * Create an LLM adapter for the given provider.
 * Returns an object with { chat, chatStream } methods.
 */
export function createLLMAdapter(provider = 'claude') {
  const adapter = adapters[provider];
  if (!adapter) {
    throw new Error(`Unknown LLM provider: "${provider}". Available: ${Object.keys(adapters).join(', ')}`);
  }
  return adapter;
}

/**
 * Mock LLM adapter for testing without API keys.
 * Simulates realistic agent responses including JSON delegation plans.
 */
export function createMockLLMAdapter() {
  return {
    async chat(messages, options = {}) {
      const lastMsg = messages[messages.length - 1]?.content || '';
      const systemPrompt = messages.find(m => m.role === 'system')?.content || '';

      // Simulate thinking delay
      await new Promise(r => setTimeout(r, 500 + Math.random() * 1000));

      // Detect if this is a lead agent decomposition request
      if (systemPrompt.includes('Lead Agent') && !lastMsg.includes('SUB-AGENT RESULTS')) {
        return {
          content: generateMockDecomposition(lastMsg),
          model: 'mock-model',
          usage: { inputTokens: 100, outputTokens: 200 },
        };
      }

      // Detect if this is a lead agent synthesis request
      if (systemPrompt.includes('Lead Agent') && lastMsg.includes('SUB-AGENT RESULTS')) {
        return {
          content: generateMockSynthesis(lastMsg),
          model: 'mock-model',
          usage: { inputTokens: 300, outputTokens: 400 },
        };
      }

      // Sub-agent response
      return {
        content: generateMockSubAgentResponse(lastMsg, systemPrompt),
        model: 'mock-model',
        usage: { inputTokens: 150, outputTokens: 250 },
      };
    },

    async chatStream(messages, options = {}, onChunk) {
      const result = await this.chat(messages, options);
      // Simulate streaming by chunking the response
      const words = result.content.split(' ');
      for (const word of words) {
        await new Promise(r => setTimeout(r, 20));
        if (onChunk) onChunk(word + ' ');
      }
      return result;
    },
  };
}

function generateMockDecomposition(query) {
  const subtasks = [];
  const queryLower = query.toLowerCase();

  // Generate contextual subtasks based on query keywords
  if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('difference')) {
    subtasks.push(
      {
        id: 'subtask_1',
        objective: `Research the first subject mentioned in: "${truncate(query, 80)}". Gather key characteristics, advantages, and recent developments.`,
        output_format: 'JSON with keys: summary, key_findings (list), sources (list), confidence',
        tool_guidance: 'Use web_search for recent articles and reports. Prefer authoritative sources.',
        boundaries: { in_scope: ['Core features', 'Recent developments', 'Advantages'], out_of_scope: ['Pricing details', 'Unrelated technologies'] },
        max_tool_calls: 8,
      },
      {
        id: 'subtask_2',
        objective: `Research the second subject mentioned in: "${truncate(query, 80)}". Gather key characteristics, advantages, and recent developments.`,
        output_format: 'JSON with keys: summary, key_findings (list), sources (list), confidence',
        tool_guidance: 'Use web_search for recent articles and reports. Prefer authoritative sources.',
        boundaries: { in_scope: ['Core features', 'Recent developments', 'Advantages'], out_of_scope: ['Pricing details', 'Unrelated technologies'] },
        max_tool_calls: 8,
      },
      {
        id: 'subtask_3',
        objective: `Find direct comparison analyses between the subjects in: "${truncate(query, 80)}". Focus on benchmark data and expert opinions.`,
        output_format: 'JSON with keys: summary, comparison_table, sources (list), confidence',
        tool_guidance: 'Use web_search with comparison-focused queries. Look for benchmark data.',
        boundaries: { in_scope: ['Benchmarks', 'Expert comparisons', 'Use cases'], out_of_scope: ['Subjective opinions', 'Marketing material'] },
        max_tool_calls: 6,
      }
    );
  } else if (queryLower.includes('how') || queryLower.includes('explain') || queryLower.includes('what')) {
    subtasks.push(
      {
        id: 'subtask_1',
        objective: `Research foundational concepts related to: "${truncate(query, 80)}". Provide clear definitions and background context.`,
        output_format: 'JSON with keys: summary, key_findings (list), sources (list), confidence',
        tool_guidance: 'Use web_search for authoritative documentation and educational resources.',
        boundaries: { in_scope: ['Core concepts', 'Definitions', 'Background'], out_of_scope: ['Advanced edge cases', 'Implementation details'] },
        max_tool_calls: 6,
      },
      {
        id: 'subtask_2',
        objective: `Find practical examples and current applications related to: "${truncate(query, 80)}".`,
        output_format: 'JSON with keys: summary, examples (list), sources (list), confidence',
        tool_guidance: 'Use web_search for case studies, tutorials, and real-world applications.',
        boundaries: { in_scope: ['Examples', 'Applications', 'Best practices'], out_of_scope: ['Theoretical proofs', 'Historical origins'] },
        max_tool_calls: 6,
      }
    );
  } else {
    subtasks.push(
      {
        id: 'subtask_1',
        objective: `Research the primary topic of: "${truncate(query, 80)}". Provide a comprehensive overview with key facts and developments.`,
        output_format: 'JSON with keys: summary, key_findings (list), sources (list), confidence',
        tool_guidance: 'Use web_search for broad exploration first, then narrow down on key findings.',
        boundaries: { in_scope: ['Key facts', 'Recent developments', 'Important context'], out_of_scope: ['Tangential topics'] },
        max_tool_calls: 10,
      },
      {
        id: 'subtask_2',
        objective: `Investigate secondary aspects and implications of: "${truncate(query, 80)}". Look for expert analysis and data.`,
        output_format: 'JSON with keys: summary, key_findings (list), sources (list), confidence',
        tool_guidance: 'Use web_search for expert analysis. Use read_document if relevant documents are found.',
        boundaries: { in_scope: ['Analysis', 'Implications', 'Expert opinions'], out_of_scope: ['Speculation', 'Unverified claims'] },
        max_tool_calls: 8,
      }
    );
  }

  return JSON.stringify({
    complexity_tier: subtasks.length <= 2 ? 'simple' : 'moderate',
    reasoning: `Decomposed the query into ${subtasks.length} non-overlapping subtasks to cover different aspects without duplication.`,
    subtasks,
  }, null, 2);
}

function generateMockSynthesis(input) {
  return JSON.stringify({
    synthesis: `Based on the sub-agent findings, here is a comprehensive analysis. The research covered multiple perspectives and sources, providing a well-rounded understanding of the topic. Key findings were cross-referenced across sub-agents to ensure accuracy and identify any contradictions.`,
    key_findings: [
      'Finding 1: Multiple authoritative sources confirm the primary claims with high confidence.',
      'Finding 2: Recent developments (2024-2025) show significant evolution in this space.',
      'Finding 3: Expert consensus supports the main conclusions with some nuanced disagreements on specifics.',
    ],
    contradictions: [],
    confidence: 'high',
    gaps: ['Long-term projections remain speculative and would benefit from additional longitudinal studies.'],
  }, null, 2);
}

function generateMockSubAgentResponse(taskDescription, systemPrompt) {
  // Simulate tool calls the sub-agent would make
  const toolCalls = [
    { tool: 'web_search', query: 'broad initial search', results: 3 },
    { tool: 'web_search', query: 'narrowed follow-up', results: 5 },
    { tool: 'read_document', url: 'https://example.com/report', snippet: 'Key finding from document...' },
  ];

  return JSON.stringify({
    summary: `Completed research on the assigned subtask. Found relevant information from ${toolCalls.length} tool calls across multiple authoritative sources. The findings are consistent and provide good coverage of the topic.`,
    key_findings: [
      'Authoritative sources confirm the core premise with strong evidence.',
      'Recent data from 2024-2025 shows emerging trends in the area.',
      'Expert analysis suggests continued growth with some caveats noted.',
    ],
    sources: [
      'https://example.com/authoritative-report-2025',
      'https://example.com/expert-analysis',
      'https://example.com/recent-data',
    ],
    tool_calls_made: toolCalls,
    confidence: 'high',
  }, null, 2);
}

function truncate(str, len) {
  return str.length > len ? str.slice(0, len) + '...' : str;
}
