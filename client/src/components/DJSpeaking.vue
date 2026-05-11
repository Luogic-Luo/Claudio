<template>
  <Transition name="dj-slide">
    <div class="dj-speaking" v-if="playerStore.djSpeaking.active">
      <div class="dj-avatar">
        <div class="avatar-ring"></div>
        <span>DJ</span>
      </div>
      <div class="dj-content">
        <div class="dj-text">{{ displayedText }}<span class="cursor" v-if="typing">|</span></div>
        <div class="dj-wave" v-if="typing">
          <span></span><span></span><span></span><span></span><span></span>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch, onUnmounted } from 'vue';
import { usePlayerStore } from '../stores/player';

const playerStore = usePlayerStore();
const displayedText = ref('');
const typing = ref(false);
let timer = null;

watch(() => playerStore.djSpeaking.active, (active) => {
  if (active) {
    startTyping(playerStore.djSpeaking.text);
  } else {
    stopTyping();
  }
});

function startTyping(text) {
  stopTyping();
  displayedText.value = '';
  typing.value = true;
  let i = 0;
  const speed = Math.max(60, Math.min(150, 3000 / text.length));
  timer = setInterval(() => {
    if (i < text.length) {
      displayedText.value += text[i];
      i++;
    } else {
      clearInterval(timer);
      timer = null;
      typing.value = false;
    }
  }, speed);
}

function stopTyping() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  typing.value = false;
}

onUnmounted(() => stopTyping());
</script>

<style scoped>
.dj-speaking {
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  background: var(--bg-secondary);
  border: 1px solid rgba(233, 69, 96, 0.3);
  border-radius: 16px;
  padding: 1rem 1.25rem;
  max-width: 500px;
  width: 90%;
  z-index: 99;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

.dj-avatar {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.avatar-ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid var(--accent);
  animation: pulse-ring 1.5s ease-out infinite;
}

@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(1.4); opacity: 0; }
}

.dj-content {
  flex: 1;
  min-width: 0;
}

.dj-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary);
  word-break: break-word;
}

.cursor {
  color: var(--accent);
  animation: blink 0.8s step-end infinite;
}

@keyframes blink {
  50% { opacity: 0; }
}

.dj-wave {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-top: 0.5rem;
  height: 16px;
}

.dj-wave span {
  display: block;
  width: 3px;
  height: 8px;
  background: var(--accent);
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}

.dj-wave span:nth-child(1) { animation-delay: 0s; }
.dj-wave span:nth-child(2) { animation-delay: 0.15s; }
.dj-wave span:nth-child(3) { animation-delay: 0.3s; }
.dj-wave span:nth-child(4) { animation-delay: 0.45s; }
.dj-wave span:nth-child(5) { animation-delay: 0.6s; }

@keyframes wave {
  0%, 100% { height: 6px; }
  50% { height: 16px; }
}

.dj-slide-enter-active {
  transition: all 0.3s ease-out;
}

.dj-slide-leave-active {
  transition: all 0.2s ease-in;
}

.dj-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.dj-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
