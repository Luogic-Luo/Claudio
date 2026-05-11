import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import router, { setWsBroadcast, updateCurrentState, handleRadioNext } from './router.js';
import { initScheduler, setWsBroadcast as setSchedulerBroadcast } from './scheduler.js';
import { refreshSongPool } from './music.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json());

app.use(express.static(join(__dirname, '../client/dist')));
app.use('/cache', express.static(join(__dirname, '../cache')));

app.use(router);

const wss = new WebSocketServer({ server, path: '/stream' });

const clients = new Set();

function broadcast(data) {
  const message = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(message);
    }
  });
}

setWsBroadcast(broadcast);
setSchedulerBroadcast(broadcast);

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Client connected. Total:', clients.size);

  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Welcome to Claudio',
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);
      console.log('Received:', message);
      if (message.type === 'radio-next') {
        handleRadioNext();
      }
    } catch (error) {
      console.error('Invalid message:', error.message);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected. Total:', clients.size);
  });
});

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../client/dist/index.html'));
});

server.listen(config.port, () => {
  console.log(`Claudio server running on http://localhost:${config.port}`);
  console.log(`WebSocket available at ws://localhost:${config.port}/stream`);

  initScheduler();

  // 启动时预热歌曲池，之后每 30 分钟刷新
  refreshSongPool().catch(() => {});
  setInterval(() => refreshSongPool().catch(() => {}), 30 * 60 * 1000);
});

export default { app, server, wss };
