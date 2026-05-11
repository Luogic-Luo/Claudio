import NeteaseCloudMusicApiModule from 'NeteaseCloudMusicApi';
import { writeFileSync, readFileSync, existsSync, unlinkSync, statSync } from 'fs';
import { join } from 'path';
import config from './config.js';
import { chat, chatRaw } from './ai.js';

const NeteaseCloudMusicApi = NeteaseCloudMusicApiModule.default || NeteaseCloudMusicApiModule;

const {
  login_cellphone,
  login_qr_key,
  login_qr_create,
  login_qr_check,
  user_playlist,
  playlist_detail,
  user_cloud,
  likelist,
  user_account,
} = NeteaseCloudMusicApi;

const COOKIE_FILE = join(config.paths.user, '.netease-cookie.json');

function saveCookie(cookie) {
  writeFileSync(COOKIE_FILE, JSON.stringify({ cookie, updatedAt: new Date().toISOString() }));
}

export function loadCookie() {
  if (existsSync(COOKIE_FILE)) {
    try {
      const data = JSON.parse(readFileSync(COOKIE_FILE, 'utf-8'));
      return cleanCookie(data.cookie);
    } catch {
      return null;
    }
  }
  return null;
}

function cleanCookie(raw) {
  if (!raw) return '';
  const pairs = [];
  const seen = new Set();
  // Split by ;; to get individual Set-Cookie entries
  const entries = raw.split(';;');
  for (const entry of entries) {
    // First part before ; is the name=value
    const nameValue = entry.split(';')[0].trim();
    if (!nameValue || !nameValue.includes('=')) continue;
    const name = nameValue.split('=')[0].trim();
    // Keep only the first occurrence of each cookie name
    if (!seen.has(name)) {
      seen.add(name);
      pairs.push(nameValue);
    }
  }
  return pairs.join('; ');
}

export function logout() {
  if (existsSync(COOKIE_FILE)) {
    unlinkSync(COOKIE_FILE);
  }
}

