<template>
  <div class="now-playing" v-if="song">
    <div class="cover-art">
      <div class="cover-placeholder">
        <div class="music-icon">♪</div>
      </div>
      <div class="playing-animation" v-if="isPlaying">
        <div class="bar"></div>
        <div class="bar"></div>
        <div class="bar"></div>
      </div>
    </div>

    <div class="song-details">
      <div class="song-name">{{ song.name }}</div>
      <div class="song-artist">{{ song.artist }}</div>
      <div class="song-album" v-if="song.album">{{ song.album }}</div>
    </div>

    <div class="reason" v-if="reason">
      <div class="reason-label">推荐理由</div>
      <div class="reason-text">{{ reason }}</div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  song: {
    type: Object,
    default: null,
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
  reason: {
    type: String,
    default: '',
  },
});
</script>

<style scoped>
.now-playing {
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
}

.cover-art {
  width: 200px;
  height: 200px;
  margin: 0 auto 1.5rem;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: var(--bg-tertiary);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-tertiary), var(--accent));
}

.music-icon {
  font-size: 4rem;
  color: rgba(255, 255, 255, 0.8);
}

.playing-animation {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 3px;
  align-items: flex-end;
  height: 20px;
}

.bar {
  width: 4px;
  background: var(--accent);
  border-radius: 2px;
  animation: bounce 1s infinite;
}

.bar:nth-child(1) {
  height: 60%;
  animation-delay: 0s;
}

.bar:nth-child(2) {
  height: 100%;
  animation-delay: 0.2s;
}

.bar:nth-child(3) {
  height: 40%;
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 100% {
    transform: scaleY(1);
  }
  50% {
    transform: scaleY(0.5);
  }
}

.song-details {
  margin-bottom: 1.5rem;
}

.song-name {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.song-artist {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.song-album {
  font-size: 0.85rem;
  color: var(--text-secondary);
  opacity: 0.7;
}

.reason {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem;
  text-align: left;
}

.reason-label {
  font-size: 0.75rem;
  color: var(--accent);
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}

.reason-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
}
</style>
