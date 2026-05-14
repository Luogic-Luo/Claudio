<p align="center">
  <a href="#english">English</a> | <a href="#中文">中文</a>
</p>

---

<a id="english"></a>

# Claudio - Personal AI Music Radio

> Your personal AI DJ that plans music and generates voice announcements based on your listening habits, schedule, and environment.

## Features

- **AI Smart Recommendations** - Music tailored to your taste and current context
- **Voice Announcements** - Natural language DJ commentary between tracks
- **AI Radio Mode** - Continuous auto-curated playback, like a real radio station
- **Scheduled Playback** - Automatic music style switching by time of day
- **Netease Cloud Music Integration** - Log in with your account and generate a taste profile from your playlists
- **AI Taste Summary** - Natural language description of your music preferences
- **PWA Support** - Installable to your desktop

## Quick Start

### Prerequisites

- Node.js >= 18
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/Luogic-Luo/Claudio.git
cd Claudio

# Install backend dependencies
npm install

# Install frontend dependencies and build
cd client
npm install
npm run build
cd ..
```

### Configuration

Copy `.env.example` to `.env` and fill in your API key:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# mimo API (get from https://mimo.xiaomi.com)
MIMO_API_KEY=your_api_key_here
MIMO_API_URL=https://token-plan-cn.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5-pro

# Server port
PORT=3001
```

### Running

```bash
npm start
```

Visit http://localhost:3001

## Usage

### Log in to Netease Cloud Music

1. Go to http://localhost:3001/settings
2. Choose "Phone Login" or "QR Code Login"
3. After login, click "Generate Music Taste"
4. AI will recommend music based on your playlists

### Chat with AI DJ

Type in the homepage input box:
- "Recommend some relaxing music"
- "What should I listen to today?"
- "Play some sleep music"

### Scheduled Playback

Default schedule:

| Time | Mode |
|------|------|
| 07:00 | Morning Wake-up |
| 09:00 | Forenoon Focus |
| 12:00 | Lunch Break |
| 14:00 | Afternoon Boost |
| 18:00 | Evening Relax |
| 21:00 | Night Chill |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| AI | mimo-v2.5-pro API (OpenAI compatible) |
| TTS | mimo-v2.5-tts API |
| Music Source | NeteaseCloudMusicApi |
| Database | SQLite (better-sqlite3) |
| Frontend | Vue 3 + Vite + PWA |
| Realtime | WebSocket (ws) |

## Project Structure

```
claudio/
├── server/                 # Node.js backend
│   ├── index.js           # Server entry (Express + WebSocket)
│   ├── router.js          # API routes
│   ├── ai.js              # mimo AI adapter
│   ├── music.js           # Netease Cloud Music integration
│   ├── netease-user.js    # Netease account login & taste generation
│   ├── context.js         # Prompt assembly
│   ├── tts.js             # mimo TTS speech synthesis
│   ├── scheduler.js       # Scheduled tasks
│   ├── db.js              # SQLite database
│   ├── config.js          # Configuration
│   └── utils.js           # Utilities
├── client/                # Vue 3 frontend
│   ├── src/
│   │   ├── components/    # Player components
│   │   ├── views/         # Pages (Home, Profile, Settings)
│   │   └── stores/        # Pinia state management
│   └── vite.config.js
├── user/                  # User taste profiles
├── prompts/               # AI prompts
├── cache/tts/             # TTS audio cache
├── data/                  # SQLite database
└── .env                   # Environment variables
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/now` | Current playback state |
| GET | `/api/taste` | User taste profile |
| GET | `/api/plan/today` | Today's playlist plan |
| POST | `/api/chat` | AI chat interaction |
| GET | `/api/search?q=keyword` | Search songs |
| POST | `/api/play` | Play song list |
| POST | `/api/tts` | Text-to-speech |
| GET | `/api/history` | Playback history |
| GET | `/api/chat-history` | Chat history |
| GET | `/api/taste/summary` | AI taste summary (supports `?refresh=true`) |
| GET | `/api/netease/status` | Netease login status |
| POST | `/api/netease/login` | Phone number login |
| GET | `/api/netease/qr-key` | Get QR code for login |
| GET | `/api/netease/qr-check` | Check QR scan status |
| GET | `/api/netease/playlists` | Get user playlists |
| POST | `/api/netease/generate-taste` | Generate taste from playlists |
| POST | `/api/netease/logout` | Logout from Netease |
| WS | `/stream` | WebSocket real-time push |

## Contributors

<a href="https://github.com/Luogic-Luo">
  <img src="https://github.com/Luogic-Luo.png" width="60;" alt="Luogic-Luo"/>
  <br />
  <sub><b>Luogic-Luo</b></sub>
