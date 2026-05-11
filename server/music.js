import NeteaseCloudMusicApiModule from 'NeteaseCloudMusicApi';
import { loadCookie } from './netease-user.js';

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
};
