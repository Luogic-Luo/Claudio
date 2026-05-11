# Claudio 集成指南

## API 参考

### 播放控制

#### 获取当前播放状态

```bash
curl http://localhost:3001/api/now
```

响应：
```json
{
  "playing": true,
  "currentSong": { "id": 123, "name": "歌曲名", "artist": "艺术家", "url": "..." },
  "playlist": [...],
  "ttsPlaying": false
}
```

#### 播放歌曲

```bash
curl -X POST http://localhost:3001/api/play \
  -H "Content-Type: application/json" \
  -d '{"songs": [{"query": "晴天 周杰伦"}]}'
```

### AI 对话

#### 发送聊天消息

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "推荐一些轻松的音乐"}'
```

响应：
```json
{
  "say": "为你推荐几首轻松的音乐...",
  "playlist": [
    { "id": 123, "name": "歌曲名", "artist": "艺术家", "url": "..." }
  ],
  "reason": "选择理由",
  "segue": "过渡语",
  "ttsPath": "/cache/tts/abc123.wav"
}
```

### 聊天记录

#### 获取聊天历史

```bash
curl http://localhost:3001/api/chat-history?limit=50
```

响应：
```json
[
  { "id": 1, "role": "user", "content": "推荐一些音乐", "created_at": "2026-05-10 ..." },
  { "id": 2, "role": "assistant", "content": "{\"say\":\"好的...\"}", "created_at": "2026-05-10 ..." }
]
```

### 音乐搜索

```bash
curl "http://localhost:3001/api/search?q=周杰伦&limit=5"
```

响应：
```json
[
  { "id": 123, "name": "晴天", "artist": "周杰伦", "album": "叶惠美", "duration": 269000 }
]
```

### 网易云账号

#### 检查登录状态

```bash
curl http://localhost:3001/api/netease/status
```

响应（含 VIP 类型）：
```json
{
  "logged": true,
  "userId": 123456,
  "nickname": "用户名",
  "vipType": 1100
}
```

`vipType` 值：`0` = 非 VIP，`100` = 普通 VIP，`1100` = 黑胶 VIP

#### 手机号登录

```bash
curl -X POST http://localhost:3001/api/netease/login \
  -H "Content-Type: application/json" \
  -d '{"phone": "13800138000", "password": "your_password"}'
```

#### 获取扫码登录二维码

```bash
curl http://localhost:3001/api/netease/qr-key
```

响应：
```json
{
  "key": "uuid-string",
  "qrimg": "data:image/png;base64,..."
}
```

#### 检查扫码状态

```bash
curl "http://localhost:3001/api/netease/qr-check?key=uuid-string"
```

#### 生成音乐品味

```bash
curl -X POST http://localhost:3001/api/netease/generate-taste
```

#### 退出登录

```bash
curl -X POST http://localhost:3001/api/netease/logout
```

响应：
```json
{ "success": true }
```

响应：
```json
{
  "success": true,
  "stats": {
    "playlists": 10,
    "tracks": 250,
    "topArtists": ["周杰伦", "林俊杰", "陈奕迅"],
    "topTags": ["流行", "华语"]
  }
}
```

#### 获取音乐品味总结

```bash
curl http://localhost:3001/api/taste/summary
```

响应：
```json
{
  "summary": "你是一个偏爱华语流行的音乐爱好者，周杰伦和林俊杰是你的心头好..."
}
```

添加 `?refresh=true` 强制重新生成：

```bash
curl "http://localhost:3001/api/taste/summary?refresh=true"
```

### WebSocket

连接地址：`ws://localhost:3001/stream`

服务端推送消息格式：
```json
{
  "type": "play|chat-response|scheduled-play|radio-response",
  "say": "语音播报内容",
  "playlist": [...],
  "ttsPath": "/cache/tts/abc.wav"
}
```

客户端可发送：
```json
{ "type": "radio-next" }
```

请求 AI 推荐下一首歌（电台模式）。服务端回复 `radio-response` 类型消息，包含 DJ 串词和推荐歌单。

## 错误码

| HTTP 状态码 | 含义 |
|------------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 未登录 |
| 500 | 服务器错误 |

## 前端集成

### 使用 WebSocket

```javascript
const ws = new WebSocket('ws://localhost:3001/stream');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'play') {
    // 播放音乐
    playerStore.loadPlaylist(data.playlist);
  }
};
```

### 调用 API

```javascript
import axios from 'axios';

// 发送聊天消息
const response = await axios.post('/api/chat', { message: '推荐音乐' });
const { say, playlist } = response.data;
```
