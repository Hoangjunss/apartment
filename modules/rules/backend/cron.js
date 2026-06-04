import cron from 'node-cron';
import { runScheduledRules } from './service.js';

// Chạy quét quy tắc tự động vào lúc 00:05 hàng ngày
cron.schedule('5 0 * * *', () => {
  console.log('[Cron Job] Triggering Business Rules Engine scan...');
  runScheduledRules();
});

console.log('[Rules Backend] Daily Cron Job Scheduled at 00:05.');
