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

  let radioRequestCallback = null;

  const audio = new Audio();
  audio.volume = volume.value / 100;

  const currentSong = computed(() => {
    if (currentIndex.value >= 0 && currentIndex.value < playlist.value.length) {
      return playlist.value[currentIndex.value];
    }
    return null;
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

  function loadSong(song) {
    if (song.url) {
      audio.src = song.url;
      audio.load();
      if (isPlaying.value) {
        audio.play().catch(console.error);
      }
    }
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
    } else if (radioMode.value && radioLoading.value) {
      // 电台流程中歌曲自然播完 → 重置状态，允许下一轮请求
      radioLoading.value = false;
      isPlaying.value = false;
    } else if (radioMode.value && !radioLoading.value) {
      // 歌单播完，请求电台下一首
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
