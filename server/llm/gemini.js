import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getClient() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
  }
  return genAI;
}

export async function chat(messages, options = {}) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: options.model || 'gemini-2.0-flash',
  });

  const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = messages.filter(m => m.role !== 'system');

  // Convert to Gemini format
  const geminiHistory = chatMessages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = chatMessages[chatMessages.length - 1];

  const chatSession = model.startChat({
    history: geminiHistory,
    systemInstruction: systemPrompt
      ? { parts: [{ text: systemPrompt }] }
      : undefined,
    generationConfig: {
      responseMimeType: 'text/plain',
    },
  });

  const result = await chatSession.sendMessage(lastMessage.content);
  const response = result.response;

  return {
    content: response.text(),
    model: options.model || 'gemini-2.0-flash',
    usage: {
      inputTokens: response.usageMetadata?.promptTokenCount,
      outputTokens: response.usageMetadata?.candidatesTokenCount,
    },
  };
}

export async function chatStream(messages, options = {}, onChunk) {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: options.model || 'gemini-2.0-flash',
  });

  const systemPrompt = messages.find(m => m.role === 'system')?.content || '';
  const chatMessages = messages.filter(m => m.role !== 'system');

  const geminiHistory = chatMessages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const lastMessage = chatMessages[chatMessages.length - 1];

  const chatSession = model.startChat({
    history: geminiHistory,
    systemInstruction: systemPrompt
      ? { parts: [{ text: systemPrompt }] }
      : undefined,
    generationConfig: {
      responseMimeType: 'text/plain',
    },
  });

  const result = await chatSession.sendMessageStream(lastMessage.content);

  let fullText = '';
  for await (const chunk of result.stream) {
    const text = chunk.text();
    fullText += text;
    if (onChunk) onChunk(text);
  }

  return {
    content: fullText,
    model: options.model || 'gemini-2.0-flash',
    usage: null,
  };
}
