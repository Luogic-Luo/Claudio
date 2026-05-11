import axios from 'axios';
import config from './config.js';

const client = axios.create({
  baseURL: config.mimo.apiUrl,
  headers: {
    'Authorization': `Bearer ${config.mimo.apiKey}`,
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

export async function chat(systemPrompt, userMessage, chatHistory = []) {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...chatHistory.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    { role: 'user', content: userMessage },
  ];

  try {
    const response = await client.post('/chat/completions', {
      model: config.mimo.model,
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const content = response.data.choices[0].message.content;
    return parseResponse(content);
  } catch (error) {
    console.error('AI request failed:', error.message);
    throw error;
  }
}

export async function chatRaw(systemPrompt, userMessage) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  const response = await client.post('/chat/completions', {
    model: config.mimo.model,
    messages,
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });

  return JSON.parse(response.data.choices[0].message.content);
}

function parseResponse(content) {
  try {
    const parsed = JSON.parse(content);
    return {
      say: parsed.say || '',
      play: normalizePlayList(parsed.play || []),
      reason: parsed.reason || '',
      segue: parsed.segue || '',
    };
  } catch {
    return {
      say: content,
      play: [],
      reason: '',
      segue: '',
    };
  }
}

function normalizePlayList(play) {
  return play.map(item => {
    if (typeof item === 'string') {
      return { query: item };
    }
    return {
      query: item.query || item.name || '',
      artist: item.artist || '',
      id: item.id || null,
    };
  });
}

export function buildStructuredPrompt(context) {
  const parts = [];

  if (context.time) {
    parts.push(`当前时间: ${context.time}`);
  }

  if (context.weather) {
    parts.push(`天气: ${context.weather}`);
  }

  if (context.calendar) {
    parts.push(`今日日程: ${context.calendar}`);
  }

  if (context.recentPlays) {
    parts.push(`最近播放: ${context.recentPlays.join(', ')}`);
  }

  return parts.join('\n');
}

export default { chat, chatRaw, buildStructuredPrompt };
