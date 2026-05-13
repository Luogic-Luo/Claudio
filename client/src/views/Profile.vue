<template>
  <div class="profile">
    <h1 class="page-title">个人中心</h1>

    <div class="section">
      <h2 class="section-title">音乐品味</h2>
      <div class="card" v-if="tasteSections.length > 0">
        <div class="taste-subtitle" v-if="tasteSubtitle">{{ tasteSubtitle }}</div>
        <div v-for="(section, i) in tasteSections" :key="i" class="taste-section">
          <h3 class="taste-heading">{{ section.title }}</h3>
          <div v-if="section.type === 'summary'" class="taste-summary-text">{{ section.content }}</div>
          <ul v-else class="taste-list">
            <li v-for="(item, j) in section.items" :key="j" class="taste-item">
              <span v-if="item.name" class="taste-item-name">{{ item.name }}</span>
              <span v-if="item.pct" class="taste-item-pct">{{ item.pct }}</span>
              <span v-if="item.desc" class="taste-item-desc">{{ item.desc }}</span>
            </li>
          </ul>
        </div>
      </div>
      <div class="card" v-else>
        <div class="taste-empty">暂无品味数据，请先在设置中登录网易云账号并蒸馏听歌品味</div>
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

const tasteSections = ref([]);
const tasteSubtitle = ref('');
const todayPlans = ref([]);
const playHistory = ref([]);

onMounted(async () => {
  await Promise.all([
    loadTaste(),
    loadTodayPlans(),
    loadPlayHistory(),
  ]);
});

async function loadTaste() {
  try {
    const response = await axios.get('/api/taste');
    const md = response.data.taste || '';
    parseTasteMd(md);
  } catch (error) {
    console.error('Failed to load taste:', error);
  }
}

function parseTasteMd(md) {
  if (!md.trim()) return;
  const sections = [];
  let subtitle = '';
  const lines = md.split('\n');
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('# ')) continue;

    if (trimmed.startsWith('> ')) {
      subtitle = trimmed.slice(2);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: trimmed.slice(3), items: [], type: 'list' };
      continue;
    }

    if (current && trimmed.startsWith('- ')) {
      const content = trimmed.slice(2);
      const pctMatch = content.match(/\((\d+%?)\)/);
      const nameMatch = content.match(/^(.+?)\s*(?:\(|:)/);
      const descMatch = content.includes(': ') ? content.split(': ').slice(1).join(': ') : '';

      current.items.push({
        name: nameMatch ? nameMatch[1].trim() : content,
        pct: pctMatch ? pctMatch[1] : '',
        desc: descMatch || (pctMatch ? content.replace(/^.*?\)\s*\.?\s*/, '') : ''),
      });
      continue;
    }

    if (current && !trimmed.startsWith('#')) {
      current.type = 'summary';
      current.content = (current.content || '') + trimmed;
    }
  }
  if (current) sections.push(current);

  tasteSections.value = sections;
  tasteSubtitle.value = subtitle;
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

.taste-subtitle {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.taste-section {
  margin-bottom: 1.25rem;
}

.taste-section:last-child {
  margin-bottom: 0;
}

.taste-heading {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 0.6rem;
}

.taste-list {
  list-style: none;
  padding: 0;
}

.taste-item {
  padding: 0.3rem 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary);
}

.taste-item-name {
  font-weight: 500;
}

.taste-item-pct {
  color: var(--accent);
  font-size: 0.8rem;
  margin-left: 0.3rem;
}

.taste-item-desc {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.taste-summary-text {
  font-size: 0.9rem;
  line-height: 1.8;
  color: var(--text-primary);
}

.taste-empty {
  color: var(--text-secondary);
  font-style: italic;
  text-align: center;
  padding: 1rem;
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
