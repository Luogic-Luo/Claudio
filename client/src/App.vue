<template>
  <div class="app">
    <nav class="nav">
      <router-link to="/" class="nav-logo">
        <span class="logo-icon">♪</span>
        <span class="logo-text">Claudio</span>
      </router-link>
      <div class="nav-links">
        <router-link to="/" class="nav-link">首页</router-link>
        <router-link to="/profile" class="nav-link">个人中心</router-link>
        <router-link to="/settings" class="nav-link">设置</router-link>
      </div>
    </nav>
    <main class="main">
      <router-view />
    </main>
    <PlayerBar />
    <DJSpeaking />
    <LyricsPanel />
  </div>
</template>

<script setup>
import PlayerBar from './components/PlayerBar.vue';
import DJSpeaking from './components/DJSpeaking.vue';
import LyricsPanel from './components/LyricsPanel.vue';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --bg-primary: #0a0a1a;
  --bg-secondary: #1a1a2e;
  --bg-tertiary: #16213e;
  --text-primary: #e0e0e0;
  --text-secondary: #a0a0a0;
  --accent: #e94560;
  --accent-hover: #ff6b81;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: var(--bg-secondary);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--accent);
  font-weight: 700;
  font-size: 1.5rem;
}

.logo-icon {
  font-size: 2rem;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  text-decoration: none;
  color: var(--text-secondary);
  font-weight: 500;
  transition: color 0.2s;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--accent);
}

.main {
  flex: 1;
  padding: 2rem;
  padding-bottom: 100px;
}
</style>
