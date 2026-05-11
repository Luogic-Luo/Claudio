# Claudio 架构文档

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                      用户交互层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web PWA    │  │   WebSocket  │  │   UPnP       │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
└─────────┼──────────────────┼───────────────────────────────┘
          │                  │
┌─────────┼──────────────────┼───────────────────────────────┐
│         ▼                  ▼         本地服务器层            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Router     │  │   WebSocket  │  │   Scheduler  │      │
│  │   路由分发    │  │   实时推送    │  │   定时调度    │      │
│  └──────┬───────┘  └──────────────┘  └──────────────┘      │
│         │                                                    │
│  ┌──────▼───────────────────────────────────────────────┐  │
│  │                    核心业务层                          │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │  │
│  │  │  AI     │ │  Music  │ │  TTS    │ │ Context │   │  │
│  │  │ mimo    │ │ 网易云   │ │ mimo    │ │ 提示词   │   │  │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │  │
│  └───────┼───────────┼───────────┼───────────┼─────────┘  │
│          │           │           │           │              │
│  ┌───────▼───────────▼───────────▼───────────▼─────────┐  │
│  │                    数据层                             │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │  │
│  │  │ SQLite  │ │  user/  │ │  cache/ │ │ .env    │   │  │
│  │  │ 状态DB  │ │ 品味文件 │ │ TTS缓存 │ │ 配置    │   │  │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘   │  │
│  └─────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## 数据流

### 用户聊天流程

```
用户输入 → Router → Context 组装提示词 → AI (mimo)
                                              │
                                              ▼
                              返回 {say, play[], reason, segue}
                                              │
                    ┌─────────────────────────┼────────────────┐
                    ▼                         ▼                ▼
              TTS 合成语音             Music 解析歌单      WebSocket 推送
                    │                         │                │
                    ▼                         ▼                ▼
              缓存到 cache/tts/         获取歌曲直链       前端更新 UI
```

### AI 电台模式

```
最后一首歌结束
  → 客户端 next() 检测到 radioMode + 播放列表末尾
  → WebSocket 发送 { type: 'radio-next' }
  → 服务端调用 handleRadioNext()
      → buildSystemPrompt('radio') 构建电台专用提示词
      → AI 推荐 1-2 首歌 + DJ 串词
      → resolvePlayList() 获取歌曲直链
      → synthesize() 合成 TTS 语音
  → WebSocket 广播 { type: 'radio-response', say, playlist, ttsPath }
  → 客户端先播放 TTS 串词 → TTS 结束后加载歌曲播放
```

TTS 失败时 fallback 直接播放音乐。电台模式开关和加载状态由 `stores/player.js` 管理，通过回调模式避免与 `stores/websocket.js` 的循环依赖。

### 定时播放流程

```
Scheduler 触发 → Context 组装环境信息 → AI 生成播放计划
                                              │
                                              ▼
                              写入 play_plans 表 → 执行播放流程
```

## 数据模型

### SQLite 表结构

**chat_history** - 聊天记录
- id, role, content, metadata, created_at

**play_history** - 播放历史
- id, song_id, song_name, artist, source, played_at

**play_plans** - 播放计划
- id, plan_date, slot_time, songs, reason, status

**tts_cache** - TTS 缓存
- hash, text, file_path, created_at

**user_preferences** - 用户偏好
- key, value, updated_at
- 已知 key: `taste_summary`（AI 生成的品味总结文本）

## 外部依赖

| 服务 | 用途 | 配置 |
|------|------|------|
| mimo API | AI 对话 + TTS | MIMO_API_KEY |
| NeteaseCloudMusicApi | 音乐搜索/播放 (song_url_v1 + cookie) | 本地模块 |
| OpenWeather | 天气信息 | OPENWEATHER_API_KEY (可选) |
