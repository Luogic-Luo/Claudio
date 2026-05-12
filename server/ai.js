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
  // 1. 直接解析
  try {
    const parsed = JSON.parse(content);
    return normalizeResponse(parsed);
  } catch {}

  // 2. 去除 markdown 代码块后解析
  const stripped = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  if (stripped !== content.trim()) {
    try {
      const parsed = JSON.parse(stripped);
      return normalizeResponse(parsed);
    } catch {}
  }

  // 3. 提取第一个 JSON 对象后解析
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return normalizeResponse(parsed);
    } catch {}
  }

  // 4. 正则兜底：提取 "say" 字段值
  const sayMatch = content.match(/"say"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
  if (sayMatch) {
    return {
      say: sayMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n'),
      play: [],
      reason: '',
      segue: '',
    };
  }

  // 5. 全部失败：返回空，避免把JSON原文喂给TTS
  console.warn('parseResponse: 无法从AI回复中提取结构化数据，原始内容:', content.slice(0, 200));
  return { say: '', play: [], reason: '', segue: '' };
}

function normalizeResponse(parsed) {
  return {
    say: parsed.say || '',
    play: normalizePlayList(parsed.play || []),
    reason: parsed.reason || '',
    segue: parsed.segue || '',
  };
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
