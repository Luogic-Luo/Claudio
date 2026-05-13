import { Router } from 'express';
import { readFileSafe } from './utils.js';
import { userPreferences, playPlans, playHistory, chatHistory } from './db.js';
import { chat } from './ai.js';
import { resolvePlayList, searchSongs, recommendSongs, loadTaste, getSongUrl } from './music.js';
import { synthesize } from './tts.js';
import { buildSystemPrompt, loadUserContext, getTimeContext } from './context.js';
import {
  loginWithPhone,
  getQrKey,
  createQrCode,
  checkQrStatus,
  checkLoginStatus,
  getUserPlaylists,
  generateTasteProfile,
  distillTaste,
  logout,
} from './netease-user.js';
import config from './config.js';

const router = Router();

let currentState = {
  playing: false,
  currentSong: null,
  playlist: [],
  ttsPlaying: false,
};

let wsBroadcast = null;

export function setWsBroadcast(fn) {
  wsBroadcast = fn;
}

export function updateCurrentState(newState) {
  currentState = { ...currentState, ...newState };
}

router.get('/api/now', (req, res) => {
  res.json(currentState);
});

router.get('/api/taste', (req, res) => {
  const userContext = loadUserContext();
  res.json(userContext);
});

router.get('/api/taste/summary', async (req, res) => {
  try {
    const refresh = req.query.refresh === 'true';
    if (!refresh) {
      const cached = userPreferences.get('taste_summary');
      if (cached) return res.json({ summary: cached });
    }

    const userContext = loadUserContext();
    const prompt = `以下是用户的音乐品味档案和日常习惯，请用自然、亲切的第二人称口吻（用"你"）总结这个人的音乐品味，3-5句话，中文，像朋友评价一样。不要列清单，不要用JSON，直接写段落。

品味档案：
${userContext.taste || '暂无'}

日常习惯：
${userContext.routines || '暂无'}

情绪规则：
${userContext.moodRules || '暂无'}`;

    const aiResponse = await chat('你是一个善于洞察人心的音乐品味分析师。', prompt);
    const summary = aiResponse.say || '暂无品味数据，请先在设置中登录网易云账号并生成音乐品味。';

    userPreferences.set('taste_summary', summary);
    res.json({ summary });
  } catch (error) {
    console.error('Taste summary failed:', error.message);
    res.status(500).json({ error: '生成品味总结失败' });
  }
});

router.get('/api/plan/today', (req, res) => {
  const plans = playPlans.getToday();
  res.json(plans.map(p => ({
    ...p,
    songs: JSON.parse(p.songs),
  })));
});

router.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    chatHistory.add('user', message);

    const recentChats = chatHistory.getRecent(10).reverse();
    const systemPrompt = await buildSystemPrompt();

    const aiResponse = await chat(systemPrompt, message, recentChats);

    chatHistory.add('assistant', JSON.stringify(aiResponse));

    let playlist = [];
    if (aiResponse.play?.length > 0) {
      playlist = await resolvePlayList(aiResponse.play);
    }

    let ttsPath = null;
    if (aiResponse.say) {
      ttsPath = await synthesize(aiResponse.say);
    }

    if (wsBroadcast) {
      wsBroadcast({
        type: 'chat-response',
        say: aiResponse.say,
        segue: aiResponse.segue,
        playlist,
        ttsPath,
      });
    }

    res.json({
      say: aiResponse.say,
      reason: aiResponse.reason,
      segue: aiResponse.segue,
      playlist,
      ttsPath,
    });
  } catch (error) {
    console.error('Chat failed:', error.message);
    res.status(500).json({ error: 'Chat request failed' });
  }
});

router.get('/api/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await searchSongs(q, parseInt(limit));
    res.json(results);
  } catch (error) {
    console.error('Search failed:', error.message);
    res.status(500).json({ error: 'Search failed' });
  }
});

router.post('/api/play', async (req, res) => {
  try {
    const { songs } = req.body;
    if (!songs?.length) {
      return res.status(400).json({ error: 'Songs array is required' });
    }

    const playlist = await resolvePlayList(songs);

    currentState.playlist = playlist;
    currentState.playing = true;

    if (wsBroadcast) {
      wsBroadcast({
        type: 'play',
        playlist,
      });
    }

    res.json({ playlist });
  } catch (error) {
    console.error('Play failed:', error.message);
    res.status(500).json({ error: 'Play request failed' });
  }
});

router.post('/api/recommend', async (req, res) => {
  try {
    const { count = 10 } = req.body;
    const recentPlays = playHistory.getRecent(30);
    const recentPlayIds = recentPlays.map(p => p.song_id);

    const result = await recommendSongs(parseInt(count), recentPlayIds);
    res.json(result);
  } catch (error) {
    console.error('Recommend failed:', error.message);
    res.status(500).json({ error: 'Recommendation failed' });
  }
});

