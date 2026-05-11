import axios from 'axios';
import { createHash } from 'crypto';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import config from './config.js';
import { ttsCache } from './db.js';

mkdirSync(config.paths.ttsCache, { recursive: true });

function hashText(text) {
  return createHash('md5').update(text).digest('hex');
}

const client = axios.create({
  baseURL: config.mimo.apiUrl,
  headers: {
    'Authorization': `Bearer ${config.mimo.apiKey}`,
    'Content-Type': 'application/json',
  },
  timeout: 60000,
});

export async function synthesize(text) {
  const hash = hashText(text);

  const cached = ttsCache.get(hash);
  if (cached && existsSync(cached.file_path)) {
    return cached.file_path;
  }

  try {
    const response = await client.post('/chat/completions', {
      model: 'mimo-v2.5-tts',
      messages: [
        { role: 'user', content: '你好' },
        { role: 'assistant', content: text },
      ],
    });

    const audioData = response.data.choices?.[0]?.message?.audio?.data;
    if (!audioData) {
      throw new Error('No audio data in response');
    }

    const filePath = join(config.paths.ttsCache, `${hash}.wav`);
    const buffer = Buffer.from(audioData, 'base64');
    writeFileSync(filePath, buffer);

    ttsCache.set(hash, text, filePath);

    return filePath;
  } catch (error) {
    console.error('TTS synthesis failed:', error.message);
    throw error;
  }
}

export function getAudioUrl(hash) {
  const cached = ttsCache.get(hash);
  if (cached && existsSync(cached.file_path)) {
    return `/cache/tts/${hash}.wav`;
  }
  return null;
}

export default { synthesize, getAudioUrl };
