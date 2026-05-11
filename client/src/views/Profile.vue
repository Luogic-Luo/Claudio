<template>
  <div class="profile">
    <h1 class="page-title">个人中心</h1>

    <div class="section">
      <h2 class="section-title">音乐品味</h2>
      <div class="card">
        <div class="taste-content" v-if="tasteSummary">{{ tasteSummary }}</div>
        <div class="taste-content taste-empty" v-else-if="!tasteLoading">暂无品味数据，请先在设置中登录网易云账号并生成音乐品味</div>
        <div class="taste-loading" v-if="tasteLoading">
          <span class="loading-dot"></span>
          <span>AI 正在分析你的音乐品味...</span>
        </div>
        <button class="refresh-btn" @click="refreshTaste" :disabled="tasteLoading" title="重新生成">
          {{ tasteLoading ? '生成中...' : '刷新品味分析' }}
        </button>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">今日播放计划</h2>
      <div class="plans-list">
        <div v-for="plan in todayPlans" :key="plan.id" class="plan-card">
          <div class="plan-time">{{ plan.slot_time }}</div>
          <div class="plan-songs">
            <div v-for="(song, index) in plan.songs" :key="index" class="song-item">
              {{ song.name }} - {{ song.artist }}
            </div>
          </div>
          <div class="plan-reason" v-if="plan.reason">{{ plan.reason }}</div>
        </div>
        <div v-if="todayPlans.length === 0" class="empty-state">
          暂无播放计划
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">播放历史</h2>
      <div class="history-list">
        <div v-for="item in playHistory" :key="item.id" class="history-item">
          <div class="history-song">{{ item.song_name }}</div>
          <div class="history-artist">{{ item.artist }}</div>
          <div class="history-time">{{ formatTime(item.played_at) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const tasteSummary = ref('');
const tasteLoading = ref(false);
const todayPlans = ref([]);
const playHistory = ref([]);

onMounted(async () => {
  await Promise.all([
    loadTasteSummary(),
    loadTodayPlans(),
    loadPlayHistory(),
  ]);
});

async function loadTasteSummary(refresh = false) {
  tasteLoading.value = true;
  try {
    const url = refresh ? '/api/taste/summary?refresh=true' : '/api/taste/summary';
    const response = await axios.get(url);
    tasteSummary.value = response.data.summary;
  } catch (error) {
    console.error('Failed to load taste summary:', error);
  } finally {
    tasteLoading.value = false;
  }
}

function refreshTaste() {
  loadTasteSummary(true);
}

async function loadTodayPlans() {
  try {
    const response = await axios.get('/api/plan/today');
    todayPlans.value = response.data;
  } catch (error) {
    console.error('Failed to load plans:', error);
  }
}

async function loadPlayHistory() {
  try {
    const response = await axios.get('/api/history?limit=20');
    playHistory.value = response.data;
  } catch (error) {
    console.error('Failed to load history:', error);
  }
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.profile {
  max-width: 800px;
  margin: 0 auto;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 2rem;
  color: var(--accent);
}

.section {
  margin-bottom: 2rem;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.taste-content {
  font-size: 0.95rem;
  line-height: 1.8;
  color: var(--text-primary);
  margin-bottom: 1rem;
}

.taste-empty {
  color: var(--text-secondary);
  font-style: italic;
}

.taste-loading {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.loading-dot {
  width: 8px;
  height: 8px;
  background: var(--accent);
  border-radius: 50%;
  animation: pulse-dot 1s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.refresh-btn {
  margin-top: 0.5rem;
  padding: 0.4rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}

.refresh-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.plans-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.plan-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1rem 1.5rem;
}

.plan-time {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 0.5rem;
}

.plan-songs {
  margin-bottom: 0.5rem;
}

.song-item {
  padding: 0.25rem 0;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.plan-reason {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.history-list {
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.history-item:last-child {
  border-bottom: none;
}

.history-song {
  flex: 1;
  font-weight: 500;
}

.history-artist {
  width: 150px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.history-time {
  width: 80px;
  text-align: right;
  color: var(--text-secondary);
  font-size: 0.85rem;
}
</style>
