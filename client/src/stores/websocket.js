import { defineStore } from 'pinia';
import { ref } from 'vue';
import { usePlayerStore } from './player';
import { useChatStore } from './chat';

export const useWebSocketStore = defineStore('websocket', () => {
  const ws = ref(null);
  const connected = ref(false);
  const messages = ref([]);
  let lastRadioSay = '';
  let lastRadioTime = 0;

  function connect() {
    if (ws.value) {
      ws.value.onclose = null;
      ws.value.close();
      ws.value = null;
    }

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
        if (data.playlist?.length > 0) {
          playerStore.loadPlaylist(data.playlist);
          playerStore.play();
        }
        if (data.ttsPath) {
          playTTS(data.ttsPath);
        }
        break;
      case 'chat-response':
        if (data.ttsPath) {
          playTTS(data.ttsPath);
        }
        break;
      case 'radio-response': {
        playerStore.setRadioLoading(false);
        const sayText = extractSayText(data.say);
        const now = Date.now();
        if (sayText && sayText === lastRadioSay && now - lastRadioTime < 10000) {
          console.log('Duplicate radio-response, skipping');
          break;
        }
        if (sayText) {
          lastRadioSay = sayText;
          lastRadioTime = now;
          const chatStore = useChatStore();
          chatStore.addMessage('assistant', sayText);
          playerStore.startDJSpeaking(sayText);
        }
        if (data.ttsPath) {
          playTTSWithMidCallback(data.ttsPath,
            // halfway: load and start music
            () => {
              if (data.playlist?.length > 0) {
                playerStore.loadPlaylist(data.playlist);
                playerStore.play();
              }
            },
            // ended: close popup only, don't touch music
            () => {
              playerStore.stopDJSpeaking();
            }
          );
        } else {
          playerStore.stopDJSpeaking();
          if (data.playlist?.length > 0) {
            playerStore.loadPlaylist(data.playlist);
            playerStore.play();
          }
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

  function playTTSWithMidCallback(path, onMid, onEnded) {
    const ttsAudio = new Audio(path);
    let midDone = false;
    let endDone = false;

    ttsAudio.addEventListener('loadedmetadata', () => {
      const midPoint = ttsAudio.duration * 0.5;
      ttsAudio.addEventListener('timeupdate', function onTime() {
        if (!midDone && ttsAudio.currentTime >= midPoint) {
          midDone = true;
          ttsAudio.removeEventListener('timeupdate', onTime);
          onMid();
        }
      });
    });

    ttsAudio.onended = () => {
      if (endDone) return;
      endDone = true;
      onEnded();
    };
    ttsAudio.onerror = () => {
      if (endDone) return;
      endDone = true;
      onEnded();
    };
    ttsAudio.play().catch(() => {
      if (endDone) return;
      endDone = true;
      onEnded();
    });
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
