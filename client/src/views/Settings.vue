<template>
  <div class="settings">
    <h1 class="page-title">设置</h1>

    <!-- 网易云账号 -->
    <div class="section">
      <h2 class="section-title">网易云音乐账号</h2>
      <div class="settings-card">
        <div v-if="neteaseStatus.logged" class="logged-info">
          <div class="user-info">
            <span class="user-icon">👤</span>
            <span class="user-name">{{ neteaseStatus.nickname }}</span>
            <span class="status-badge connected">已登录</span>
            <span v-if="neteaseStatus.vipType > 0" class="status-badge vip">VIP</span>
            <span v-else class="status-badge no-vip">非VIP</span>
          </div>
          <div class="logged-actions">
            <button @click="distillTaste" class="action-btn" :disabled="distilling">
              {{ distilling ? '蒸馏中...' : '🧪 蒸馏听歌品味' }}
            </button>
            <button @click="logoutNetease" class="logout-btn" :disabled="loggingOut">
              {{ loggingOut ? '退出中...' : '退出登录' }}
            </button>
          </div>
          <div v-if="tasteResult" class="taste-result">
            <p>品味蒸馏完成！</p>
            <ul>
              <li>分析歌单: {{ tasteResult.stats.playlists }} 个</li>
              <li>总歌曲: {{ tasteResult.stats.tracks }} 首</li>
              <li>高频艺术家: {{ tasteResult.stats.topArtists.join(', ') }}</li>
            </ul>
            <div v-if="tasteResult.genres?.length > 0" class="taste-detail">
              <p class="detail-title">风格分布</p>
              <div class="genre-list">
                <span v-for="g in tasteResult.genres" :key="g.name" class="genre-tag">
                  {{ g.name }} {{ g.percentage }}%
                </span>
              </div>
            </div>
            <div v-if="tasteResult.summary" class="taste-summary">
              <p class="detail-title">品味总结</p>
              <p class="summary-text">{{ tasteResult.summary }}</p>
            </div>
          </div>
        </div>
        <div v-else class="login-section">
          <div class="login-tabs">
            <button
              :class="['tab-btn', { active: loginTab === 'phone' }]"
              @click="loginTab = 'phone'"
            >
              手机号登录
            </button>
            <button
              :class="['tab-btn', { active: loginTab === 'qr' }]"
              @click="loginTab = 'qr'; startQrLogin()"
            >
              扫码登录
            </button>
          </div>

          <div v-if="loginTab === 'phone'" class="phone-login">
            <div class="form-group">
              <label>手机号</label>
              <input v-model="phone" type="tel" placeholder="请输入手机号" class="input-field" />
            </div>
            <div class="form-group">
              <label>密码</label>
              <input v-model="password" type="password" placeholder="请输入密码" class="input-field" />
            </div>
            <button @click="loginWithPhone" class="login-btn" :disabled="logging">
              {{ logging ? '登录中...' : '登录' }}
            </button>
          </div>

          <div v-if="loginTab === 'qr'" class="qr-login">
            <div v-if="qrImage" class="qr-container">
              <img :src="qrImage" alt="QR Code" class="qr-image" />
              <p class="qr-tip">请使用网易云音乐 APP 扫码登录</p>
              <p class="qr-status">{{ qrStatusText }}</p>
            </div>
            <div v-else class="qr-loading">加载中...</div>
          </div>

          <p v-if="loginError" class="error-message">{{ loginError }}</p>
        </div>
      </div>
    </div>

    <!-- AI 配置 -->
    <div class="section">
      <h2 class="section-title">AI 配置</h2>
      <div class="settings-card">
        <div class="setting-item">
          <label class="setting-label">API Key</label>
          <input
            v-model="settings.mimoApiKey"
            type="password"
            placeholder="输入 mimo API Key"
            class="setting-input"
          />
        </div>
        <div class="setting-item">
          <label class="setting-label">模型</label>
          <select v-model="settings.mimoModel" class="setting-select">
            <option value="mimo-v2.5-pro">mimo-v2.5-pro</option>
          </select>
        </div>
      </div>
    </div>

    <!-- 调度设置 -->
    <div class="section">
      <h2 class="section-title">调度设置</h2>
      <div class="settings-card">
        <div class="setting-item" v-for="(schedule, index) in settings.schedules" :key="index">
          <label class="setting-label">{{ schedule.label }}</label>
          <input
            v-model="schedule.time"
            type="time"
            class="setting-input time-input"
          />
        </div>
      </div>
    </div>

    <div class="actions">
      <button @click="saveSettings" class="save-btn">保存设置</button>
      <button @click="resetSettings" class="reset-btn">重置</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import axios from 'axios';

const settings = ref({
  mimoApiKey: '',
  mimoModel: 'mimo-v2.5-pro',
  schedules: [
    { label: '早晨唤醒', time: '07:00' },
    { label: '上午工作', time: '09:00' },
    { label: '午间休息', time: '12:00' },
    { label: '下午提神', time: '14:00' },
    { label: '傍晚放松', time: '18:00' },
    { label: '夜间舒缓', time: '21:00' },
  ],
});

const neteaseStatus = ref({ logged: false });
const loginTab = ref('phone');
const phone = ref('');
const password = ref('');
const logging = ref(false);
const loginError = ref('');
const qrImage = ref('');
const qrKey = ref('');
const qrStatusText = ref('');
const distilling = ref(false);
const loggingOut = ref(false);
const tasteResult = ref(null);
let qrCheckInterval = null;

