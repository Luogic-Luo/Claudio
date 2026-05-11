# Claudio - 个人 AI 音乐电台

一个个人化 AI 音乐电台，让 AI 像真人 DJ 一样为你规划音乐、生成语音播报。

## 功能特性

- AI 智能推荐音乐，基于你的听歌习惯和当前环境
- 语音播报功能，用自然语言介绍歌曲
- AI 电台模式，连续播放自动推荐，像真人电台一样
- 定时播放，根据时间段自动切换音乐风格
- 支持网易云音乐账号登录，从你的歌单生成音乐品味
- AI 品味总结，用自然语言描述你的音乐偏好
- PWA 支持，可安装到桌面

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 pnpm

### 安装

```bash
# 克隆项目
git clone <repository-url>
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
# mimo API (从 https://mimo.xiaomi.com 获取)
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
- 07:00 早晨唤醒
- 09:00 上午工作
- 12:00 午间休息
- 14:00 下午提神
- 18:00 傍晚放松
- 21:00 夜间舒缓

## 项目结构

```
├── server/          # Node.js 后端
├── client/          # Vue 3 前端
├── user/            # 用户品味配置
├── prompts/         # AI 提示词
├── cache/tts/       # TTS 缓存
├── data/            # SQLite 数据库
└── .env             # 环境变量
```

## API 文档

详见 [CLAUDE.md](./CLAUDE.md) 中的 API 路由清单。

## 许可证

MIT
