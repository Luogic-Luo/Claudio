import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useChatStore = defineStore('chat', () => {
  const messages = ref([]);
  const loaded = ref(false);

  function extractSay(content) {
    if (!content || typeof content !== 'string') return content;
    let s = content.trim();
    if (!s.startsWith('{')) return s;

    // Flatten to single line — handles pretty-printed JSON from AI
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

  async function loadHistory() {
    if (loaded.value) return;
    try {
      const response = await axios.get('/api/chat-history');
      if (response.data.length > 0) {
        messages.value = response.data.map(msg => ({
          role: msg.role,
          content: msg.role === 'assistant' ? extractSay(msg.content) : msg.content,
        }));
      }
    } catch (error) {
      console.error('Failed to load chat history:', error);
    }
    loaded.value = true;
  }

  function addMessage(role, content) {
    const cleaned = role === 'assistant' ? extractSay(content) : content;
    messages.value.push({ role, content: cleaned });
  }

  function clearMessages() {
    messages.value = [];
    loaded.value = false;
  }

  return { messages, loaded, loadHistory, addMessage, clearMessages };
});
