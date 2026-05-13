import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

export const usePlayerStore = defineStore('player', () => {
  const playlist = ref([]);
  const currentIndex = ref(-1);
  const isPlaying = ref(false);
  const currentTime = ref(0);
  const duration = ref(0);
  const volume = ref(80);
  const radioMode = ref(false);
  const radioLoading = ref(false);
  const djSpeaking = ref({ active: false, text: '' });
  const lyrics = ref([]);
  const lyricsLoading = ref(false);
  const lyricsLoaded = ref(false);
  const showLyrics = ref(false);

  let radioRequestCallback = null;

  const audio = new Audio();
  audio.volume = volume.value / 100;

  const currentSong = computed(() => {
    if (currentIndex.value >= 0 && currentIndex.value < playlist.value.length) {
      return playlist.value[currentIndex.value];
    }
    return null;
  });

  const currentLyricIndex = computed(() => {
    const lines = lyrics.value;
    if (lines.length === 0) return -1;
    const ct = currentTime.value;
    let lo = 0, hi = lines.length - 1, result = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lines[mid].time <= ct) {
        result = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return result;
  });

  audio.addEventListener('timeupdate', () => {
    currentTime.value = audio.currentTime;
  });

  audio.addEventListener('loadedmetadata', () => {
    duration.value = audio.duration;
  });

  audio.addEventListener('ended', () => {
    next();
  });

  audio.addEventListener('error', (e) => {
    console.error('Audio error:', e);
    isPlaying.value = false;
  });

  function loadPlaylist(songs) {
    playlist.value = songs;
    if (songs.length > 0) {
      currentIndex.value = 0;
      loadSong(songs[0]);
    }
  }

  function addSongs(songs) {
    if (songs.length === 0) return;
    playlist.value.push(...songs);
  }

  function parseLRC(lrcStr, tlyricStr) {
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;
    const parseLines = (str) => {
      const map = new Map();
      for (const line of str.split('\n')) {
        const times = [];
        let match;
        while ((match = timeRegex.exec(line)) !== null) {
          const mins = parseInt(match[1]);
          const secs = parseInt(match[2]);
          const ms = match[3].length === 2 ? parseInt(match[3]) * 10 : parseInt(match[3]);
          times.push(mins * 60 + secs + ms / 1000);
        }
        const text = line.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '').trim();
        if (text) {
          for (const t of times) map.set(t, text);
        }
        timeRegex.lastIndex = 0;
      }
      return map;
    };

    const lrcMap = parseLines(lrcStr);
    const tlyricMap = tlyricStr ? parseLines(tlyricStr) : new Map();
    const allTimes = [...new Set([...lrcMap.keys(), ...tlyricMap.keys()])].sort((a, b) => a - b);
    return allTimes.map(time => ({
      time,
      text: lrcMap.get(time) || '',
      translation: tlyricMap.get(time) || '',
    }));
  }

  async function fetchLyrics() {
    const song = currentSong.value;
    if (!song?.id) {
      lyrics.value = [];
      lyricsLoaded.value = true;
      return;
    }
    const songId = song.id;
    lyricsLoading.value = true;
    lyricsLoaded.value = false;
    try {
      const response = await axios.get(`/api/lyric?id=${songId}`);
      if (currentSong.value?.id !== songId) return;
      const { lrc, tlyric } = response.data;
      lyrics.value = lrc ? parseLRC(lrc, tlyric || '') : [];
    } catch (error) {
      console.error('Fetch lyrics failed:', error);
      lyrics.value = [];
    } finally {
      lyricsLoading.value = false;
      lyricsLoaded.value = true;
    }
  }

  function loadSong(song) {
    lyrics.value = [];
    lyricsLoaded.value = false;
    if (song.url) {
      audio.src = song.url;
      audio.load();
      if (isPlaying.value) {
        audio.play().catch(console.error);
      }
    }
    fetchLyrics();
  }

  function play() {
    if (!audio.src && playlist.value.length > 0) {
      loadSong(playlist.value[0]);
    }
    audio.play().then(() => {
      isPlaying.value = true;
    }).catch(console.error);
  }

  function pause() {
    audio.pause();
    isPlaying.value = false;
  }

  function togglePlay() {
    if (isPlaying.value) {
      pause();
    } else {
      play();
    }
  }

  function seek(time) {
    audio.currentTime = time;
    currentTime.value = time;
  }

  function setVolume(value) {
    volume.value = value;
    audio.volume = value / 100;
  }

  function toggleRadioMode() {
    radioMode.value = !radioMode.value;
  }

  function setRadioLoading(val) {
    radioLoading.value = val;
  }

  function setRadioRequestCallback(fn) {
    radioRequestCallback = fn;
  }

  function startDJSpeaking(text) {
    djSpeaking.value = { active: true, text };
  }

  function stopDJSpeaking() {
    djSpeaking.value = { active: false, text: '' };
  }

  function next() {
    if (currentIndex.value < playlist.value.length - 1) {
      currentIndex.value++;
      loadSong(playlist.value[currentIndex.value]);
    } else if (radioMode.value && !radioLoading.value) {
      // 电台模式：歌曲播完，请求下一首（防重入）
      radioLoading.value = true;
      isPlaying.value = false;
      if (radioRequestCallback) radioRequestCallback();
    } else {
      isPlaying.value = false;
    }
  }

  function prev() {
    if (currentIndex.value > 0) {
      currentIndex.value--;
      loadSong(playlist.value[currentIndex.value]);
    }
  }

  function playAt(index) {
    if (index >= 0 && index < playlist.value.length) {
      currentIndex.value = index;
      loadSong(playlist.value[index]);
      play();
    }
  }

  return {
    playlist,
    currentIndex,
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    radioMode,
    radioLoading,
    djSpeaking,
    lyrics,
    lyricsLoading,
    lyricsLoaded,
    showLyrics,
    currentLyricIndex,
    loadPlaylist,
    addSongs,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    next,
    prev,
    playAt,
    toggleRadioMode,
    setRadioLoading,
    setRadioRequestCallback,
    startDJSpeaking,
    stopDJSpeaking,
  };
});
