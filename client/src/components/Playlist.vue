<template>
  <div class="playlist">
    <div class="playlist-header">
      <h3 class="playlist-title">{{ title }}</h3>
      <span class="playlist-count">{{ songs.length }} 首</span>
    </div>

    <div class="playlist-songs">
      <div
        v-for="(song, index) in songs"
        :key="song.id || index"
        class="song-item"
        :class="{ active: currentIndex === index }"
        @click="$emit('play', index)"
      >
        <div class="song-index">
          <span v-if="currentIndex === index && isPlaying" class="playing-icon">▶</span>
          <span v-else>{{ index + 1 }}</span>
        </div>
        <div class="song-info">
          <div class="song-name">{{ song.name }}</div>
          <div class="song-artist">{{ song.artist }}</div>
        </div>
        <div class="song-duration" v-if="song.duration">
          {{ formatDuration(song.duration) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: '播放列表',
  },
  songs: {
    type: Array,
    default: () => [],
  },
  currentIndex: {
    type: Number,
    default: -1,
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['play']);

function formatDuration(ms) {
  if (!ms) return '';
  const seconds = Math.floor(ms / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
</script>

<style scoped>
.playlist {
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
}

.playlist-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.playlist-title {
  font-size: 1rem;
  font-weight: 600;
}

.playlist-count {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.playlist-songs {
  max-height: 400px;
  overflow-y: auto;
}

.song-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  transition: background 0.2s;
}

.song-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.song-item.active {
  background: rgba(233, 69, 96, 0.1);
}

.song-index {
  width: 30px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.song-item.active .song-index {
  color: var(--accent);
}

.playing-icon {
  font-size: 0.7rem;
}

.song-info {
  flex: 1;
  min-width: 0;
}

.song-name {
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-artist {
  font-size: 0.8rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-duration {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-left: 1rem;
}
</style>
