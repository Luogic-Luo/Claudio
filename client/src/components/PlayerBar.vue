<template>
  <div class="player-bar" v-if="playerStore.currentSong">
    <div class="player-info">
      <div class="song-cover">
        <div class="cover-placeholder">♪</div>
      </div>
      <div class="song-details">
        <div class="song-name">{{ playerStore.currentSong.name }}</div>
        <div class="song-artist">{{ playerStore.currentSong.artist }}</div>
      </div>
    </div>

    <div class="player-controls">
      <button class="control-btn" @click="playerStore.prev">
        <span>⏮</span>
      </button>
      <button class="control-btn play-btn" @click="playerStore.togglePlay">
        <span>{{ playerStore.isPlaying ? '⏸' : '▶' }}</span>
      </button>
      <button class="control-btn" @click="playerStore.next" :disabled="playerStore.radioLoading">
        <span>⏭</span>
      </button>
      <button
        class="control-btn radio-btn"
        :class="{ active: playerStore.radioMode }"
        @click="playerStore.toggleRadioMode()"
        :disabled="playerStore.radioLoading"
        title="AI 电台模式"
      >
        <span>📻</span>
        <span v-if="playerStore.radioLoading" class="radio-label">思考中...</span>
      </button>
    </div>

    <div class="player-progress">
      <div class="progress-bar" @click="seek">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
      <div class="time-info">
        <span>{{ formatTime(playerStore.currentTime) }}</span>
        <span>{{ formatTime(playerStore.duration) }}</span>
      </div>
    </div>

    <div class="player-volume" @mouseenter="showVolume = true" @mouseleave="showVolume = false">
      <button class="volume-icon-btn" @click="toggleMute">
        <span v-if="playerStore.volume === 0">🔇</span>
        <span v-else-if="playerStore.volume < 30">🔈</span>
        <span v-else-if="playerStore.volume < 70">🔉</span>
        <span v-else>🔊</span>
      </button>
      <Transition name="vol-popup">
        <div class="volume-popup" v-if="showVolume">
          <div class="volume-track" @mousedown="onVolumeDown" @touchstart="onVolumeDown" ref="volumeTrack">
            <div class="volume-fill" :style="{ height: playerStore.volume + '%' }"></div>
            <div class="volume-thumb" :style="{ bottom: playerStore.volume + '%' }"></div>
          </div>
          <span class="volume-value">{{ playerStore.volume }}</span>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { usePlayerStore } from '../stores/player';

const playerStore = usePlayerStore();
const showVolume = ref(false);
const volumeTrack = ref(null);
let prevVolume = 80;

const progressPercent = computed(() => {
  if (playerStore.duration === 0) return 0;
  return (playerStore.currentTime / playerStore.duration) * 100;
});

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seek(event) {
  const rect = event.target.getBoundingClientRect();
  const percent = (event.clientX - rect.left) / rect.width;
  playerStore.seek(percent * playerStore.duration);
}

function toggleMute() {
  if (playerStore.volume > 0) {
    prevVolume = playerStore.volume;
    playerStore.setVolume(0);
  } else {
    playerStore.setVolume(prevVolume || 80);
  }
}

function calcVolume(clientY) {
  const rect = volumeTrack.value.getBoundingClientRect();
  const percent = 100 - ((clientY - rect.top) / rect.height) * 100;
  playerStore.setVolume(Math.round(Math.max(0, Math.min(100, percent))));
}

function onVolumeDown(event) {
  event.preventDefault();
  const clientY = event.touches ? event.touches[0].clientY : event.clientY;
  calcVolume(clientY);

  const moveHandler = (e) => {
    e.preventDefault();
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    calcVolume(y);
  };

  const upHandler = () => {
    document.removeEventListener('mousemove', moveHandler);
    document.removeEventListener('mouseup', upHandler);
    document.removeEventListener('touchmove', moveHandler);
    document.removeEventListener('touchend', upHandler);
  };

  document.addEventListener('mousemove', moveHandler);
  document.addEventListener('mouseup', upHandler);
  document.addEventListener('touchmove', moveHandler, { passive: false });
  document.addEventListener('touchend', upHandler);
}
</script>

<style scoped>
.player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 90px;
  background: var(--bg-secondary);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  padding: 0 2rem;
  gap: 2rem;
  z-index: 100;
}

.player-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 200px;
}

.song-cover {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-tertiary);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--accent);
}

.song-name {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 2px;
}

.song-artist {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.player-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.control-btn {
  background: none;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--accent);
}

.radio-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.8rem;
}

.radio-btn.active {
  color: var(--accent);
  background: rgba(233, 69, 96, 0.15);
  border-radius: 20px;
  padding: 0.4rem 0.75rem;
}

.radio-label {
  font-size: 0.65rem;
  white-space: nowrap;
  color: var(--text-secondary);
}

.play-btn {
  width: 45px;
  height: 45px;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.play-btn:hover {
  background: var(--accent-hover);
  color: white;
}

.player-progress {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  cursor: pointer;
}

.progress-fill {
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  transition: width 0.1s;
}

.time-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.player-volume {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 40px;
}

.volume-icon-btn {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 50%;
  transition: background 0.2s;
  line-height: 1;
}

.volume-icon-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.volume-popup {
  position: absolute;
  bottom: 52px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  background: var(--bg-secondary);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  user-select: none;
  -webkit-user-select: none;
}

.volume-track {
  position: relative;
  width: 24px;
  height: 100px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.volume-track::before {
  content: '';
  position: absolute;
  width: 4px;
  height: 100%;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.volume-fill {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 4px;
  background: var(--accent);
  border-radius: 2px;
}

.volume-thumb {
  position: absolute;
  left: 50%;
  transform: translate(-50%, 50%);
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
  pointer-events: none;
  z-index: 1;
}

.volume-value {
  font-size: 0.7rem;
  color: var(--text-secondary);
  min-width: 20px;
  text-align: center;
}

.vol-popup-enter-active {
  transition: all 0.15s ease-out;
}

.vol-popup-leave-active {
  transition: all 0.1s ease-in;
}

.vol-popup-enter-from,
.vol-popup-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(8px);
}
</style>
