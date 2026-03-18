/**
 * Pluggable Tool Registry
 * 
 * Add new tools with registerTool(). Each tool has:
 * - name: unique identifier
 * - description: what the tool does (shown to agents)
 * - parameters: JSON schema of expected arguments
 * - handler: async function(args) => result
 */

const tools = new Map();

export function registerTool(name, description, parameters, handler) {
  tools.set(name, { name, description, parameters, handler });
}

export function getTool(name) {
  return tools.get(name) || null;
}

export function getAllTools() {
  return Array.from(tools.values()).map(({ name, description, parameters }) => ({
    name,
    description,
    parameters,
  }));
}

export function getToolsForPrompt() {
  return getAllTools()
    .map(t => `- **${t.name}**: ${t.description}\n  Parameters: ${JSON.stringify(t.parameters)}`)
    .join('\n');
}

export async function executeTool(name, args = {}) {
  const tool = tools.get(name);
  if (!tool) {
    return { error: `Tool "${name}" not found. Available tools: ${Array.from(tools.keys()).join(', ')}` };
  }

  const startTime = Date.now();
  try {
    const result = await tool.handler(args);
    return {
      tool: name,
      args,
      result,
      duration_ms: Date.now() - startTime,
    };
  } catch (err) {
    return {
      tool: name,
      args,
      error: err.message,
      duration_ms: Date.now() - startTime,
    };
  }
}

export function getToolCount() {
  return tools.size;
}
