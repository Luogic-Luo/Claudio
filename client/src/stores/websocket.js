import { defineStore } from 'pinia';
import { ref } from 'vue';
import { usePlayerStore } from './player';
import { useChatStore } from './chat';

export const useWebSocketStore = defineStore('websocket', () => {
  const ws = ref(null);
  const connected = ref(false);
  const messages = ref([]);

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/stream`;

    ws.value = new WebSocket(wsUrl);

    const playerStore = usePlayerStore();
    playerStore.setRadioRequestCallback(() => {
      send({ type: 'radio-next' });
    });

    ws.value.onopen = () => {
      connected.value = true;
      console.log('WebSocket connected');
    };

    ws.value.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        messages.value.push(data);
        handleMessage(data);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.value.onclose = () => {
      connected.value = false;
      console.log('WebSocket disconnected');
      setTimeout(connect, 3000);
    };

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  function handleMessage(data) {
    const playerStore = usePlayerStore();

    switch (data.type) {
      case 'play':
      case 'scheduled-play':
      case 'chat-response':
        if (data.playlist?.length > 0) {
          playerStore.loadPlaylist(data.playlist);
          playerStore.play();
        }
        if (data.ttsPath) {
          playTTS(data.ttsPath);
        }
        break;
      case 'radio-response': {
        const sayText = extractSayText(data.say);
        if (sayText) {
          const chatStore = useChatStore();
          chatStore.addMessage('assistant', sayText);
          playerStore.startDJSpeaking(sayText);
        }
        if (data.ttsPath) {
          playTTSWithMidCallback(data.ttsPath,
            // halfway: start music underneath
            () => {
              if (data.playlist?.length > 0) {
                playerStore.loadPlaylist(data.playlist);
                playerStore.play();
              }
            },
            // ended: stop DJ speaking
            () => {
              playerStore.stopDJSpeaking();
              playerStore.setRadioLoading(false);
            }
          );
        } else {
          playerStore.stopDJSpeaking();
          if (data.playlist?.length > 0) {
            playerStore.loadPlaylist(data.playlist);
            playerStore.play();
          }
          playerStore.setRadioLoading(false);
        }
        break;
      }
    }
  }

  function extractSayText(say) {
    if (!say || typeof say !== 'string') return say || '';
    let s = say.trim();
    if (!s.startsWith('{')) return s;
    s = s.replace(/[\r\n\t]/g, ' ').replace(/\s{2,}/g, ' ');
    const marker = '"say"';
    const idx = s.indexOf(marker);
    if (idx === -1) return s;
    let i = idx + marker.length;
    while (i < s.length && (s[i] === ' ' || s[i] === ':')) i++;
    if (i >= s.length || s[i] !== '"') return s;
    i++;
    let result = '';
    while (i < s.length) {
      if (s[i] === '\\' && i + 1 < s.length) {
        const n = s[i + 1];
        if (n === '"') { result += '"'; i += 2; }
        else if (n === 'n') { result += '\n'; i += 2; }
        else if (n === '\\') { result += '\\'; i += 2; }
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

  function playTTS(path) {
    const audio = new Audio(path);
    audio.play().catch(console.error);
  }

  function playTTSWithCallback(path, onEnded) {
    const ttsAudio = new Audio(path);
    ttsAudio.onended = () => onEnded();
    ttsAudio.onerror = () => {
      console.error('TTS playback error');
      onEnded();
    };
    ttsAudio.play().catch(() => onEnded());
  }

  function playTTSWithMidCallback(path, onMid, onEnded) {
    const ttsAudio = new Audio(path);
    let done = false;

    function finish(mid) {
      if (done) return;
      done = true;
      if (mid) onMid();
      onEnded();
    }

    ttsAudio.addEventListener('loadedmetadata', () => {
      const midPoint = ttsAudio.duration * 0.5;
      ttsAudio.addEventListener('timeupdate', function onTime() {
        if (!done && ttsAudio.currentTime >= midPoint) {
          ttsAudio.removeEventListener('timeupdate', onTime);
          onMid();
        }
      });
    });

    ttsAudio.onended = () => finish(true);
    ttsAudio.onerror = () => finish(true);
    ttsAudio.play().catch(() => finish(true));
  }

  function send(data) {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(data));
    }
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
  }

  return {
    connected,
    messages,
    connect,
    send,
    disconnect,
  };
});
