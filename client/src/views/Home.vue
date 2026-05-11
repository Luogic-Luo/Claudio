<template>
  <div class="home">
    <div class="hero">
      <h1 class="hero-title">Claudio</h1>
      <p class="hero-subtitle">你的个人 AI 音乐电台</p>
      <div class="connection-status" :class="{ connected: wsStore.connected }">
        {{ wsStore.connected ? '已连接' : '连接中...' }}
      </div>
    </div>

    <div class="chat-section">
      <div class="chat-messages" ref="chatContainer">
        <div
          v-for="(msg, index) in chatStore.messages"
          :key="index"
          class="message"
          :class="msg.role"
        >
          <div class="message-content">{{ displayText(msg) }}</div>
        </div>
      </div>

      <div class="chat-input">
        <input
          v-model="inputMessage"
          @keyup.enter="sendMessage"
          placeholder="和 Claudio 聊聊音乐..."
          class="input-field"
        />
        <button @click="sendMessage" class="send-btn" :disabled="!inputMessage.trim()">
          发送
        </button>
      </div>
    </div>

    <div class="quick-actions">
      <button @click="quickAction('推荐一些轻松的音乐')" class="action-btn">
        🎵 推荐音乐
      </button>
      <button @click="quickAction('今天适合听什么')" class="action-btn">
        🎧 今日推荐
      </button>
      <button @click="quickAction('播放一些助眠音乐')" class="action-btn">
        🌙 助眠音乐
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import { useWebSocketStore } from '../stores/websocket';
import { useChatStore } from '../stores/chat';
import axios from 'axios';

const wsStore = useWebSocketStore();
const chatStore = useChatStore();
const inputMessage = ref('');
const chatContainer = ref(null);
const isLoading = ref(false);

function displayText(msg) {
  if (msg.role !== 'assistant') return msg.content;
  let s = typeof msg.content === 'string' ? msg.content.trim() : msg.content;
  if (typeof s !== 'string' || !s.startsWith('{')) return s;

  s = s.replace(/[\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ');

  const marker = '"say"';
  const idx = s.indexOf(marker);
  if (idx === -1) return '';

  let i = idx + marker.length;
  while (i < s.length && (s[i] === ' ' || s[i] === ':')) i++;
  if (i >= s.length || s[i] !== '"') return '';
  i++;

  let result = '';
  while (i < s.length) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const next = s[i + 1];
      if (next === '"') { result += '"'; i += 2; }
      else if (next === 'n') { result += '\n'; i += 2; }
      else if (next === '\\') { result += '\\'; i += 2; }
      else { result += s[i]; i++; }
    } else if (s[i] === '"') {
      let j = i + 1;
      while (j < s.length && s[j] === ' ') j++;
      if (j >= s.length || s[j] === ',' || s[j] === '}') break;
      result += s[i]; i++;
    } else {
      result += s[i]; i++;
    }
  }
  return result;
}

onMounted(() => {
  wsStore.connect();
  chatStore.loadHistory();
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
});

watch(() => chatStore.messages.length, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
});

async function sendMessage() {
  const message = inputMessage.value.trim();
  if (!message || isLoading.value) return;

  chatStore.addMessage('user', message);
  inputMessage.value = '';
  isLoading.value = true;

  try {
    const response = await axios.post('/api/chat', { message });
    const { say, playlist } = response.data;

    chatStore.addMessage('assistant', say);

    if (playlist?.length > 0) {
      chatStore.addMessage(
        'assistant',
        `🎵 为你播放: ${playlist.map(s => `${s.name} - ${s.artist}`).join(', ')}`,
      );
    }
  } catch (error) {
    chatStore.addMessage('assistant', '抱歉，出了点问题。请稍后再试。');
  } finally {
    isLoading.value = false;
  }
}

function quickAction(text) {
  inputMessage.value = text;
  sendMessage();
}
</script>

<style scoped>
.home {
  max-width: 800px;
  margin: 0 auto;
}

.hero {
  text-align: center;
  padding: 3rem 0;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  color: var(--accent);
  margin-bottom: 0.5rem;
}

.hero-subtitle {
  font-size: 1.2rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
}

.connection-status {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-secondary);
}

.connection-status.connected {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.chat-section {
  background: var(--bg-secondary);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 2rem;
}

.chat-messages {
  height: 400px;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.chat-messages::-webkit-scrollbar {
  display: none;
}

.message {
  max-width: 80%;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.message.user {
  align-self: flex-end;
  background: var(--accent);
  color: white;
}

.message.assistant {
  align-self: flex-start;
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.chat-input {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--bg-tertiary);
}

.input-field {
  flex: 1;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  outline: none;
}

.input-field::placeholder {
  color: var(--text-secondary);
}

.send-btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quick-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.action-btn {
  padding: 0.75rem 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--accent);
  background: rgba(233, 69, 96, 0.1);
}
</style>
