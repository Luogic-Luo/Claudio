import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import config from './config.js';

mkdirSync(dirname(config.paths.db), { recursive: true });

const db = new Database(config.paths.db);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    song_id TEXT NOT NULL,
    song_name TEXT,
    artist TEXT,
    source TEXT DEFAULT 'netease',
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS play_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_date TEXT NOT NULL,
    slot_time TEXT,
    songs TEXT NOT NULL,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tts_cache (
    hash TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    file_path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

export const chatHistory = {
  add(role, content, metadata = null) {
    const stmt = db.prepare('INSERT INTO chat_history (role, content, metadata) VALUES (?, ?, ?)');
    return stmt.run(role, content, metadata ? JSON.stringify(metadata) : null);
  },

  getRecent(limit = 20) {
    return db.prepare('SELECT * FROM chat_history ORDER BY created_at DESC LIMIT ?').all(limit);
  },

  clear() {
    return db.prepare('DELETE FROM chat_history').run();
  },
};

export const playHistory = {
  add(songId, songName, artist, source = 'netease') {
    const stmt = db.prepare('INSERT INTO play_history (song_id, song_name, artist, source) VALUES (?, ?, ?, ?)');
    return stmt.run(songId, songName, artist, source);
  },

  getRecent(limit = 50) {
    return db.prepare('SELECT * FROM play_history ORDER BY played_at DESC LIMIT ?').all(limit);
  },

  getByDate(date) {
    return db.prepare("SELECT * FROM play_history WHERE DATE(played_at) = ? ORDER BY played_at").all(date);
  },
};

export const playPlans = {
  add(planDate, slotTime, songs, reason = null) {
    const stmt = db.prepare('INSERT INTO play_plans (plan_date, slot_time, songs, reason) VALUES (?, ?, ?, ?)');
    return stmt.run(planDate, slotTime, JSON.stringify(songs), reason);
  },

  getByDate(date) {
    return db.prepare('SELECT * FROM play_plans WHERE plan_date = ? ORDER BY slot_time').all(date);
  },

  updateStatus(id, status) {
    return db.prepare('UPDATE play_plans SET status = ? WHERE id = ?').run(status, id);
  },

  getToday() {
    const today = new Date().toISOString().split('T')[0];
    return this.getByDate(today);
  },
};

export const userPreferences = {
  get(key) {
    const row = db.prepare('SELECT value FROM user_preferences WHERE key = ?').get(key);
    return row ? row.value : null;
  },

  set(key, value) {
    return db.prepare(`
      INSERT INTO user_preferences (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = CURRENT_TIMESTAMP
    `).run(key, value, value);
  },

  getAll() {
    return db.prepare('SELECT * FROM user_preferences').all();
  },
};

export const ttsCache = {
  get(hash) {
    return db.prepare('SELECT * FROM tts_cache WHERE hash = ?').get(hash);
  },

  set(hash, text, filePath) {
    return db.prepare('INSERT OR REPLACE INTO tts_cache (hash, text, file_path) VALUES (?, ?, ?)').run(hash, text, filePath);
  },
};

export default db;
