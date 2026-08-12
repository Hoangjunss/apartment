/**
 * Định dạng tiền tệ VND
 */
const formatVND = (val) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val) || 0);
};

/**
 * Hiển thị xu hướng tăng/giảm cho chỉ số
 */
const renderTrend = (diff, isGoodWhenLower = false, suffix = '') => {
  if (diff === 0 || diff === undefined || diff === null) {
    return `<span style="color: #6B7280; font-size: 13px; font-weight: normal;">(→ 0 ${suffix} - không đổi so với tuần trước)</span>`;
  }
  const isGood = isGoodWhenLower ? diff < 0 : diff > 0;
  const color = isGood ? '#10B981' : '#EF4444'; // Xanh lá nếu tốt, Đỏ nếu xấu
  const arrow = diff > 0 ? '↑' : '↓';
  const prefix = diff > 0 ? '+' : '';
  const formattedDiff = typeof diff === 'number' && !Number.isInteger(diff) ? diff.toFixed(1) : diff;
  return `<span style="color: ${color}; font-size: 13px; font-weight: bold;">(${arrow} ${prefix}${formattedDiff}${suffix} so với tuần trước)</span>`;
};

/**
 * Hàm sinh chuỗi HTML báo cáo tuần
 */
export function generateWeeklyReportEmail(data, frontendUrl = 'http://localhost:5173', scopeName = '') {
  const {
    finance = { collected: 0, collectedDiff: 0, expenses: 0, expensesDiff: 0, pending: 0, pendingDiff: 0 },
    contracts = { expiring: 0, expiringDiff: 0, signed: 0, signedDiff: 0 },
    invoices = { unpaidCount: 0, unpaidCountDiff: 0, unpaidAmount: 0, unpaidAmountDiff: 0, overdueCount: 0, overdueCountDiff: 0, overdueAmount: 0, overdueAmountDiff: 0 },
    occupancy = { rate: 0, rateDiff: 0 },
    serviceRequests = { open: 0, openDiff: 0, resolved: 0, resolvedDiff: 0 },
    activities = []
  } = data;

  const todayStr = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Top 5 hoạt động nổi bật dạng danh sách HTML
  const activityItems = activities.length > 0
    ? activities.slice(0, 5).map(act => {
        const timeStr = new Date(act.time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date(act.time).toLocaleDateString('vi-VN');
        return `
          <li style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #E5E7EB; list-style-type: none;">
            <strong style="color: #1F2937; font-size: 14px;">${act.title}</strong>
            <div style="color: #4B5563; font-size: 13px; margin-top: 2px;">${act.detail}</div>
            <div style="color: #9CA3AF; font-size: 11px; margin-top: 2px;">Lúc ${timeStr}</div>
          </li>
        `;
      }).join('')
    : '<li style="color: #6B7280; font-style: italic; list-style-type: none; text-align: center; padding: 15px 0;">Không có hoạt động nổi bật nào được ghi nhận trong tuần qua.</li>';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo Cáo Vận Hành Tuần - Ban Quản Lý</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F3F4F6; padding: 20px 0;">
    <tr>
      <td align="center">
        <!-- Main Container Card -->
        <table width="600" border="0" cellpadding="0" cellspacing="0" style="background-color: #FFFFFF; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden; border: 1px solid #E5E7EB;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%); padding: 35px 40px; text-align: left;">
              <span style="background-color: rgba(255, 255, 255, 0.2); color: #FFFFFF; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em;">Báo Cáo Định Kỳ</span>
              <h1 style="color: #FFFFFF; font-size: 24px; font-weight: bold; margin: 10px 0 5px 0; letter-spacing: -0.025em;">Báo Cáo Vận Hành Tuần</h1>
              <p style="color: #93C5FD; font-size: 14px; margin: 0;">${scopeName ? `Phạm vi: ${scopeName} | ` : ''}${todayStr}</p>
            </td>
          </tr>

          <!-- Intro Message -->
          <tr>
            <td style="padding: 30px 40px 10px 40px;">
              <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0;">
                Chào Ban Quản Trị, dưới đây là tổng hợp số liệu vận hành, doanh thu, công nợ và trạng thái kỹ thuật của ${scopeName ? `phạm vi ${scopeName}` : 'hệ thống căn hộ'} trong 7 ngày qua:
              </p>
            </td>
          </tr>


          <!-- Section 1: Tài chính -->
          <tr>
            <td style="padding: 15px 40px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #F3F4F6; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="color: #1E3A8A; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; text-transform: uppercase; border-bottom: 2px solid #3B82F6; padding-bottom: 5px;">
                      1. Tài Chính Tuần Qua
                    </h2>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                      <tr style="height: 35px;">
                        <td width="40%" style="color: #4B5563;">Doanh thu thu được:</td>
                        <td width="60%" style="font-weight: bold; color: #1F2937;">
                          ${formatVND(finance.collected)}
                          <div style="margin-top: 2px;">${renderTrend(finance.collectedDiff, false, ' đ')}</div>
                        </td>
                      </tr>
                      <tr style="height: 35px;">
                        <td style="color: #4B5563;">Chi phí đã thanh toán:</td>
                        <td style="font-weight: bold; color: #1F2937;">
                          ${formatVND(finance.expenses)}
                          <div style="margin-top: 2px;">${renderTrend(finance.expensesDiff, true, ' đ')}</div>
                        </td>
                      </tr>
                      <tr style="height: 35px;">
                        <td style="color: #4B5563;">Còn cần thu trong tuần:</td>
                        <td style="font-weight: bold; color: #D97706;">
                          ${formatVND(finance.pending)}
                          <div style="margin-top: 2px;">${renderTrend(finance.pendingDiff, true, ' đ')}</div>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top: 15px; text-align: right;">
                      <a href="${frontendUrl}/dashboard/finance" target="_blank" style="background-color: #3B82F6; color: #FFFFFF; font-size: 12px; font-weight: bold; padding: 8px 14px; border-radius: 6px; text-decoration: none; display: inline-block;">Xem chi tiết tài chính</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Section 2: Hợp đồng -->
          <tr>
            <td style="padding: 15px 40px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #F3F4F6; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="color: #1E3A8A; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; text-transform: uppercase; border-bottom: 2px solid #3B82F6; padding-bottom: 5px;">
                      2. Tình Trạng Hợp Đồng
                    </h2>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                      <tr style="height: 35px;">
                        <td width="40%" style="color: #4B5563;">Mới ký trong tuần:</td>
                        <td width="60%" style="font-weight: bold; color: #1F2937;">
                          ${contracts.signed} hợp đồng
                          <div style="margin-top: 2px;">${renderTrend(contracts.signedDiff, false, ' HĐ')}</div>
                        </td>
                      </tr>
                      <tr style="height: 35px;">
                        <td style="color: #4B5563;">Sắp hết hạn (trong 30 ngày):</td>
                        <td style="font-weight: bold; color: #EF4444;">
                          ${contracts.expiring} hợp đồng
                          <div style="margin-top: 2px;">${renderTrend(contracts.expiringDiff, true, ' HĐ')}</div>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top: 15px; text-align: right;">
                      <a href="${frontendUrl}/dashboard/contracts" target="_blank" style="background-color: #3B82F6; color: #FFFFFF; font-size: 12px; font-weight: bold; padding: 8px 14px; border-radius: 6px; text-decoration: none; display: inline-block;">Xem chi tiết hợp đồng</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Section 3: Hóa đơn -->
          <tr>
            <td style="padding: 15px 40px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #F3F4F6; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="color: #1E3A8A; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; text-transform: uppercase; border-bottom: 2px solid #3B82F6; padding-bottom: 5px;">
                      3. Hóa Đơn Công Nợ
                    </h2>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                      <tr style="height: 35px;">
                        <td width="40%" style="color: #4B5563;">Hóa đơn chưa thanh toán:</td>
                        <td width="60%" style="font-weight: bold; color: #1F2937;">
                          ${invoices.unpaidCount} hóa đơn (${formatVND(invoices.unpaidAmount)})
                          <div style="margin-top: 2px;">${renderTrend(invoices.unpaidCountDiff, true, ' hóa đơn')}</div>
                        </td>
                      </tr>
                      <tr style="height: 35px;">
                        <td style="color: #4B5563;">Hóa đơn quá hạn thanh toán:</td>
                        <td style="font-weight: bold; color: #EF4444;">
                          ${invoices.overdueCount} hóa đơn (${formatVND(invoices.overdueAmount)})
                          <div style="margin-top: 2px;">${renderTrend(invoices.overdueCountDiff, true, ' hóa đơn')}</div>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top: 15px; text-align: right;">
                      <a href="${frontendUrl}/dashboard/invoices" target="_blank" style="background-color: #3B82F6; color: #FFFFFF; font-size: 12px; font-weight: bold; padding: 8px 14px; border-radius: 6px; text-decoration: none; display: inline-block;">Xem chi tiết hóa đơn</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Section 4: Tỉ lệ lấp đầy -->
          <tr>
            <td style="padding: 15px 40px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #F3F4F6; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="color: #1E3A8A; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; text-transform: uppercase; border-bottom: 2px solid #3B82F6; padding-bottom: 5px;">
                      4. Tỉ Lệ Lấp Đầy Căn Hộ
                    </h2>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                      <tr style="height: 35px;">
                        <td width="40%" style="color: #4B5563;">Tỉ lệ hiện tại:</td>
                        <td width="60%" style="font-weight: bold; color: #1F2937; font-size: 16px;">
                          ${occupancy.rate}% 
                          <div style="margin-top: 2px;">${renderTrend(occupancy.rateDiff, false, '%')}</div>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top: 15px; text-align: right;">
                      <a href="${frontendUrl}/dashboard" target="_blank" style="background-color: #3B82F6; color: #FFFFFF; font-size: 12px; font-weight: bold; padding: 8px 14px; border-radius: 6px; text-decoration: none; display: inline-block;">Xem sơ đồ căn hộ</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Section 5: Yêu cầu kỹ thuật -->
          <tr>
            <td style="padding: 15px 40px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #F3F4F6; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="color: #1E3A8A; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; text-transform: uppercase; border-bottom: 2px solid #3B82F6; padding-bottom: 5px;">
                      5. Yêu Cầu Sửa Chữa Kỹ Thuật
                    </h2>
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size: 14px;">
                      <tr style="height: 35px;">
                        <td width="40%" style="color: #4B5563;">Đang mở (chờ/đang xử lý):</td>
                        <td width="60%" style="font-weight: bold; color: #D97706;">
                          ${serviceRequests.open} yêu cầu
                          <div style="margin-top: 2px;">${renderTrend(serviceRequests.openDiff, true, ' yêu cầu')}</div>
                        </td>
                      </tr>
                      <tr style="height: 35px;">
                        <td style="color: #4B5563;">Đã giải quyết xong:</td>
                        <td style="font-weight: bold; color: #10B981;">
                          ${serviceRequests.resolved} yêu cầu
                          <div style="margin-top: 2px;">${renderTrend(serviceRequests.resolvedDiff, false, ' yêu cầu')}</div>
                        </td>
                      </tr>
                    </table>
                    <div style="margin-top: 15px; text-align: right;">
                      <a href="${frontendUrl}/dashboard/service-requests" target="_blank" style="background-color: #3B82F6; color: #FFFFFF; font-size: 12px; font-weight: bold; padding: 8px 14px; border-radius: 6px; text-decoration: none; display: inline-block;">Xem chi tiết sửa chữa</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Section 6: Hoạt động nổi bật -->
          <tr>
            <td style="padding: 15px 40px 30px 40px;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB; border-radius: 8px; border: 1px solid #F3F4F6; padding: 20px;">
                <tr>
                  <td>
                    <h2 style="color: #1E3A8A; font-size: 16px; font-weight: bold; margin: 0 0 15px 0; text-transform: uppercase; border-bottom: 2px solid #3B82F6; padding-bottom: 5px;">
                      6. Top 5 Hoạt Động Nổi Bật
                    </h2>
                    <ul style="padding: 0; margin: 0;">
                      ${activityItems}
                    </ul>
                    <div style="margin-top: 15px; text-align: right;">
                      <a href="${frontendUrl}/dashboard/audit-logs" target="_blank" style="background-color: #3B82F6; color: #FFFFFF; font-size: 12px; font-weight: bold; padding: 8px 14px; border-radius: 6px; text-decoration: none; display: inline-block;">Xem toàn bộ lịch sử</a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #1F2937; padding: 30px 40px; text-align: center; color: #9CA3AF; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #FFFFFF; font-size: 14px;">Hệ Thống Quản Lý Căn Hộ Chung Cư</p>
              <p style="margin: 0 0 10px 0;">Email này được gửi tự động định kỳ từ hệ thống ban quản lý chung cư.</p>
              <p style="margin: 0;">&copy; 2026 Bản quyền thuộc về Ban Quản Lý Chung Cư Sunrise & Sunset.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
