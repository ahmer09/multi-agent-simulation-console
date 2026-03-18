import { v4 as uuidv4 } from 'uuid';
import { LeadAgent } from './leadAgent.js';
import { SubAgent, setSubAgentPromptProvider } from './subAgent.js';
import { createLLMAdapter, createMockLLMAdapter } from '../llm/index.js';
import { getSubAgentPrompt } from '../prompts/subAgent.js';

// Set up the sub-agent prompt provider
setSubAgentPromptProvider({ getSubAgentPrompt });

/**
 * AgentManager orchestrates the full multi-agent pipeline:
 * 1. Lead Agent decomposes the query into subtasks
 * 2. Sub-Agents execute subtasks in parallel
 * 3. Lead Agent synthesizes results into final output
 *
 * All events are emitted via the `emit` callback for real-time UI streaming.
 */
export class AgentManager {
  constructor() {
    this.runs = new Map();
  }

  async executeQuery(query, config, emit) {
    const runId = uuidv4();
    const startTime = Date.now();

    const run = {
      id: runId,
      query,
      config,
      status: 'running',
      leadAgent: null,
      subAgents: [],
      decomposition: null,
      synthesis: null,
      startTime,
      endTime: null,
      events: [],
    };

    this.runs.set(runId, run);

    // Create a tracked emit function
    const trackedEmit = (event, data) => {
      const entry = { event, data, timestamp: Date.now() };
      run.events.push(entry);
      emit(event, { runId, ...data, timestamp: entry.timestamp });
    };

    try {
      emit('run:started', { runId, query, config, timestamp: startTime });

      // ── Step 1: Create LLM adapter ─────────────────────────
      let llmAdapter;
      const useMock = config.useMock || (!process.env.ANTHROPIC_API_KEY && !process.env.GOOGLE_API_KEY && !process.env.OPENAI_API_KEY);

      if (useMock) {
        llmAdapter = createMockLLMAdapter();
        trackedEmit('system:info', { message: 'Using mock LLM adapter (no API keys configured)' });
      } else {
        try {
          llmAdapter = createLLMAdapter(config.provider || 'claude');
          trackedEmit('system:info', { message: `Using ${config.provider || 'claude'} LLM adapter` });
        } catch {
          llmAdapter = createMockLLMAdapter();
          trackedEmit('system:info', { message: 'Falling back to mock LLM adapter' });
        }
      }

      // ── Step 2: Lead Agent decomposes the query ────────────
      const leadAgent = new LeadAgent(llmAdapter, { model: config.model });
      run.leadAgent = leadAgent;

      trackedEmit('agent:spawned', {
        agentId: 'lead_agent',
        role: 'orchestrator',
        phase: 'decomposition',
      });

      const plan = await leadAgent.decompose(query, trackedEmit);
      run.decomposition = plan;

      trackedEmit('system:info', {
        message: `Decomposed into ${plan.subtasks?.length || 0} subtasks (${plan.complexity_tier} complexity)`,
      });

      // ── Step 3: Spawn Sub-Agents in parallel ───────────────
      const subtasks = plan.subtasks || [];

      if (subtasks.length === 0) {
        trackedEmit('system:warning', { message: 'No subtasks generated — returning empty result' });
        run.status = 'complete';
        run.endTime = Date.now();
        emit('run:complete', { runId, result: { synthesis: 'No subtasks to execute.' }, duration_ms: run.endTime - startTime });
        return run;
      }

      const subAgentPromises = subtasks.map((task, index) => {
        const agentId = `sub_agent_${index + 1}`;
        const subAgent = new SubAgent(agentId, task, llmAdapter, {
          maxToolCalls: task.max_tool_calls || 10,
          model: config.model,
        });

        run.subAgents.push(subAgent);

        trackedEmit('agent:spawned', {
          agentId,
          role: 'sub-agent',
          taskId: task.id,
          objective: task.objective,
          maxToolCalls: task.max_tool_calls || 10,
        });

        return subAgent.execute(trackedEmit).then(result => ({
          agentId,
          task,
          result,
        }));
      });

      // Wait for all sub-agents to complete
      const subAgentResults = await Promise.all(subAgentPromises);

      trackedEmit('system:info', {
        message: `All ${subAgentResults.length} sub-agents completed`,
      });

      // ── Step 4: Lead Agent synthesizes results ─────────────
      trackedEmit('agent:spawned', {
        agentId: 'lead_agent',
        role: 'orchestrator',
        phase: 'synthesis',
      });

      const synthesis = await leadAgent.synthesize(query, subAgentResults, trackedEmit);
      run.synthesis = synthesis;

      // ── Done ───────────────────────────────────────────────
      run.status = 'complete';
      run.endTime = Date.now();

      emit('run:complete', {
        runId,
        result: synthesis,
        subAgentResults: subAgentResults.map(r => ({
          agentId: r.agentId,
          objective: r.task.objective,
          confidence: r.result?.confidence,
          toolCallsMade: r.result?.tool_calls_made || 0,
        })),
        duration_ms: run.endTime - startTime,
        totalEvents: run.events.length,
      });

      return run;

    } catch (err) {
      run.status = 'error';
      run.endTime = Date.now();
      trackedEmit('system:error', { message: err.message, stack: err.stack });
      emit('run:error', { runId, error: err.message, duration_ms: Date.now() - startTime });
      return run;
    }
  }

  getRun(runId) {
    return this.runs.get(runId) || null;
  }

  getAllRuns() {
    return Array.from(this.runs.values()).map(r => ({
      id: r.id,
      query: r.query,
      status: r.status,
      startTime: r.startTime,
      endTime: r.endTime,
      subAgentCount: r.subAgents.length,
    }));
  }
}
