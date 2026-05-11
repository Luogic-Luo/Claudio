/**
 * 从 all-songs.json 蒸馏听歌品味
 * 用法: node scripts/distill-taste.js
 * 输出: user/taste.md
 */

import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SONGS_FILE = join(ROOT, 'user', 'all-songs.json');
const OUTPUT_FILE = join(ROOT, 'user', 'taste.md');

const API_URL = process.env.MIMO_API_URL || 'https://token-plan-cn.xiaomimimo.com/v1';
const API_KEY = process.env.MIMO_API_KEY;
const MODEL = process.env.MIMO_MODEL || 'mimo-v2.5-pro';

async function callMimo(systemPrompt, userMessage) {
  const response = await fetch(`${API_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  return JSON.parse(data.choices[0].message.content);
}

function analyzeLibrary(playlists) {
  const artistCounts = {};
  const allSongs = [];
  let totalDuration = 0;

  for (const pl of playlists) {
    for (const track of pl.tracks) {
      allSongs.push(track);
      totalDuration += track.duration || 0;
      const artists = track.artist.split(',').map(a => a.trim());
      for (const artist of artists) {
        if (artist) artistCounts[artist] = (artistCounts[artist] || 0) + 1;
      }
    }
  }

  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30);

  return { allSongs, topArtists, totalDuration, playlistCount: playlists.length };
}

function buildPlaylistSummary(playlists) {
  return playlists.map(pl => ({
    name: pl.name,
    count: pl.trackCount,
    sampleSongs: pl.tracks.slice(0, 8).map(t => `${t.name} - ${t.artist}`),
  }));
}

async function main() {
  if (!API_KEY) {
    console.error('MIMO_API_KEY 未配置，请在 .env 中设置');
    process.exit(1);
  }

  console.log('读取歌单数据...');
  const playlists = JSON.parse(readFileSync(SONGS_FILE, 'utf-8'));
  console.log(`共 ${playlists.length} 个歌单`);

  const { allSongs, topArtists, totalDuration, playlistCount } = analyzeLibrary(playlists);
  console.log(`共 ${allSongs.length} 首歌曲，${topArtists.length} 位独立艺术家`);

  const playlistSummary = buildPlaylistSummary(playlists);

  // --- API 调用 1: 整体风格分类 ---
  console.log('\n正在分析音乐风格...');

  const classifyPrompt = `你是一个音乐数据分析专家。根据以下用户的歌单信息，分析其音乐品味。

## 歌单列表
${playlistSummary.map(pl => `- ${pl.name} (${pl.count}首): ${pl.sampleSongs.join(', ')}`).join('\n')}

## 高频艺术家 (前20)
${topArtists.slice(0, 20).map(([name, count]) => `${name}: ${count}首`).join('\n')}

请输出 JSON 格式:
{
  "genres": [{"name": "风格名", "percentage": 数字, "artists": "代表艺术家", "description": "一句话描述"}],
  "languages": [{"name": "语言", "percentage": 数字}],
  "moods": [{"name": "情绪类型", "percentage": 数字, "description": "一句话描述"}],
  "eras": [{"name": "年代", "percentage": 数字}],
  "summary": "用3-4句话总结这个人的音乐品味特征，像朋友评价一样自然"
}

要求:
- genres 总和为 100，列出 5-8 个主要风格
- languages 总和为 100
- moods 总和为 100，列出 3-5 种情绪
- eras 总和为 100，按 2020s/2010s/2000s/更早 分
- 百分比基于歌单中歌曲的风格推断，不需要精确
- summary 用中文`;

  const classifyResult = await callMimo('你是一个专业的音乐品味分析师。', classifyPrompt);
  console.log('风格分析完成');

  // --- API 调用 2: 古典音乐单独分析（如果有的话） ---
  const classicalPlaylists = playlistSummary.filter(pl =>
    /古典|classical|钢琴|piano|交响|symphony|巴赫|贝多芬|肖邦/i.test(pl.name)
  );

  let classicalDetail = null;
  if (classicalPlaylists.length > 0) {
    console.log('\n正在分析古典音乐偏好...');
    const classicalPrompt = `你是一个古典音乐专家。分析以下古典音乐歌单的偏好特征。

## 古典歌单
${classicalPlaylists.map(pl => `- ${pl.name} (${pl.count}首): ${pl.sampleSongs.join(', ')}`).join('\n')}

请输出 JSON 格式:
{
  "composers": [{"name": "作曲家", "works": "代表作品"}],
  "periods": ["偏好的时期，如巴洛克/古典/浪漫/现代"],
  "instruments": ["偏好的乐器，如钢琴/弦乐/管弦乐"],
  "characteristics": "用1-2句话描述古典音乐偏好的特点"
}`;

    classicalDetail = await callMimo('你是一个古典音乐专家。', classicalPrompt);
    console.log('古典音乐分析完成');
  }

  // --- 生成 taste.md ---
  console.log('\n生成品味文件...');

  const hours = Math.floor(totalDuration / 3600000);
  const lines = [];
  lines.push('# 听歌品味');
  lines.push('');
  lines.push(`> 基于 ${playlistCount} 个自建歌单、${allSongs.length} 首歌曲分析生成`);
  lines.push('');

  // 风格分布
  lines.push('## 风格偏好');
  for (const g of classifyResult.genres || []) {
    lines.push(`- ${g.name} (${g.percentage}%): ${g.description}。代表: ${g.artists}`);
  }
  lines.push('');

  // 语言偏好
  lines.push('## 语言分布');
  for (const l of classifyResult.languages || []) {
    lines.push(`- ${l.name}: ${l.percentage}%`);
  }
  lines.push('');

  // 情绪基调
  lines.push('## 情绪偏好');
  for (const m of classifyResult.moods || []) {
    lines.push(`- ${m.name} (${m.percentage}%): ${m.description}`);
  }
  lines.push('');

  // 年代分布
  lines.push('## 年代分布');
  for (const e of classifyResult.eras || []) {
    lines.push(`- ${e.name}: ${e.percentage}%`);
  }
  lines.push('');

  // 古典音乐细节
  if (classicalDetail) {
    lines.push('## 古典音乐偏好');
    if (classicalDetail.composers?.length > 0) {
      lines.push(`- 偏好作曲家: ${classicalDetail.composers.map(c => `${c.name}(${c.works})`).join('、')}`);
    }
    if (classicalDetail.periods?.length > 0) {
      lines.push(`- 偏好时期: ${classicalDetail.periods.join('、')}`);
    }
    if (classicalDetail.instruments?.length > 0) {
      lines.push(`- 偏好乐器: ${classicalDetail.instruments.join('、')}`);
    }
    if (classicalDetail.characteristics) {
      lines.push(`- 特点: ${classicalDetail.characteristics}`);
    }
    lines.push('');
  }

  // 高频艺术家
  lines.push('## 高频艺术家');
  for (const [name, count] of topArtists.slice(0, 15)) {
    lines.push(`- ${name} (${count}首)`);
  }
  lines.push('');

  // 总结
  lines.push('## 品味总结');
  lines.push(classifyResult.summary || '暂无');

  const output = lines.join('\n');
  writeFileSync(OUTPUT_FILE, output, 'utf-8');

  console.log(`\n完成！已保存到: ${OUTPUT_FILE}`);
  console.log(`总时长: ${hours} 小时`);
  console.log('\n--- 品味摘要 ---');
  console.log(classifyResult.summary);
}

main().catch(err => {
  console.error('脚本出错:', err.message);
  process.exit(1);
});
