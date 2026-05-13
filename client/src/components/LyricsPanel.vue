<template>
  <Transition name="lyrics-slide">
    <div class="lyrics-panel" v-if="playerStore.showLyrics">
      <div class="lyrics-header">
        <div class="lyrics-song-info">
          <div class="lyrics-song-name">{{ playerStore.currentSong?.name }}</div>
          <div class="lyrics-song-artist">{{ playerStore.currentSong?.artist }}</div>
        </div>
        <button class="lyrics-close" @click="playerStore.showLyrics = false">
          <span>✕</span>
        </button>
      </div>

      <div class="lyrics-scroll" ref="scrollContainer" @scroll="onScroll">
        <div class="lyrics-status" v-if="playerStore.lyricsLoading">
          <div class="loading-spinner"></div>
          <span>歌词加载中...</span>
        </div>

        <div class="lyrics-status" v-else-if="playerStore.lyricsLoaded && playerStore.lyrics.length === 0">
          <span class="no-lyrics-icon">♪</span>
          <span>暂无歌词</span>
        </div>

        <template v-else>
          <div class="lyrics-spacer"></div>
          <div
            v-for="(line, index) in playerStore.lyrics"
            :key="index"
            class="lyrics-line"
            :class="{
              active: index === playerStore.currentLyricIndex,
              past: index < playerStore.currentLyricIndex
            }"
            @click="seekToLine(line.time)"
          >
            <div class="lyrics-original">{{ line.text }}</div>
            <div class="lyrics-translation" v-if="line.translation">{{ line.translation }}</div>
          </div>
          <div class="lyrics-spacer"></div>
        </template>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { usePlayerStore } from '../stores/player';

const playerStore = usePlayerStore();
const scrollContainer = ref(null);
let isUserScrolling = false;
let scrollTimeout = null;

watch(() => playerStore.currentLyricIndex, (newIndex) => {
  if (newIndex < 0 || isUserScrolling) return;
  nextTick(() => scrollToActiveLine());
});

function scrollToActiveLine() {
  const container = scrollContainer.value;
  if (!container) return;
  const activeLine = container.querySelector('.lyrics-line.active');
  if (!activeLine) return;
  const containerHeight = container.clientHeight;
  const targetScroll = activeLine.offsetTop - containerHeight / 2 + activeLine.offsetHeight / 2;
  container.scrollTo({ top: targetScroll, behavior: 'smooth' });
}

function onScroll() {
  isUserScrolling = true;
  if (scrollTimeout) clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => { isUserScrolling = false; }, 3000);
}

function seekToLine(time) {
  playerStore.seek(time);
}
</script>

<style scoped>
.lyrics-panel {
  position: fixed;
  bottom: 90px;
  left: 0;
  right: 0;
  height: 45vh;
  background: var(--bg-primary);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  z-index: 101;
  box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
}

.lyrics-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.lyrics-song-name {
  font-size: 0.95rem;
  font-weight: 600;
}

.lyrics-song-artist {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.lyrics-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 50%;
  transition: all 0.2s;
  font-size: 1rem;
}

.lyrics-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.lyrics-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 2rem;
  scroll-behavior: smooth;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.lyrics-scroll::-webkit-scrollbar {
  display: none;
}

.lyrics-spacer {
  height: 35vh;
}

.lyrics-line {
  padding: 0.6rem 0;
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: center;
}

.lyrics-original {
  font-size: 1rem;
  color: var(--text-secondary);
  transition: all 0.3s ease;
  line-height: 1.6;
}

.lyrics-translation {
  font-size: 0.85rem;
  color: rgba(160, 160, 160, 0.6);
  margin-top: 0.2rem;
  line-height: 1.4;
  transition: all 0.3s ease;
}

.lyrics-line.active .lyrics-original {
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--accent);
}

.lyrics-line.active .lyrics-translation {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.lyrics-line.past .lyrics-original {
  opacity: 0.5;
}

.lyrics-line.past .lyrics-translation {
  opacity: 0.35;
}

.lyrics-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.no-lyrics-icon {
  font-size: 2.5rem;
  opacity: 0.4;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.lyrics-slide-enter-active {
  transition: all 0.3s ease-out;
}

.lyrics-slide-leave-active {
  transition: all 0.2s ease-in;
}

.lyrics-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.lyrics-slide-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
