import { getLeadAgentPrompt, getLeadAgentSynthesisPrompt } from '../prompts/leadAgent.js';

export class LeadAgent {
  constructor(llmAdapter, options = {}) {
    this.llm = llmAdapter;
    this.model = options.model;
    this.id = 'lead_agent';
    this.totalTokensIn = 0;
    this.totalTokensOut = 0;
  }

  /**
   * Phase 1: Decompose a user query into subtasks.
   * Returns a structured plan with subtasks for sub-agents.
   */
  async decompose(query, emit) {
    const stepStart = Date.now();
    emit('agent:status', { agentId: this.id, status: 'thinking', phase: 'decomposition' });
    emit('agent:thinking', {
      agentId: this.id,
      phase: 'decomposition',
      message: 'Analyzing query complexity and planning decomposition...',
    });

    const systemPrompt = getLeadAgentPrompt();

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query },
    ];

    // Emit the prompts for UI inspection
    emit('agent:prompts', {
      agentId: this.id,
      phase: 'decomposition',
      systemPrompt,
      userInput: query,
    });

    let response;
    try {
      response = await this.llm.chat(messages, { model: this.model });
    } catch (err) {
      emit('agent:error', { agentId: this.id, error: err.message });
      throw err;
    }

    const stepDuration = Date.now() - stepStart;
    const tokensIn = response.usage?.inputTokens || 0;
    const tokensOut = response.usage?.outputTokens || 0;
    this.totalTokensIn += tokensIn;
    this.totalTokensOut += tokensOut;

    emit('agent:response', {
      agentId: this.id,
      content: response.content,
      usage: response.usage,
      phase: 'decomposition',
      durationMs: stepDuration,
      model: response.model,
    });

    // Parse the delegation plan
    let plan;
    try {
      plan = JSON.parse(cleanJsonResponse(response.content));
    } catch (err) {
      emit('agent:error', { agentId: this.id, error: `Failed to parse decomposition: ${err.message}` });
      throw new Error(`Lead Agent returned invalid JSON: ${err.message}`);
    }

    emit('agent:decomposition', {
      agentId: this.id,
      plan,
      durationMs: stepDuration,
      tokensIn,
      tokensOut,
    });

    return plan;
  }

  /**
   * Phase 2: Synthesize sub-agent results into a final response.
   */
  async synthesize(query, subAgentResults, emit) {
    const stepStart = Date.now();
    emit('agent:status', { agentId: this.id, status: 'thinking', phase: 'synthesis' });
    emit('agent:thinking', {
      agentId: this.id,
      phase: 'synthesis',
      message: 'Analyzing sub-agent results and preparing synthesis...',
    });

    const systemPrompt = getLeadAgentSynthesisPrompt();

    // Build the synthesis input
    const resultsText = subAgentResults.map((r, i) => {
      return `## Sub-Agent ${i + 1}: ${r.task?.objective || 'Unknown task'}
### Results:
${JSON.stringify(r.result, null, 2)}`;
    }).join('\n\n---\n\n');

    const userInput = `# ORIGINAL USER QUERY
${query}

# SUB-AGENT RESULTS
${resultsText}

Synthesize these findings into a coherent response. Respond with JSON only.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userInput },
    ];

    // Emit the prompts for UI inspection
    emit('agent:prompts', {
      agentId: this.id,
      phase: 'synthesis',
      systemPrompt,
      userInput,
    });

    let response;
    try {
      response = await this.llm.chat(messages, { model: this.model });
    } catch (err) {
      emit('agent:error', { agentId: this.id, error: err.message });
      throw err;
    }

    const stepDuration = Date.now() - stepStart;
    const tokensIn = response.usage?.inputTokens || 0;
    const tokensOut = response.usage?.outputTokens || 0;
    this.totalTokensIn += tokensIn;
    this.totalTokensOut += tokensOut;

    let synthesis;
    try {
      synthesis = JSON.parse(cleanJsonResponse(response.content));
    } catch {
      synthesis = {
        synthesis: response.content,
        key_findings: [],
        contradictions: [],
        confidence: 'medium',
        gaps: [],
      };
    }

    emit('agent:synthesis', {
      agentId: this.id,
      synthesis,
      durationMs: stepDuration,
      tokensIn,
      tokensOut,
    });
    emit('agent:response', {
      agentId: this.id,
      content: response.content,
      usage: response.usage,
      phase: 'synthesis',
      durationMs: stepDuration,
      model: response.model,
    });

    return synthesis;
  }
}

function cleanJsonResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return cleaned;
}
