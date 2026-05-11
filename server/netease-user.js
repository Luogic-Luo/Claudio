import NeteaseCloudMusicApiModule from 'NeteaseCloudMusicApi';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import config from './config.js';

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
  logout,
};
