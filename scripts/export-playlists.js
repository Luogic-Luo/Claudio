/**
 * 导出网易云账号所有歌单的歌曲列表
 * 用法: node scripts/export-playlists.js
 * 输出: user/all-songs.json
 */

import NeteaseCloudMusicApiModule from 'NeteaseCloudMusicApi';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const COOKIE_FILE = join(ROOT, 'user', '.netease-cookie.json');
const OUTPUT_FILE = join(ROOT, 'user', 'all-songs.json');

const NeteaseCloudMusicApi = NeteaseCloudMusicApiModule.default || NeteaseCloudMusicApiModule;
const { user_account, user_playlist, playlist_detail } = NeteaseCloudMusicApi;

function loadCookie() {
  if (!existsSync(COOKIE_FILE)) {
    console.error('未找到 cookie 文件，请先在设置中登录网易云账号');
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(COOKIE_FILE, 'utf-8'));
  // 清洗 cookie
  const pairs = [];
  const seen = new Set();
  for (const entry of data.cookie.split(';;')) {
    const nv = entry.split(';')[0].trim();
    if (!nv || !nv.includes('=')) continue;
    const name = nv.split('=')[0].trim();
    if (!seen.has(name)) {
      seen.add(name);
      pairs.push(nv);
    }
  }
  return pairs.join('; ');
}

async function main() {
  const cookie = loadCookie();

  // 获取用户信息
  console.log('正在获取用户信息...');
  const accountRes = await user_account({ cookie });
  const account = accountRes.body.account;
  const profile = accountRes.body.profile;
  if (!account) {
    console.error('未登录或 cookie 已过期');
    process.exit(1);
  }
  console.log(`账号: ${profile?.nickname} (ID: ${account.id})`);

  // 获取所有歌单
  console.log('\n正在获取歌单列表...');
  const plRes = await user_playlist({ uid: account.id, cookie });
  if (plRes.body.code !== 200) {
    console.error('获取歌单失败:', plRes.body.message);
    process.exit(1);
  }

  const playlists = plRes.body.playlist.filter(p => p.creator.userId === account.id);
  const subscribed = plRes.body.playlist.length - playlists.length;
  console.log(`共 ${plRes.body.playlist.length} 个歌单，其中自己创建的 ${playlists.length} 个，收藏的 ${subscribed} 个\n`);

  const result = [];
  let totalSongs = 0;

  for (let i = 0; i < playlists.length; i++) {
    const pl = playlists[i];
    process.stdout.write(`[${i + 1}/${playlists.length}] ${pl.name} (${pl.trackCount}首)...`);

    try {
      const detailRes = await playlist_detail({ id: pl.id, cookie });
      if (detailRes.body.code === 200) {
        const tracks = (detailRes.body.playlist.tracks || []).map(t => ({
          id: t.id,
          name: t.name,
          artist: (t.ar || []).map(a => a.name).join(', '),
          album: t.al?.name || '',
          duration: t.dt,
        }));
        result.push({
          playlistId: pl.id,
          playlistName: pl.name,
          trackCount: tracks.length,
          tracks,
        });
        totalSongs += tracks.length;
        console.log(` ✓ ${tracks.length}首`);
      } else {
        console.log(` ✗ 获取失败`);
      }
    } catch (err) {
      console.log(` ✗ ${err.message}`);
    }

    // 避免请求太快被限流
    if (i < playlists.length - 1) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');

  console.log(`\n完成！共 ${result.length} 个歌单，${totalSongs} 首歌曲`);
  console.log(`已保存到: ${OUTPUT_FILE}`);
}

main().catch(err => {
  console.error('脚本出错:', err.message);
  process.exit(1);
});
