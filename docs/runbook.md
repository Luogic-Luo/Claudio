# Claudio 运维手册

## 启动与停止

### 启动服务

```bash
cd e:\Develop\Claudio
npm start
```

服务启动后：
- HTTP 服务：http://localhost:3001
- WebSocket：ws://localhost:3001/stream

### 停止服务

按 `Ctrl+C` 停止服务。

### 后台运行（Windows）

```bash
# 使用 PM2
npm install -g pm2
pm2 start server/index.js --name claudio

# 查看日志
pm2 logs claudio

# 停止
pm2 stop claudio
```

## 环境变量

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| MIMO_API_KEY | 是 | mimo API 密钥 | - |
| MIMO_API_URL | 否 | mimo API 地址 | https://token-plan-cn.xiaomimimo.com/v1 |
| MIMO_MODEL | 否 | AI 模型 | mimo-v2.5-pro |
| PORT | 否 | 服务端口 | 3001 |
| OPENWEATHER_API_KEY | 否 | 天气 API | - |

## 数据文件

| 路径 | 说明 |
|------|------|
| `data/claudio.db` | SQLite 数据库 |
| `user/.netease-cookie.json` | 网易云登录 cookie |
| `user/taste.md` | 音乐品味文件 |
| `user/playlists.json` | 歌单配置 |
| `cache/tts/` | TTS 音频缓存 |

## 常见问题

### 服务启动失败

**端口被占用**
```bash
# 查找占用端口的进程
netstat -ano | findstr :3001

# 终止进程
taskkill /PID <进程ID> /F
```

**数据库错误**
```bash
# 删除数据库重新初始化
rm data/claudio.db
npm start
```

### 网易云登录失败

1. 检查网络连接
2. 确认账号密码正确
3. 删除 `user/.netease-cookie.json` 重试
4. 尝试扫码登录

### VIP 歌曲只能播放 30 秒

1. 确认账号是否有 VIP（设置页查看是否显示 "VIP" 标识）
2. 非 VIP 账号无法获取完整歌曲链接，这是网易云 API 限制
3. 如果有 VIP 但仍试听，退出登录后重新登录刷新 cookie

### TTS 合成失败

1. 检查 MIMO_API_KEY 是否正确
2. 查看控制台错误日志
3. 清除缓存：`rm -rf cache/tts/*`

### 电台模式不自动切歌

1. 确认播放器底部 📻 按钮是否高亮（电台模式已开启）
2. 检查 WebSocket 连接状态（浏览器 DevTools → Network → WS）
3. 查看控制台是否有 `Radio next failed` 错误日志
4. 确认 AI API 正常响应（电台模式复用同一 API）

### 电台模式无语音串词

1. 检查 MIMO TTS 配置是否正确
2. 查看控制台是否有 TTS 合成错误
3. TTS 失败时会 fallback 直接播音乐，属于正常降级

### AI 无响应

1. 检查 MIMO_API_KEY 是否有效
2. 确认 API 配额是否用完
3. 测试 API 连通性：
```bash
curl https://token-plan-cn.xiaomimimo.com/v1/models \
  -H "Authorization: Bearer $MIMO_API_KEY"
```

## 日志查看

日志输出到控制台，包含：
- 服务器启动信息
- WebSocket 连接状态
- 定时任务触发
- API 调用错误

## 备份与恢复

### 备份

```bash
# 备份数据库
cp data/claudio.db backup/claudio-$(date +%Y%m%d).db

# 备份用户配置
tar -czf backup/user-$(date +%Y%m%d).tar.gz user/
```

### 恢复

```bash
# 恢复数据库
cp backup/claudio-20260509.db data/claudio.db

# 恢复用户配置
tar -xzf backup/user-20260509.tar.gz
```

## 性能优化

### TTS 缓存

TTS 音频基于文本哈希缓存，相同内容不会重复合成。

清理缓存：
```bash
rm -rf cache/tts/*
```

### 数据库优化

```bash
# SQLite 真空压缩
sqlite3 data/claudio.db "VACUUM;"
```
