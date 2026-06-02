/**
 * Script cập nhật due_date cho các hóa đơn cũ.
 * 
 * Logic cũ: due_date = ngày tạo + payment_due_day (số ngày)
 * Logic mới: due_date = payment_due_day của tháng KẾ TIẾP billing_month
 * 
 * Chạy: node modules/finance/backend/fix-old-due-dates.js
 */
import { prisma } from '@my/prisma';

function calcDueDate(billingMonth, paymentDueDay) {
  const [year, month] = billingMonth.split('-').map(Number);

  let dueYear = year;
  let dueMonth = month + 1;
  if (dueMonth > 12) {
    dueMonth = 1;
    dueYear += 1;
  }

  const lastDayOfDueMonth = new Date(dueYear, dueMonth, 0).getDate();
  const actualDueDay = Math.min(paymentDueDay, lastDayOfDueMonth);

  return new Date(dueYear, dueMonth - 1, actualDueDay);
}

async function fixOldDueDates() {
  console.log('[FIX] Bắt đầu cập nhật due_date cho hóa đơn cũ...\n');

  // Lấy tất cả hóa đơn kèm thông tin contract
  const invoices = await prisma.invoices.findMany({
    include: {
      contract: {
        select: { payment_due_day: true, contract_code: true }
      }
    },
    orderBy: { id: 'asc' }
  });

  let updatedCount = 0;
  let skippedCount = 0;

  for (const inv of invoices) {
    const paymentDueDay = inv.contract?.payment_due_day || 5;
    const correctDueDate = calcDueDate(inv.billing_month, paymentDueDay);

    // So sánh ngày (bỏ qua giờ)
    const currentDue = new Date(inv.due_date);
    currentDue.setHours(0, 0, 0, 0);
    correctDueDate.setHours(0, 0, 0, 0);

    if (currentDue.getTime() === correctDueDate.getTime()) {
      skippedCount++;
      continue;
    }

    console.log(
      `  [UPDATE] ${inv.invoice_code} | billing: ${inv.billing_month} | ` +
      `due_day: ${paymentDueDay} | ` +
      `cũ: ${currentDue.toLocaleDateString('vi-VN')} → ` +
      `mới: ${correctDueDate.toLocaleDateString('vi-VN')}`
    );

    await prisma.invoices.update({
      where: { id: inv.id },
      data: { due_date: correctDueDate }
    });

    updatedCount++;
  }

  console.log(`\n[FIX] Hoàn thành!`);
  console.log(`  ✅ Đã cập nhật: ${updatedCount} hóa đơn`);
  console.log(`  ⏭️  Bỏ qua (đã đúng): ${skippedCount} hóa đơn`);

  await prisma.$disconnect();
}

fixOldDueDates().catch((err) => {
  console.error('[FIX] Lỗi:', err);
  prisma.$disconnect();
  process.exit(1);
});
