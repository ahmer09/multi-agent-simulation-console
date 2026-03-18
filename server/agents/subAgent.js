import { v4 as uuidv4 } from 'uuid';
import { getLeadAgentPrompt } from '../prompts/leadAgent.js';
import { executeTool } from '../tools/registry.js';

export class SubAgent {
  constructor(id, taskDescription, llmAdapter, options = {}) {
    this.id = id || `sub_${uuidv4().slice(0, 8)}`;
    this.task = taskDescription;
    this.llm = llmAdapter;
    this.maxIterations = options.maxToolCalls || taskDescription.max_tool_calls || 10;
    this.model = options.model;
    this.toolCalls = [];
    this.messages = [];
    this.status = 'idle';
    this.result = null;
    this.startTime = null;
    this.endTime = null;
    this.totalTokensIn = 0;
    this.totalTokensOut = 0;
  }

  async execute(emit) {
    this.startTime = Date.now();
    this.status = 'thinking';
    emit('agent:status', { agentId: this.id, status: 'thinking' });

    // Build the initial prompt with the task assignment
    const systemPrompt = this._buildSystemPrompt();
    const userMessage = this._buildTaskMessage();

    this.messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    // Emit the prompts for UI inspection
    emit('agent:prompts', {
      agentId: this.id,
      phase: 'execution',
      systemPrompt,
      userInput: userMessage,
    });

    let iterations = 0;

    while (iterations < this.maxIterations) {
      iterations++;
      const iterStart = Date.now();

      // Get LLM response
      this.status = 'thinking';
      emit('agent:thinking', {
        agentId: this.id,
        iteration: iterations,
        maxIterations: this.maxIterations,
        message: `Iteration ${iterations}/${this.maxIterations}: reasoning about next action...`,
      });

      let response;
      try {
        response = await this.llm.chat(this.messages, { model: this.model });
      } catch (err) {
        this.status = 'error';
        this.result = { error: err.message };
        emit('agent:error', { agentId: this.id, error: err.message });
        this.endTime = Date.now();
        return this.result;
      }

      const iterDuration = Date.now() - iterStart;
      const tokensIn = response.usage?.inputTokens || 0;
      const tokensOut = response.usage?.outputTokens || 0;
      this.totalTokensIn += tokensIn;
      this.totalTokensOut += tokensOut;

      emit('agent:response', {
        agentId: this.id,
        content: response.content,
        usage: response.usage,
        iteration: iterations,
        durationMs: iterDuration,
        model: response.model,
      });

      // Parse the JSON response
      let parsed;
      try {
        parsed = JSON.parse(cleanJsonResponse(response.content));
      } catch {
        // If not valid JSON, treat as final response
        this.status = 'done';
        this.result = {
          summary: response.content,
          key_findings: [],
          sources: [],
          confidence: 'low',
          caveats: ['Response was not in expected JSON format'],
          tool_calls_made: this.toolCalls.length,
          totalTokensIn: this.totalTokensIn,
          totalTokensOut: this.totalTokensOut,
        };
        emit('agent:complete', {
          agentId: this.id,
          result: this.result,
          totalDurationMs: Date.now() - this.startTime,
          iterations,
        });
        this.endTime = Date.now();
        return this.result;
      }

      // Handle tool call
      if (parsed.action === 'tool_call') {
        this.status = 'tool_call';
        const toolStart = Date.now();

        emit('agent:tool_call', {
          agentId: this.id,
          tool: parsed.tool,
          args: parsed.args,
          reasoning: parsed.reasoning,
          iteration: iterations,
        });

        const toolResult = await executeTool(parsed.tool, parsed.args);
        const toolDuration = Date.now() - toolStart;
        this.toolCalls.push({ ...parsed, result: toolResult, durationMs: toolDuration });

        emit('agent:tool_result', {
          agentId: this.id,
          tool: parsed.tool,
          result: toolResult,
          durationMs: toolDuration,
          iteration: iterations,
        });

        // Add to conversation for next iteration
        this.messages.push({ role: 'assistant', content: response.content });
        this.messages.push({
          role: 'user',
          content: `Tool result for ${parsed.tool}:\n${JSON.stringify(toolResult, null, 2)}\n\nContinue with your next action. Remember to respond with JSON only.`,
        });

        continue;
      }

      // Handle final response
      if (parsed.action === 'final_response' || parsed.summary) {
        this.status = 'done';
        this.result = {
          summary: parsed.summary || '',
          key_findings: parsed.key_findings || [],
          sources: parsed.sources || [],
          confidence: parsed.confidence || 'medium',
          caveats: parsed.caveats || [],
          tool_calls_made: this.toolCalls.length,
          totalTokensIn: this.totalTokensIn,
          totalTokensOut: this.totalTokensOut,
        };
        emit('agent:complete', {
          agentId: this.id,
          result: this.result,
          totalDurationMs: Date.now() - this.startTime,
          iterations,
        });
        this.endTime = Date.now();
        return this.result;
      }

      // Unknown action — ask for clarification
      this.messages.push({ role: 'assistant', content: response.content });
      this.messages.push({
        role: 'user',
        content: 'Please respond with a valid JSON object with action "tool_call" or "final_response".',
      });
    }

    // Hit max iterations
    this.status = 'done';
    this.result = {
      summary: 'Reached maximum tool call limit before completing research.',
      key_findings: this.toolCalls.map(tc => `Used ${tc.tool}: ${JSON.stringify(tc.args)}`),
      sources: [],
      confidence: 'low',
      caveats: ['Hit maximum iteration limit'],
      tool_calls_made: this.toolCalls.length,
      totalTokensIn: this.totalTokensIn,
      totalTokensOut: this.totalTokensOut,
    };
    emit('agent:complete', {
      agentId: this.id,
      result: this.result,
      totalDurationMs: Date.now() - this.startTime,
      iterations,
    });
    this.endTime = Date.now();
    return this.result;
  }

  _buildSystemPrompt() {
    const { getSubAgentPrompt } = require_subagent_prompt();
    return getSubAgentPrompt();
  }

  _buildTaskMessage() {
    const t = this.task;
    return `# YOUR TASK ASSIGNMENT

**Objective**: ${t.objective}

**Output Format**: ${t.output_format || 'JSON with summary, key_findings, sources, confidence'}

**Tool Guidance**: ${t.tool_guidance || 'Use available tools as needed.'}

**In Scope**: ${t.boundaries?.in_scope?.join(', ') || 'As described in objective'}
**Out of Scope**: ${t.boundaries?.out_of_scope?.join(', ') || 'Anything not in objective'}

**Max Tool Calls**: ${this.maxIterations}

Begin now. Respond with a JSON object for your first action.`;
  }

  getState() {
    return {
      id: this.id,
      status: this.status,
      task: this.task,
      toolCalls: this.toolCalls,
      result: this.result,
      duration_ms: this.endTime ? this.endTime - this.startTime : (this.startTime ? Date.now() - this.startTime : 0),
    };
  }
}

// Lazy import to avoid circular deps
let _subAgentPrompt = null;
function require_subagent_prompt() {
  if (!_subAgentPrompt) {
    _subAgentPrompt = { getSubAgentPrompt: () => {
      return 'You are a sub-agent. Follow your task description precisely. Respond with JSON only.';
    }};
  }
  return _subAgentPrompt;
}

// Allow setting the prompt externally
export function setSubAgentPromptProvider(provider) {
  _subAgentPrompt = provider;
}

function cleanJsonResponse(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  return cleaned;
}