onMounted(async () => {
  loadSettings();
  await checkNeteaseStatus();
});

async function checkNeteaseStatus() {
  try {
    const response = await axios.get('/api/netease/status');
    neteaseStatus.value = response.data;
  } catch (error) {
    console.error('Check netease status failed:', error);
  }
}

async function loginWithPhone() {
  if (!phone.value || !password.value) {
    loginError.value = '请输入手机号和密码';
    return;
  }
  logging.value = true;
  loginError.value = '';
  try {
    const response = await axios.post('/api/netease/login', {
      phone: phone.value,
      password: password.value,
    });
    if (response.data.success) {
      await checkNeteaseStatus();
    } else {
      loginError.value = response.data.message || '登录失败';
    }
  } catch (error) {
    loginError.value = '登录请求失败';
  } finally {
    logging.value = false;
  }
}

async function startQrLogin() {
  try {
    const response = await axios.get('/api/netease/qr-key');
    qrKey.value = response.data.key;
    qrImage.value = response.data.qrimg;
    qrStatusText.value = '等待扫码...';
    startQrCheck();
  } catch (error) {
    loginError.value = '获取二维码失败';
  }
}

function startQrCheck() {
  if (qrCheckInterval) clearInterval(qrCheckInterval);
  qrCheckInterval = setInterval(async () => {
    try {
      const response = await axios.get('/api/netease/qr-check', {
        params: { key: qrKey.value },
      });
      if (response.data.success) {
        clearInterval(qrCheckInterval);
        qrStatusText.value = '登录成功！';
        await checkNeteaseStatus();
      } else {
        qrStatusText.value = response.data.message || '等待扫码...';
      }
    } catch (error) {
      qrStatusText.value = '检查状态失败';
    }
  }, 2000);
}

async function distillTaste() {
  distilling.value = true;
  tasteResult.value = null;
  try {
    const response = await axios.post('/api/netease/distill-taste', null, { timeout: 120000 });
    tasteResult.value = response.data;
  } catch (error) {
    alert('蒸馏品味失败: ' + (error.response?.data?.message || error.message));
  } finally {
    distilling.value = false;
  }
}

async function logoutNetease() {
  if (!confirm('确定要退出网易云音乐账号吗？')) return;
  loggingOut.value = true;
  try {
    await axios.post('/api/netease/logout');
    neteaseStatus.value = { logged: false };
    tasteResult.value = null;
  } catch (error) {
    alert('退出失败: ' + (error.response?.data?.message || error.message));
  } finally {
    loggingOut.value = false;
  }
}

function loadSettings() {
  const saved = localStorage.getItem('claudio-settings');
  if (saved) {
    try {
      settings.value = { ...settings.value, ...JSON.parse(saved) };
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
}

function saveSettings() {
  localStorage.setItem('claudio-settings', JSON.stringify(settings.value));
  alert('设置已保存');
}

function resetSettings() {
  if (confirm('确定要重置所有设置吗？')) {
    localStorage.removeItem('claudio-settings');
    loadSettings();
  }
}
</script>

<style scoped>
.settings {
  max-width: 600px;
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
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--text-primary);
}

.settings-card {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 1.5rem;
}

.logged-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.user-icon {
  font-size: 1.5rem;
}

.user-name {
  font-weight: 600;
  font-size: 1.1rem;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.1);
}

.status-badge.connected {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-badge.vip {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.status-badge.no-vip {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-secondary);
}

.action-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.action-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.logged-actions {
  display: flex;
  gap: 0.75rem;
}

.logout-btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover:not(:disabled) {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.logout-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.taste-result {
  background: var(--bg-tertiary);
  border-radius: 8px;
  padding: 1rem;
  font-size: 0.9rem;
}

.taste-result p {
  margin-bottom: 0.5rem;
  font-weight: 600;
}

.taste-result ul {
  list-style: none;
  padding: 0;
}

.taste-result li {
  padding: 0.25rem 0;
  color: var(--text-secondary);
}

.taste-detail {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.genre-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.genre-tag {
  padding: 0.2rem 0.6rem;
  border-radius: 12px;
  background: rgba(233, 69, 96, 0.15);
  color: var(--accent);
  font-size: 0.8rem;
}

.taste-summary {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.summary-text {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
}

.login-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.tab-btn {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  border-color: var(--accent);
  background: rgba(233, 69, 96, 0.1);
  color: var(--accent);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.input-field {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
}

.input-field:focus {
  border-color: var(--accent);
}

.login-btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: white;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.5rem;
}

.login-btn:disabled {
  opacity: 0.5;
}

.qr-login {
  text-align: center;
}

.qr-container {
  padding: 1rem;
}

.qr-image {
  width: 200px;
  height: 200px;
  border-radius: 8px;
  background: white;
  padding: 10px;
}

.qr-tip {
  margin-top: 1rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.qr-status {
  margin-top: 0.5rem;
  color: var(--accent);
  font-size: 0.85rem;
}

.error-message {
  color: #ff6b6b;
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  width: 100px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.setting-input,
.setting-select {
  flex: 1;
  padding: 0.6rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
}

.setting-input:focus,
.setting-select:focus {
  border-color: var(--accent);
}

.time-input {
  width: 120px;
  flex: none;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.save-btn {
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: white;
  font-weight: 600;
  cursor: pointer;
}

.save-btn:hover {
  background: var(--accent-hover);
}

.reset-btn {
  padding: 0.75rem 2rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.reset-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
</style>