</a>

## License

MIT

---

<a id="中文"></a>

# Claudio - 个人 AI 音乐电台

> 你的私人 AI DJ，根据听歌习惯、日程和环境，为你规划音乐、生成语音播报。

## 功能特性

- **AI 智能推荐** - 基于你的品味和当前情境推荐音乐
- **语音播报** - DJ 自然语言串词，介绍下一首歌曲
- **AI 电台模式** - 连续自动编排播放，像真人电台一样
- **定时播放** - 根据时间段自动切换音乐风格
- **网易云音乐集成** - 登录账号，从歌单生成音乐品味
- **AI 品味总结** - 用自然语言描述你的音乐偏好
- **PWA 支持** - 可安装到桌面

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 pnpm

### 安装

```bash
# 克隆项目
git clone https://github.com/Luogic-Luo/Claudio.git
cd Claudio

# 安装后端依赖
npm install

# 安装前端依赖并构建
cd client
npm install
npm run build
cd ..
```

### 配置

复制 `.env.example` 为 `.env`，填入你的 API Key：

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# mimo API（从 https://mimo.xiaomi.com 获取）
MIMO_API_KEY=your_api_key_here
MIMO_API_URL=https://token-plan-cn.xiaomimimo.com/v1
MIMO_MODEL=mimo-v2.5-pro

# 服务器端口
PORT=3001
```

### 启动

```bash
npm start
```

访问 http://localhost:3001

## 使用指南

### 登录网易云账号

1. 访问 http://localhost:3001/settings
2. 选择「手机号登录」或「扫码登录」
3. 登录成功后点击「生成音乐品味」
4. AI 将根据你的歌单推荐音乐

### 与 AI DJ 对话

在首页输入框输入：
- "推荐一些轻松的音乐"
- "今天适合听什么"
- "播放一些助眠音乐"

### 定时播放

默认定时：

| 时间 | 模式 |
|------|------|
| 07:00 | 早晨唤醒 |
| 09:00 | 上午工作 |
| 12:00 | 午间休息 |
| 14:00 | 下午提神 |
| 18:00 | 傍晚放松 |
| 21:00 | 夜间舒缓 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Node.js + Express |
| AI | mimo-v2.5-pro API（OpenAI 兼容格式） |
| TTS | mimo-v2.5-tts API |
| 音乐源 | NeteaseCloudMusicApi |
| 数据库 | SQLite (better-sqlite3) |
| 前端 | Vue 3 + Vite + PWA |
| 实时通信 | WebSocket (ws) |

## 项目结构

```
claudio/
├── server/                 # Node.js 后端
│   ├── index.js           # 服务器入口 (Express + WebSocket)
│   ├── router.js          # API 路由
│   ├── ai.js              # mimo AI 适配器
│   ├── music.js           # 网易云音乐集成
│   ├── netease-user.js    # 网易云账号登录与品味生成
│   ├── context.js         # 提示词组装
│   ├── tts.js             # mimo TTS 语音合成
│   ├── scheduler.js       # 定时调度
│   ├── db.js              # SQLite 数据库
│   ├── config.js          # 配置管理
│   └── utils.js           # 工具函数
├── client/                # Vue 3 前端
│   ├── src/
│   │   ├── components/    # 播放器组件
│   │   ├── views/         # 页面 (Home, Profile, Settings)
│   │   └── stores/        # Pinia 状态管理
│   └── vite.config.js
├── user/                  # 用户品味配置
├── prompts/               # AI 提示词
├── cache/tts/             # TTS 音频缓存
├── data/                  # SQLite 数据库
└── .env                   # 环境变量
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
| GET | `/api/taste/summary` | AI 品味总结（支持 `?refresh=true`） |
| GET | `/api/netease/status` | 网易云登录状态 |
| POST | `/api/netease/login` | 手机号登录 |
| GET | `/api/netease/qr-key` | 获取扫码登录二维码 |
| GET | `/api/netease/qr-check` | 检查扫码状态 |
| GET | `/api/netease/playlists` | 获取用户歌单 |
| POST | `/api/netease/generate-taste` | 从歌单生成品味文件 |
| POST | `/api/netease/logout` | 退出网易云账号 |
| WS | `/stream` | WebSocket 实时推送 |

## 贡献者

<a href="https://github.com/Luogic-Luo">
  <img src="https://github.com/Luogic-Luo.png" width="60;" alt="Luogic-Luo"/>
  <br />
  <sub><b>Luogic-Luo</b></sub>
</a>

## 许可证

MIT
