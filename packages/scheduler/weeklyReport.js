import cron from 'node-cron';
import { runWeeklyReport } from '@my/report-backend';

/**
 * Đăng ký Lập lịch gửi báo cáo tự động vào 8h00 sáng thứ Hai hàng tuần
 */
export function initWeeklyReportScheduler() {
  console.log('[SCHEDULER] Khởi tạo bộ lập lịch Báo Cáo Tuần: Thứ Hai lúc 08:00 (Múi giờ Asia/Ho_Chi_Minh).');

  cron.schedule('0 8 * * 1', async () => {
    console.log('[SCHEDULER] Kích hoạt Cron Job gửi báo cáo tuần định kỳ...');
    try {
      await runWeeklyReport();
      console.log('[SCHEDULER] Gửi báo cáo tuần định kỳ hoàn tất.');
    } catch (err) {
      console.error('[SCHEDULER] Lỗi khi chạy gửi báo cáo tuần định kỳ:', err.message);
    }
  }, {
    timezone: 'Asia/Ho_Chi_Minh'
  });
}

