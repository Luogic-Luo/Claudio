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

## License

MIT
