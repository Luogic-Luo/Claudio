<template>
  <div class="chat-panel">
    <div class="chat-header">
      <h3 class="chat-title">与 Claudio 对话</h3>
      <div class="connection-dot" :class="{ connected: connected }"></div>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div
        v-for="(msg, index) in messages"
        :key="index"
        class="message"
        :class="msg.role"
      >
        <div class="message-avatar">
          {{ msg.role === 'user' ? '👤' : '🎵' }}
        </div>
        <div class="message-content">
          <div class="message-text">{{ msg.content }}</div>
          <div class="message-time" v-if="msg.time">{{ msg.time }}</div>
        </div>
      </div>
    </div>

    <div class="chat-input-area">
      <textarea
        v-model="inputText"
        @keydown.enter.exact.prevent="sendMessage"
        placeholder="输入消息..."
        class="chat-textarea"
        rows="2"
      ></textarea>
      <button
        @click="sendMessage"
        class="send-button"
        :disabled="!inputText.trim() || loading"
      >
        <span v-if="loading">...</span>
        <span v-else>发送</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import axios from 'axios';

const props = defineProps({
  connected: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['message-sent']);

const messages = ref([
  {
    role: 'assistant',
    content: '你好！我是 Claudio，你的个人 AI DJ。今天想听什么音乐？',
    time: formatTime(new Date()),
  },
]);

const inputText = ref('');
const loading = ref(false);
const messagesContainer = ref(null);

watch(messages, () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
}, { deep: true });

async function sendMessage() {
  const text = inputText.value.trim();
  if (!text || loading.value) return;

  messages.value.push({
    role: 'user',
    content: text,
    time: formatTime(new Date()),
  });

  inputText.value = '';
  loading.value = true;

  try {
    const response = await axios.post('/api/chat', { message: text });
    const { say, playlist } = response.data;

    messages.value.push({
      role: 'assistant',
      content: say,
      time: formatTime(new Date()),
    });

    if (playlist?.length > 0) {
      const songList = playlist.map(s => `${s.name} - ${s.artist}`).join('、');
      messages.value.push({
        role: 'assistant',
        content: `正在为你播放: ${songList}`,
        time: formatTime(new Date()),
      });
    }

    emit('message-sent', response.data);
  } catch (error) {
    messages.value.push({
      role: 'assistant',
      content: '抱歉，出了点问题。请稍后再试。',
      time: formatTime(new Date()),
    });
  } finally {
    loading.value = false;
  }
}

function formatTime(date) {
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}
</script>

<style scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
  border-radius: 12px;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-title {
  font-size: 1rem;
  font-weight: 600;
}

.connection-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666;
}

.connection-dot.connected {
  background: #4caf50;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message {
  display: flex;
  gap: 0.75rem;
  max-width: 85%;
}

.message.user {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.message-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.message-content {
  background: var(--bg-tertiary);
  padding: 0.75rem 1rem;
  border-radius: 12px;
}

.message.user .message-content {
  background: var(--accent);
}

.message-text {
  font-size: 0.9rem;
  line-height: 1.5;
}

.message-time {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 0.25rem;
}

.chat-input-area {
  display: flex;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.chat-textarea {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
  resize: none;
  outline: none;
}

.chat-textarea:focus {
  border-color: var(--accent);
}

.send-button {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: var(--accent);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.send-button:hover:not(:disabled) {
  background: var(--accent-hover);
}

.send-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