export async function loginWithPhone(phone, password, countrycode = '86') {
  try {
    const response = await login_cellphone({ phone, password, countrycode });
    if (response.body.code === 200) {
      saveCookie(response.body.cookie);
      return {
        success: true,
        userId: response.body.account.id,
        nickname: response.body.profile?.nickname,
      };
    }
    return { success: false, message: response.body.message || 'Login failed' };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function getQrKey() {
  try {
    const response = await login_qr_key();
    return response.body.data.unikey;
  } catch (error) {
    console.error('Get QR key failed:', error.message);
    return null;
  }
}

export async function createQrCode(key) {
  try {
    const response = await login_qr_create({ key, qrimg: true });
    return response.body.data.qrimg;
  } catch (error) {
    console.error('Create QR code failed:', error.message);
    return null;
  }
}

export async function checkQrStatus(key) {
  try {
    const response = await login_qr_check({ key });
    if (response.body.code === 803) {
      saveCookie(response.body.cookie);
      return { success: true, cookie: response.body.cookie };
    }
    return { success: false, code: response.body.code, message: response.body.message };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function checkLoginStatus() {
  const cookie = loadCookie();
  if (!cookie) return { logged: false };

  try {
    const response = await user_account({ cookie });
    const account = response.body.account;
    const profile = response.body.profile;
    if (response.body.code === 200 && account) {
      return {
        logged: true,
        userId: account.id,
        nickname: profile?.nickname,
        vipType: account?.vipType || profile?.vipType || 0,
      };
    }
    return { logged: false };
  } catch {
    return { logged: false };
  }
}

export async function getUserPlaylists(uid) {
  const cookie = loadCookie();
  try {
    const response = await user_playlist({ uid, cookie });
    if (response.body.code === 200) {
      return response.body.playlist.map(p => ({
        id: p.id,
        name: p.name,
        trackCount: p.trackCount,
        playCount: p.playCount,
        description: p.description,
        tags: p.tags || [],
      }));
    }
    return [];
  } catch (error) {
    console.error('Get playlists failed:', error.message);
    return [];
  }
}

export async function getPlaylistTracks(playlistId) {
  const cookie = loadCookie();
  try {
    const response = await playlist_detail({ id: playlistId, cookie });
    if (response.body.code === 200) {
      const tracks = response.body.playlist.tracks || [];
      return tracks.map(t => ({
        id: t.id,
        name: t.name,
        artist: t.ar?.map(a => a.name).join(', ') || '',
        album: t.al?.name || '',
        duration: t.dt,
        tags: t.al?.tags || [],
      }));
    }
    return [];
  } catch (error) {
    console.error('Get playlist tracks failed:', error.message);
    return [];
  }
}

export async function getLikedSongs() {
  const cookie = loadCookie();
  const status = await checkLoginStatus();
  if (!status.logged) return [];

  try {
    const response = await likelist({ uid: status.userId, cookie });
    if (response.body.code === 200) {
      return response.body.ids || [];
    }
    return [];
  } catch (error) {
    console.error('Get liked songs failed:', error.message);
    return [];
  }
}

export async function generateTasteProfile() {
  const status = await checkLoginStatus();
  if (!status.logged) {
    return { success: false, message: 'Not logged in' };
  }

  const playlists = await getUserPlaylists(status.userId);

  const allTracks = [];
  const genreCounts = {};
  const artistCounts = {};
  const tagCounts = {};

  const limit = Math.min(playlists.length, 10);
  for (let i = 0; i < limit; i++) {
    const tracks = await getPlaylistTracks(playlists[i].id);
    allTracks.push(...tracks);

    tracks.forEach(track => {
      const artists = track.artist.split(', ');
      artists.forEach(artist => {
        artistCounts[artist] = (artistCounts[artist] || 0) + 1;
      });

      track.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
  }

  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => name);

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => name);

  const tasteContent = `# 我的音乐品味（自动从网易云生成）

## 喜欢的艺术家
${topArtists.map(a => `- ${a}`).join('\n')}

## 音乐风格偏好
${topTags.length > 0 ? topTags.map(t => `- ${t}`).join('\n') : '- 暂无标签数据'}

## 歌单概览
${playlists.slice(0, 10).map(p => `- ${p.name} (${p.trackCount}首)`).join('\n')}

## 统计数据
- 分析歌单数: ${limit}
- 总歌曲数: ${allTracks.length}
- 唯一艺术家数: ${Object.keys(artistCounts).length}
`;

  const userDir = config.paths.user;
  writeFileSync(join(userDir, 'taste.md'), tasteContent);

  const playlistJson = {};
  playlists.slice(0, 5).forEach(p => {
    playlistJson[p.name] = allTracks
      .filter(t => playlists.find(pl => pl.id === p.id))
      .slice(0, 10)
      .map(t => ({ name: t.name, artist: t.artist }));
  });
  writeFileSync(join(userDir, 'playlists.json'), JSON.stringify(playlistJson, null, 2));

  return {
    success: true,
    stats: {
      playlists: limit,
      tracks: allTracks.length,
      topArtists: topArtists.slice(0, 5),
      topTags: topTags.slice(0, 5),
    },
  };
}

export async function distillTaste() {
  const status = await checkLoginStatus();
  if (!status.logged) {
    return { success: false, message: '请先登录网易云账号' };
  }

  const cookie = loadCookie();

  // 1. 获取所有歌单，过滤自建歌单
  const plRes = await user_playlist({ uid: status.userId, cookie });
  if (plRes.body.code !== 200) {
    return { success: false, message: '获取歌单失败' };
  }

  const myPlaylists = plRes.body.playlist.filter(p => p.creator.userId === status.userId);
  if (myPlaylists.length === 0) {
    return { success: false, message: '没有找到自建歌单' };
  }

  // 2. 获取每个歌单的歌曲
  const allPlaylists = [];
  for (let i = 0; i < myPlaylists.length; i++) {
    const pl = myPlaylists[i];
    try {
      const detailRes = await playlist_detail({ id: pl.id, cookie });
      if (detailRes.body.code === 200) {
        const tracks = (detailRes.body.playlist.tracks || []).map(t => ({
          id: t.id,
          name: t.name,
          artist: (t.ar || []).map(a => a.name).join(', '),
          album: t.al?.name || '',
          duration: t.dt,
        }));
        allPlaylists.push({
          playlistId: pl.id,
          playlistName: pl.name,
          trackCount: tracks.length,
          tracks,
        });
      }
    } catch (err) {
      console.warn(`获取歌单 ${pl.name} 失败:`, err.message);
    }
    if (i < myPlaylists.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // 3. 保存到 all-songs.json
  const songsFile = join(config.paths.user, 'all-songs.json');
  writeFileSync(songsFile, JSON.stringify(allPlaylists, null, 2), 'utf-8');

  // 4. 程序化统计
  const artistCounts = {};
  let totalSongs = 0;
  let totalDuration = 0;
  for (const pl of allPlaylists) {
    for (const t of pl.tracks) {
      totalSongs++;
      totalDuration += t.duration || 0;
      for (const a of t.artist.split(',').map(s => s.trim())) {
        if (a) artistCounts[a] = (artistCounts[a] || 0) + 1;
      }
    }
  }
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  // 5. 构建歌单摘要
  const playlistSummary = allPlaylists.map(pl => ({
    name: pl.playlistName,
    count: pl.trackCount,
    sampleSongs: pl.tracks.slice(0, 8).map(t => `${t.name} - ${t.artist}`),
  }));

  // 6. AI 分类
  const classifyPrompt = `你是一个音乐数据分析专家。根据以下用户的歌单信息，分析其音乐品味。

## 歌单列表
${playlistSummary.map(pl => `- ${pl.name} (${pl.count}首): ${pl.sampleSongs.join(', ')}`).join('\n')}

## 高频艺术家 (前20)
${topArtists.slice(0, 20).map(([name, count]) => `${name}: ${count}首`).join('\n')}

请输出 JSON 格式:
{
  "genres": [{"name": "风格名", "percentage": 数字, "artists": "代表艺术家", "description": "一句话描述"}],
  "languages": [{"name": "语言", "percentage": 数字}],
  "moods": [{"name": "情绪类型", "percentage": 数字, "description": "一句话描述"}],
  "eras": [{"name": "年代", "percentage": 数字}],
  "summary": "用3-4句话总结这个人的音乐品味特征，像朋友评价一样自然"
}

要求:
- genres 总和为 100，列出 5-8 个主要风格
- languages 总和为 100
- moods 总和为 100，列出 3-5 种情绪
- eras 总和为 100，按 2020s/2010s/2000s/更早 分
- 百分比基于歌单中歌曲的风格推断，不需要精确
- summary 用中文`;

  const classifyResult = await chatRaw('你是一个专业的音乐品味分析师。', classifyPrompt);

  // 7. 古典音乐单独分析
  const classicalPlaylists = playlistSummary.filter(pl =>
    /古典|classical|钢琴|piano|交响|symphony|巴赫|贝多芬|肖邦/i.test(pl.name)
  );

  let classicalDetail = null;
  if (classicalPlaylists.length > 0) {
    const classicalPrompt = `你是一个古典音乐专家。分析以下古典音乐歌单的偏好特征。

## 古典歌单
${classicalPlaylists.map(pl => `- ${pl.name} (${pl.count}首): ${pl.sampleSongs.join(', ')}`).join('\n')}

请输出 JSON 格式:
{
  "composers": [{"name": "作曲家", "works": "代表作品"}],
  "periods": ["偏好的时期，如巴洛克/古典/浪漫/现代"],
  "instruments": ["偏好的乐器，如钢琴/弦乐/管弦乐"],
  "characteristics": "用1-2句话描述古典音乐偏好的特点"
}`;

    classicalDetail = await chatRaw('你是一个古典音乐专家。', classicalPrompt);
  }

  // 8. 生成 taste.md
  const lines = [];
  lines.push('# 听歌品味');
  lines.push('');
  lines.push(`> 基于 ${allPlaylists.length} 个自建歌单、${totalSongs} 首歌曲分析生成`);
  lines.push('');

  lines.push('## 风格偏好');
  for (const g of classifyResult.genres || []) {
    lines.push(`- ${g.name} (${g.percentage}%): ${g.description}。代表: ${g.artists}`);
  }
  lines.push('');

  lines.push('## 语言分布');
  for (const l of classifyResult.languages || []) {
    lines.push(`- ${l.name}: ${l.percentage}%`);
  }
  lines.push('');

  lines.push('## 情绪偏好');
  for (const m of classifyResult.moods || []) {
    lines.push(`- ${m.name} (${m.percentage}%): ${m.description}`);
  }
  lines.push('');

  lines.push('## 年代分布');
  for (const e of classifyResult.eras || []) {
    lines.push(`- ${e.name}: ${e.percentage}%`);
  }
  lines.push('');

  if (classicalDetail) {
    lines.push('## 古典音乐偏好');
    if (classicalDetail.composers?.length > 0) {
      lines.push(`- 偏好作曲家: ${classicalDetail.composers.map(c => `${c.name}(${c.works})`).join('、')}`);
    }
    if (classicalDetail.periods?.length > 0) {
      lines.push(`- 偏好时期: ${classicalDetail.periods.join('、')}`);
    }
    if (classicalDetail.instruments?.length > 0) {
      lines.push(`- 偏好乐器: ${classicalDetail.instruments.join('、')}`);
    }
    if (classicalDetail.characteristics) {
      lines.push(`- 特点: ${classicalDetail.characteristics}`);
    }
    lines.push('');
  }

  lines.push('## 高频艺术家');
  for (const [name, count] of topArtists.slice(0, 15)) {
    lines.push(`- ${name} (${count}首)`);
  }
  lines.push('');

  lines.push('## 品味总结');
  lines.push(classifyResult.summary || '暂无');

  writeFileSync(join(config.paths.user, 'taste.md'), lines.join('\n'), 'utf-8');

  return {
    success: true,
    stats: {
      playlists: allPlaylists.length,
      tracks: totalSongs,
      topArtists: topArtists.slice(0, 5).map(([name]) => name),
    },
    summary: classifyResult.summary || '',
    genres: classifyResult.genres || [],
    languages: classifyResult.languages || [],
  };
}

export default {
  loginWithPhone,
  getQrKey,
  createQrCode,
  checkQrStatus,
  checkLoginStatus,
  getUserPlaylists,
  getPlaylistTracks,
  getLikedSongs,
  generateTasteProfile,
  distillTaste,
  logout,
};
