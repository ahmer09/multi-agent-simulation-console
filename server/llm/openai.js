import OpenAI from 'openai';

let client = null;

function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function chat(messages, options = {}) {
  const openai = getClient();
  const model = options.model || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens || 4096,
  });

  const choice = response.choices[0];

  return {
    content: choice.message.content,
    model: response.model,
    usage: {
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
    },
  };
}

export async function chatStream(messages, options = {}, onChunk) {
  const openai = getClient();
  const model = options.model || 'gpt-4o-mini';

  const stream = await openai.chat.completions.create({
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens || 4096,
    stream: true,
  });

  let fullText = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    fullText += delta;
    if (onChunk && delta) onChunk(delta);
  }

  return {
    content: fullText,
    model: model,
    usage: null, // Streaming doesn't return usage in chunks
  };
}
