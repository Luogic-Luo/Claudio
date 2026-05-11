import 'dotenv/config';

export default {
  port: process.env.PORT || 3001,
  wsPort: process.env.WS_PORT || 3002,

  mimo: {
    apiKey: process.env.MIMO_API_KEY,
    apiUrl: process.env.MIMO_API_URL || 'https://token-plan-cn.xiaomimimo.com/v1',
    model: process.env.MIMO_MODEL || 'mimo-v2.5-pro',
  },

  netease: {
    apiUrl: process.env.NETEASE_API_URL || 'http://localhost:3000',
  },

  openweather: {
    apiKey: process.env.OPENWEATHER_API_KEY,
    apiUrl: 'https://api.openweathermap.org/data/2.5',
  },

  paths: {
    user: './user',
    prompts: './prompts',
    ttsCache: './cache/tts',
    db: './data/claudio.db',
  },
};
