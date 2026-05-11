import schedule from 'node-schedule';
import { playPlans, chatHistory } from './db.js';
import { chat } from './ai.js';
import { resolvePlayList } from './music.js';
import { synthesize } from './tts.js';
import { buildSystemPrompt } from './context.js';

const scheduledJobs = new Map();

const DEFAULT_SCHEDULE = [
  { time: '0 7 * * *', label: 'morning-wake', prompt: '早上好，现在是早晨7点，请为我播放一些轻柔的唤醒音乐' },
  { time: '0 9 * * *', label: 'morning-work', prompt: '现在是上午9点，我准备开始工作，请播放一些专注的背景音乐' },
  { time: '0 12 * * *', label: 'noon-break', prompt: '中午12点，午休时间，请播放一些轻松的午餐音乐' },
  { time: '0 14 * * *', label: 'afternoon-start', prompt: '下午2点，下午工作开始，请播放一些提神的音乐' },
  { time: '0 18 * * *', label: 'evening-commute', prompt: '傍晚6点，下班时间，请播放一些放松的音乐' },
  { time: '0 21 * * *', label: 'night-relax', prompt: '晚上9点，放松时间，请播放一些舒缓的音乐' },
];

let wsBroadcast = null;

export function setWsBroadcast(broadcastFn) {
  wsBroadcast = broadcastFn;
}

export function initScheduler() {
  console.log('Initializing scheduler...');

  DEFAULT_SCHEDULE.forEach(({ time, label, prompt }) => {
    const job = schedule.scheduleJob(time, async () => {
      console.log(`Scheduled job triggered: ${label}`);
      await executeScheduledPlay(label, prompt);
    });
    scheduledJobs.set(label, job);
    console.log(`Scheduled: ${label} at ${time}`);
  });
}

async function executeScheduledPlay(label, prompt) {
  try {
    const systemPrompt = await buildSystemPrompt();
    const aiResponse = await chat(systemPrompt, prompt);

    chatHistory.add('user', prompt, { scheduled: true, label });
    chatHistory.add('assistant', JSON.stringify(aiResponse), { scheduled: true, label });

    const playlist = await resolvePlayList(aiResponse.play);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const slotTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    playPlans.add(today, slotTime, playlist, aiResponse.reason);

    let ttsPath = null;
    if (aiResponse.say) {
      ttsPath = await synthesize(aiResponse.say);
    }

    if (wsBroadcast) {
      wsBroadcast({
        type: 'scheduled-play',
        label,
        say: aiResponse.say,
        segue: aiResponse.segue,
        playlist,
        ttsPath,
      });
    }

    console.log(`Scheduled play executed: ${label}`);
    return { say: aiResponse.say, playlist, ttsPath };
  } catch (error) {
    console.error(`Scheduled play failed for ${label}:`, error.message);
    return null;
  }
}

export function cancelAllJobs() {
  scheduledJobs.forEach((job, label) => {
    job.cancel();
    console.log(`Cancelled: ${label}`);
  });
  scheduledJobs.clear();
}

export function getScheduledJobs() {
  return Array.from(scheduledJobs.keys());
}

export default {
  initScheduler,
  cancelAllJobs,
  getScheduledJobs,
  setWsBroadcast,
};
