import nodemailer from 'nodemailer';

/**
 * Gửi email sử dụng SMTP Transporter cấu hình qua biến môi trường.
 * Nếu thiếu thông tin cấu hình, hàm sẽ in nội dung mail ra console (Mock Mode) để tránh lỗi hệ thống.
 */
export async function sendEmail({ to, subject, html }) {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || '"Ban Quản Lý Chung Cư" <no-reply@qlchdc.com>';

  if (!host || !user || !pass) {
    console.warn('[EMAIL SENDER] Cảnh báo: Thiếu cấu hình SMTP trong .env (SMTP_HOST, SMTP_USER, SMTP_PASS).');
    console.log(`[EMAIL SENDER] --- MÔ PHỎNG GỬI EMAIL ---`);
    console.log(`[EMAIL SENDER] Đến: ${to}`);
    console.log(`[EMAIL SENDER] Tiêu đề: ${subject}`);
    console.log(`[EMAIL SENDER] Nội dung thư (HTML) đã được sinh ra thành công.`);
    return {
      messageId: `mocked-mail-id-${Date.now()}`,
      mocked: true
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const info = await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });

  return info;
}
