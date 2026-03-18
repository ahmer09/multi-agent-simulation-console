import Anthropic from '@anthropic-ai/sdk';

let client = null;

function getClient() {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

export async function chat(messages, options = {}) {
  const anthropic = getClient();

  const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = messages.filter(m => m.role !== 'system');

  const response = await anthropic.messages.create({
    model: options.model || 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens || 4096,
    system: systemPrompt,
    messages: chatMessages,
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('');

  return {
    content: text,
    model: response.model,
    usage: {
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
    },
  };
}

export async function chatStream(messages, options = {}, onChunk) {
  const anthropic = getClient();

  const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = messages.filter(m => m.role !== 'system');

  const stream = anthropic.messages.stream({
    model: options.model || 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens || 4096,
    system: systemPrompt,
    messages: chatMessages,
  });

  let fullText = '';

  stream.on('text', (text) => {
    fullText += text;
    if (onChunk) onChunk(text);
  });

  const finalMessage = await stream.finalMessage();

  return {
    content: fullText,
    model: finalMessage.model,
    usage: {
      inputTokens: finalMessage.usage?.input_tokens,
      outputTokens: finalMessage.usage?.output_tokens,
    },
  };
}
