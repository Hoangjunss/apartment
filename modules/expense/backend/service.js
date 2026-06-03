import { prisma } from '@my/prisma';

export const getExpenses = async ({ page = 1, limit = 20, building_id, category, status, start_date, end_date }) => {
  const where = { deleted_at: null };
  if (building_id) where.building_id = building_id;
  if (category) where.category = category;
  if (status) where.status = status;
  if (start_date || end_date) {
    where.expense_date = {};
    if (start_date) where.expense_date.gte = new Date(start_date);
    if (end_date) where.expense_date.lte = new Date(end_date);
  }

  const [items, total] = await Promise.all([
    prisma.buildingExpenses.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { expense_date: 'desc' },
      include: {
        building: { select: { id: true, name: true, code: true } },
        creator: { select: { id: true, full_name: true } }
      }
    }),
    prisma.buildingExpenses.count({ where })
  ]);

  return { items, total, page, limit };
};

export const getExpensesSummary = async ({ building_id, year, month }) => {
  const where = { deleted_at: null, status: 'PAID' };
  if (building_id) where.building_id = building_id;

  if (year !== undefined) {
    let start, end;
    if (month !== undefined) {
      start = new Date(year, month - 1, 1);
      end = new Date(year, month, 0, 23, 59, 59, 999);
    } else {
      start = new Date(year, 0, 1);
      end = new Date(year, 11, 31, 23, 59, 59, 999);
    }
    where.expense_date = { gte: start, lte: end };
  }

  const expenses = await prisma.buildingExpenses.findMany({ where });

  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const byCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
    return acc;
  }, {});

  return {
    totalAmount,
    byCategory
  };
};

export const createExpense = async (data, userId) => {
  const { building_id, category, title, amount, expense_date, status, description, receipt_url } = data;

  if (Number(amount) <= 0) {
    throw new Error('Số tiền chi phí phải lớn hơn 0');
  }

  return prisma.buildingExpenses.create({
    data: {
      building_id,
      category,
      title,
      amount: Number(amount),
      expense_date,
      status: status || 'PENDING',
      description,
      receipt_url,
      created_by: userId
    }
  });
};

export const updateExpense = async (id, data) => {
  const { building_id, category, title, amount, expense_date, description, receipt_url } = data;

  if (Number(amount) <= 0) {
    throw new Error('Số tiền chi phí phải lớn hơn 0');
  }

  const expense = await prisma.buildingExpenses.findUnique({
    where: { id, deleted_at: null }
  });

  if (!expense) {
    throw new Error('Không tìm thấy chi phí tòa nhà');
  }

  return prisma.buildingExpenses.update({
    where: { id },
    data: {
      building_id,
      category,
      title,
      amount: Number(amount),
      expense_date,
      description,
      receipt_url
    }
  });
};

export const updateExpenseStatus = async (id, status) => {
  const validStatuses = ['PENDING', 'PAID'];
  if (!validStatuses.includes(status)) {
    throw new Error('Trạng thái chi phí không hợp lệ');
  }

  const expense = await prisma.buildingExpenses.findUnique({
    where: { id, deleted_at: null }
  });

  if (!expense) {
    throw new Error('Không tìm thấy chi phí tòa nhà');
  }

  return prisma.buildingExpenses.update({
    where: { id },
    data: { status }
  });
};

export const deleteExpense = async (id) => {
  const expense = await prisma.buildingExpenses.findUnique({
    where: { id, deleted_at: null }
  });

  if (!expense) {
    throw new Error('Không tìm thấy chi phí tòa nhà');
  }

  // Soft delete
  return prisma.buildingExpenses.update({
    where: { id },
    data: { deleted_at: new Date() }
  });
};
