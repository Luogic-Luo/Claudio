import NeteaseCloudMusicApiModule from 'NeteaseCloudMusicApi';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadCookie } from './netease-user.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ALL_SONGS_FILE = join(ROOT, 'user', 'all-songs.json');
const TASTE_FILE = join(ROOT, 'user', 'taste.md');

const NeteaseCloudMusicApi = NeteaseCloudMusicApiModule.default || NeteaseCloudMusicApiModule;
const { search, song_url_v1, lyric, recommend_songs } = NeteaseCloudMusicApi;

export async function searchSongs(keyword, limit = 10) {
  try {
    const cookie = loadCookie();
    const params = { keywords: keyword, limit };
    if (cookie) params.cookie = cookie;
    const response = await search(params);
    const data = response.body;

    if (data.code !== 200) {
      throw new Error(`Search failed: ${data.code}`);
    }

    const songs = data.result?.songs || [];
    return songs.map(song => ({
      id: song.id,
      name: song.name,
      artist: song.artists?.map(a => a.name).join(', ') || '',
      album: song.album?.name || '',
      duration: song.duration,
    }));
  } catch (error) {
    console.error('Search songs failed:', error.message);
    return [];
  }
}

export async function getSongUrl(songId) {
  try {
    const cookie = loadCookie();
    const params = { id: songId, level: 'exhigh', encodeType: 'flac' };
    if (cookie) params.cookie = cookie;
    const response = await song_url_v1(params);
    const data = response.body;

    const songData = data.data?.[0];
    if (!songData?.url) {
      return null;
    }

    return {
      url: songData.url,
      size: songData.size,
      type: songData.type,
      freeTrial: !!songData.freeTrialInfo,
      duration: songData.freeTrialInfo ? (songData.freeTrialInfo.end - songData.freeTrialInfo.start) * 1000 : null,
    };
  } catch (error) {
    console.error('Get song url failed:', error.message);
    return null;
  }
}

export async function getLyric(songId) {
  try {
    const cookie = loadCookie();
    const params = { id: songId };
    if (cookie) params.cookie = cookie;
    const response = await lyric(params);
    const data = response.body;

    if (data.code !== 200) {
      return null;
    }

    return {
      lrc: data.lrc?.lyric || '',
      tlyric: data.tlyric?.lyric || '',
    };
  } catch (error) {
    console.error('Get lyric failed:', error.message);
    return null;
  }
}

export async function getRecommendSongs() {
  try {
    const cookie = loadCookie();
    const params = {};
    if (cookie) params.cookie = cookie;
    const response = await recommend_songs(params);
    const data = response.body;

    if (data.code !== 200) {
      return [];
    }

    const songs = data.data?.dailySongs || [];
    return songs.map(song => ({
      id: song.id,
      name: song.name,
      artist: song.ar?.map(a => a.name).join(', ') || '',
      album: song.al?.name || '',
      duration: song.dt,
    }));
  } catch (error) {
    console.error('Get recommend songs failed:', error.message);
    return [];
  }
}

// --- 推荐引擎 ---

let allSongsCache = { data: null, mtime: 0 };

function loadAllSongs() {
  if (!existsSync(ALL_SONGS_FILE)) return [];
  try {
    const stat = statSync(ALL_SONGS_FILE);
    if (allSongsCache.data && stat.mtimeMs === allSongsCache.mtime) {
      return allSongsCache.data;
    }
    const playlists = JSON.parse(readFileSync(ALL_SONGS_FILE, 'utf-8'));
    const songs = [];
    for (const pl of playlists) {
      for (const t of pl.tracks) {
        songs.push({ id: t.id, name: t.name, artist: t.artist, album: t.album, duration: t.duration });
      }
    }
    allSongsCache = { data: songs, mtime: stat.mtimeMs };
    return songs;
  } catch {
    return [];
  }
}

export function loadTaste() {
  try {
    if (existsSync(TASTE_FILE)) return readFileSync(TASTE_FILE, 'utf-8');
  } catch {}
  return '';
}

function fisherYatesShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function recommendSongs(count = 10, recentPlayIds = []) {
  const library = loadAllSongs();
  if (library.length === 0) return { songs: [], taste: loadTaste() };

  const recentSet = new Set(recentPlayIds.map(String));
  const available = library.filter(s => !recentSet.has(String(s.id)));

  const libraryCount = Math.max(1, Math.round(count * 0.7));
  const discoveryCount = count - libraryCount;

  // 70% from library
  const shuffled = fisherYatesShuffle(available);
  const librarySongs = shuffled.slice(0, libraryCount).map(s => ({ ...s, source: 'library' }));

  // 30% from NetEase daily recommendations
  let discoverySongs = [];
  if (discoveryCount > 0) {
    try {
      const daily = await getRecommendSongs();
      const dailyFiltered = daily.filter(s => !recentSet.has(String(s.id)));
      discoverySongs = fisherYatesShuffle(dailyFiltered)
        .slice(0, discoveryCount)
        .map(s => ({ ...s, source: 'discovery' }));
    } catch {
      // fallback: pick more from library
      const extra = shuffled.slice(libraryCount, libraryCount + discoveryCount);
      discoverySongs = extra.map(s => ({ ...s, source: 'library' }));
    }
  }

  const result = fisherYatesShuffle([...librarySongs, ...discoverySongs]);
  return { songs: result, taste: loadTaste() };
}

export async function resolvePlayList(playRequests) {
  const results = [];

  for (const request of playRequests) {
    let songs = [];

    if (request.id) {
      const url = await getSongUrl(request.id);
      if (url) {
        songs.push({
          ...request,
          url: url.url,
        });
      }
    } else if (request.query) {
      const searchResults = await searchSongs(request.query, 3);
      if (searchResults.length > 0) {
        const song = searchResults[0];
        const url = await getSongUrl(song.id);
        if (url) {
          songs.push({
            ...song,
            url: url.url,
          });
        }
      }
    }

    results.push(...songs);
  }

  return results;
}

export default {
  searchSongs,
  getSongUrl,
  getLyric,
  getRecommendSongs,
  resolvePlayList,
  recommendSongs,
  loadTaste,
};
