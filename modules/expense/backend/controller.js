import * as service from './service.js';

const getErrorStatus = (message) => {
  if (message.includes('Không tìm thấy')) return 404;
  if (message.includes('Trùng lặp') || message.includes('đã tồn tại')) return 409;
  if (
    message.includes('Thiếu') ||
    message.includes('không hợp lệ') ||
    message.includes('bắt buộc') ||
    message.includes('lớn hơn 0')
  ) {
    return 400;
  }
  return 500;
};

export const getExpenses = async (req, res) => {
  try {
    const { page = 1, limit = 20, building_id, category, status, start_date, end_date } = req.query;
    const data = await service.getExpenses({
      page: +page,
      limit: +limit,
      building_id: building_id ? +building_id : undefined,
      category,
      status,
      start_date,
      end_date
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getExpensesSummary = async (req, res) => {
  try {
    const { building_id, year, month } = req.query;
    const data = await service.getExpensesSummary({
      building_id: building_id ? +building_id : undefined,
      year: year ? +year : undefined,
      month: month ? +month : undefined
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createExpense = async (req, res) => {
  try {
    const { building_id, category, title, amount, expense_date, status, description, receipt_url } = req.body;
    if (!building_id || !category || !title || amount === undefined || !expense_date) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }

    const data = await service.createExpense({
      ...req.body,
      building_id: +building_id,
      amount: +amount,
      expense_date: new Date(expense_date)
    }, req.user.userId);

    res.status(201).json({ success: true, data, message: 'Tạo chi phí tòa nhà thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { building_id, category, title, amount, expense_date } = req.body;
    if (!building_id || !category || !title || amount === undefined || !expense_date) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }

    const data = await service.updateExpense(+req.params.id, {
      ...req.body,
      building_id: +building_id,
      amount: +amount,
      expense_date: new Date(expense_date)
    });

    res.json({ success: true, data, message: 'Cập nhật chi phí tòa nhà thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateExpenseStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp trạng thái' });
    }

    const data = await service.updateExpenseStatus(+req.params.id, status);
    res.json({ success: true, data, message: 'Cập nhật trạng thái thanh toán thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const data = await service.deleteExpense(+req.params.id);
    res.json({ success: true, data, message: 'Xóa chi phí tòa nhà thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};
