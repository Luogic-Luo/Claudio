import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import config from './config.js';
import { playHistory, userPreferences } from './db.js';

function readFileSafe(filePath) {
  try {
    if (existsSync(filePath)) {
      return readFileSync(filePath, 'utf-8');
    }
  } catch (error) {
    console.warn(`Failed to read ${filePath}:`, error.message);
  }
  return '';
}

export function loadUserContext() {
  const userDir = config.paths.user;
  return {
    taste: readFileSafe(join(userDir, 'taste.md')),
    routines: readFileSafe(join(userDir, 'routines.md')),
    playlists: readFileSafe(join(userDir, 'playlists.json')),
    moodRules: readFileSafe(join(userDir, 'mood-rules.md')),
  };
}

export function loadDJPersona() {
  return readFileSafe(join(config.paths.prompts, 'dj-persona.md'));
}

export function getTimeContext() {
  const now = new Date();
  const hour = now.getHours();
  let timeOfDay;

  if (hour >= 5 && hour < 9) timeOfDay = '清晨';
  else if (hour >= 9 && hour < 12) timeOfDay = '上午';
  else if (hour >= 12 && hour < 14) timeOfDay = '中午';
  else if (hour >= 14 && hour < 18) timeOfDay = '下午';
  else if (hour >= 18 && hour < 22) timeOfDay = '晚上';
  else timeOfDay = '深夜';

  return {
    time: now.toISOString(),
    hour,
    timeOfDay,
    dayOfWeek: now.getDay(),
  };
}

export function getRecentPlayContext(limit = 30) {
  const recentPlays = playHistory.getRecent(limit);
  return recentPlays.map(p => `${p.song_name} - ${p.artist}`);
}

export async function getWeatherContext() {
  const apiKey = config.openweather.apiKey;
  if (!apiKey) return null;

  try {
    const response = await fetch(
      `${config.openweather.apiUrl}/weather?q=Beijing&appid=${apiKey}&units=metric&lang=zh_cn`
    );
    const data = await response.json();
    if (data.cod !== 200) return null;

    return {
      temp: data.main.temp,
      description: data.weather[0]?.description,
      city: data.name,
    };
  } catch {
    return null;
  }
}

export async function buildSystemPrompt(mode = 'normal') {
  const persona = loadDJPersona();
  const userContext = loadUserContext();
  const timeContext = getTimeContext();
  const weather = await getWeatherContext();
  const recentPlays = getRecentPlayContext();

  const parts = [persona];

  parts.push('\n## 用户品味档案');
  if (userContext.taste) parts.push(userContext.taste);
  if (userContext.routines) parts.push('\n## 日常习惯\n' + userContext.routines);
  if (userContext.moodRules) parts.push('\n## 情绪规则\n' + userContext.moodRules);

  parts.push('\n## 当前环境');
  parts.push(`时间: ${timeContext.time} (${timeContext.timeOfDay})`);
  if (weather) {
    parts.push(`天气: ${weather.city} ${weather.temp}°C ${weather.description}`);
  }

  if (recentPlays.length > 0) {
    parts.push('\n## 最近播放（以下歌曲已播放过，严禁重复推荐，必须推荐不同的歌）');
    parts.push(recentPlays.join('\n'));
  }

  if (mode === 'radio') {
    parts.push('\n## 电台模式');
    parts.push('你正在以电台 DJ 模式运行。每首歌之间的串词必须聚焦于歌曲本身——讲一首歌的故事、歌词、编曲、歌手、或者和上一首的关联。');
    parts.push('推荐 1 首歌曲。say 字段 2-3 句话，每次换一个角度切入，不要重复同样的结构。');
    parts.push('严禁以时间/天气开头，严禁"刚才那首歌余韵还在"之类的空话。直接聊歌。');
    parts.push('最重要的规则：推荐的歌曲必须和最近播放列表中的歌曲不同。尝试推荐不同艺术家、不同风格、不同年代的歌，保持新鲜感。如果你不确定某首歌是否已播放过，换一首。');
  }

  parts.push('\n## 输出格式要求');
  parts.push(`请始终以 JSON 格式回复，包含以下字段：
{
  "say": "你要说的话（语音播报内容）",
  "play": [{"query": "歌曲名 艺术家", "id": null}],
  "reason": "选择这些歌曲的理由",
  "segue": "过渡语（从当前话题过渡到音乐的自然语言）"
}`);

  return parts.join('\n');
}

export default {
  loadUserContext,
  loadDJPersona,
  getTimeContext,
  getRecentPlayContext,
  getWeatherContext,
  buildSystemPrompt,
};
