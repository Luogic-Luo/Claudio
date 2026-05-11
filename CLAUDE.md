# Claudio - 个人 AI 音乐电台

## 项目概述

Claudio 是一个个人化 AI 音乐电台，通过读取用户听歌习惯、日程、环境信息，让 AI 像真人 DJ 一样规划音乐、生成语音播报。

## 技术栈

- **后端**: Node.js + Express
- **AI**: mimo-v2.5-pro API (OpenAI 兼容格式)
- **TTS**: mimo-v2.5-tts API
- **音乐**: NeteaseCloudMusicApi (本地模块)
- **数据库**: SQLite (better-sqlite3)
- **前端**: Vue 3 + Vite + PWA
- **实时通信**: WebSocket (ws)

## 项目结构

```
claudio/
├── server/                    # Node.js 后端
│   ├── index.js              # 服务器入口 (Express + WebSocket)
│   ├── router.js             # API 路由
│   ├── ai.js                 # mimo AI 适配器
│   ├── music.js              # 网易云音乐集成
│   ├── netease-user.js       # 网易云账号登录与品味生成
│   ├── context.js            # 提示词组装
│   ├── tts.js                # mimo TTS 语音合成
│   ├── scheduler.js          # 定时调度
│   ├── db.js                 # SQLite 数据库
│   ├── config.js             # 配置管理
│   └── utils.js              # 工具函数
├── client/                   # Vue 3 前端
│   ├── src/
│   │   ├── components/       # 播放器组件 (PlayerBar, DJSpeaking)
│   │   ├── views/            # 页面 (Home, Profile, Settings)
│   │   └── stores/           # Pinia 状态管理 (player, websocket, chat)
│   └── vite.config.js
├── user/                     # 用户品味语料
│   ├── taste.md              # 音乐偏好 (可从网易云自动生成)
│   ├── routines.md           # 日常习惯
│   ├── playlists.json        # 歌单配置
│   └── mood-rules.md         # 情绪规则
├── prompts/
│   └── dj-persona.md         # AI DJ 角色设定
├── cache/tts/                # TTS 音频缓存
├── data/                     # SQLite 数据库
├── .env                      # 环境变量
└── package.json
```

## 环境变量

在 `.env` 中配置：

```env
# mimo API (AI 对话 + TTS)
MIMO_API_KEY=your_api_key
MIMO_API_URL=https://token-plan-cn.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5-pro

# 服务器配置
PORT=3001
```

## API 路由清单

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/now` | 当前播放状态 |
| GET | `/api/taste` | 用户品味配置 |
| GET | `/api/plan/today` | 今日播放计划 |
| POST | `/api/chat` | AI 聊天交互 |
| GET | `/api/search?q=关键词` | 搜索歌曲 |
| POST | `/api/play` | 播放歌曲列表 |
| POST | `/api/tts` | 语音合成 |
| GET | `/api/history` | 播放历史 |
| GET | `/api/chat-history` | 聊天记录 |
| GET | `/api/taste/summary` | AI 生成的音乐品味总结 (支持 `?refresh=true`) |
| GET | `/api/netease/status` | 网易云登录状态 (含 vipType) |
| POST | `/api/netease/login` | 手机号登录 |
| GET | `/api/netease/qr-key` | 获取扫码登录二维码 |
| GET | `/api/netease/qr-check` | 检查扫码状态 |
| GET | `/api/netease/playlists` | 获取用户歌单 |
| POST | `/api/netease/generate-taste` | 从歌单生成品味文件 |
| POST | `/api/netease/logout` | 退出网易云账号 |
| WS | `/stream` | WebSocket 实时推送（支持 `radio-next` 请求和 `radio-response` 响应） |

## 启动命令

```bash
# 安装依赖
npm install
cd client && npm install && npm run build && cd ..

# 启动服务器
npm start
```

服务器运行在 http://localhost:3001

## 关键实现细节

- **AI 返回格式**: `{say, play[], reason, segue}` - 结构化 JSON
- **网易云 API**: 使用 `NeteaseCloudMusicApi` 本地模块，需通过 `m.default` 访问；使用 `song_url_v1` 获取歌曲链接（支持音质等级），所有 API 调用均带登录 cookie
- **Cookie 清洗**: 网易云登录返回的 Set-Cookie 格式需清理为 `key=value` 后才能传给 API（`loadCookie()` 自动处理）
- **TTS 缓存**: 基于文本哈希，存储在 `cache/tts/` 目录
- **AI 电台模式**: 歌单播完后通过 WebSocket 发送 `radio-next`，服务器调用 AI 推荐下一首并合成 TTS 串词，客户端先播 TTS 再播音乐
- **品味总结**: `GET /api/taste/summary` 用 AI 将品味档案总结为自然语言，缓存在 `user_preferences` 表
- **定时调度**: 默认 07:00/09:00/12:00/14:00/18:00/21:00 触发

## 注意事项

- Node.js 版本 >= 18
- 网易云登录后 cookie 保存在 `user/.netease-cookie.json`
- 生成品味文件会覆盖 `user/taste.md` 和 `user/playlists.json`