router.post('/api/tts', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const filePath = await synthesize(text);
    const hash = filePath.split('/').pop().replace('.mp3', '');

    res.json({ url: `/cache/tts/${hash}.mp3` });
  } catch (error) {
    console.error('TTS failed:', error.message);
    res.status(500).json({ error: 'TTS synthesis failed' });
  }
});

router.get('/api/history', (req, res) => {
  const { limit = 50 } = req.query;
  const history = playHistory.getRecent(parseInt(limit));
  res.json(history);
});

router.get('/api/chat-history', (req, res) => {
  const { limit = 50 } = req.query;
  const history = chatHistory.getRecent(parseInt(limit));
  res.json(history.reverse());
});

// 网易云账号相关路由
router.get('/api/netease/status', async (req, res) => {
  try {
    const status = await checkLoginStatus();
    res.json(status);
  } catch (error) {
    res.json({ logged: false });
  }
});

router.post('/api/netease/login', async (req, res) => {
  try {
    const { phone, password, countrycode = '86' } = req.body;
    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone and password required' });
    }
    const result = await loginWithPhone(phone, password, countrycode);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/api/netease/qr-key', async (req, res) => {
  try {
    const key = await getQrKey();
    if (key) {
      const qrimg = await createQrCode(key);
      res.json({ key, qrimg });
    } else {
      res.status(500).json({ error: 'Failed to generate QR key' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/netease/qr-check', async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) {
      return res.status(400).json({ error: 'Key required' });
    }
    const result = await checkQrStatus(key);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/api/netease/playlists', async (req, res) => {
  try {
    const status = await checkLoginStatus();
    if (!status.logged) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    const playlists = await getUserPlaylists(status.userId);
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/api/netease/generate-taste', async (req, res) => {
  try {
    const result = await generateTasteProfile();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/api/netease/distill-taste', async (req, res) => {
  try {
    const result = await distillTaste();
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Distill taste failed:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/api/netease/logout', (req, res) => {
  try {
    logout();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

let radioInProgress = false;

export async function handleRadioNext() {
  if (radioInProgress) {
    console.log('handleRadioNext already in progress, skipping');
    return null;
  }
  radioInProgress = true;
  try {
    // 1. 并行：选歌 + 构建提示词
    const recentPlays = playHistory.getRecent(30);
    const recentPlayIds = recentPlays.map(p => p.song_id);

    const [recommendResult, systemPrompt] = await Promise.all([
      recommendSongs(1, recentPlayIds),
      buildSystemPrompt('radio'),
    ]);

    if (!recommendResult.songs || recommendResult.songs.length === 0) {
      throw new Error('No songs to recommend');
    }

    const nextSong = recommendResult.songs[0];

    // 2. AI 生成串词
    const radioPrompt = `下一首歌已经选好了：${nextSong.name} - ${nextSong.artist}（来自${nextSong.source === 'discovery' ? '新歌发现' : '收藏库'}）。
请为这首歌写 DJ 串词。要求：
1) 聚焦于这首歌本身——讲它的故事、歌词、编曲、歌手背景
2) 2-3 句话，自然口语化
3) 不要以时间/天气开头，不要说空话
4) 不需要推荐歌曲，只写串词`;

    const aiResponse = await chat(systemPrompt, radioPrompt);

    chatHistory.add('user', `[电台] 为 ${nextSong.name} - ${nextSong.artist} 写串词`, { radio: true });
    chatHistory.add('assistant', JSON.stringify(aiResponse), { radio: true });

    // 3. 并行：获取歌曲 URL + TTS 合成
    const [songUrl, ttsPath] = await Promise.all([
      getSongUrl(nextSong.id),
      aiResponse.say ? synthesize(aiResponse.say) : Promise.resolve(null),
    ]);

    const playlist = songUrl ? [{ ...nextSong, url: songUrl.url }] : [];

    if (wsBroadcast) {
      wsBroadcast({
        type: 'radio-response',
        say: aiResponse.say,
        segue: aiResponse.segue,
        playlist,
        ttsPath,
      });
    }

    return { say: aiResponse.say, playlist, ttsPath };
  } catch (error) {
    console.error('Radio next failed:', error.message);
    if (wsBroadcast) {
      wsBroadcast({
        type: 'radio-response',
        say: null,
        playlist: [],
        ttsPath: null,
        error: true,
      });
    }
    return null;
  } finally {
    radioInProgress = false;
  }
}

export default router;
