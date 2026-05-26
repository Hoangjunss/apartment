import * as service from './service.js';

const getErrorStatus = (message) => {
  if (message.includes('Không tìm thấy')) return 404;
  if (message.includes('đã tồn tại') || message.includes('đã được ghi') || message.includes('đã được ghi nhận') || message.includes('đã được thanh toán')) return 409;
  if (
    message.includes('Định dạng') ||
    message.includes('không được nhỏ hơn') ||
    message.includes('bắt buộc') ||
    message.includes('lớn hơn 0') ||
    message.includes('hoạt động') ||
    message.includes('không hợp lệ') ||
    message.includes('Thiếu') ||
    message.includes('Chưa có')
  ) {
    return 400;
  }
  return 500;
};

// Utilities (Điện Nước)
export const getUtilities = async (req, res) => {
  try {
    const { page = 1, limit = 20, apartment_id, billing_month } = req.query;
    const data = await service.getUtilityReadings({
      page: +page,
      limit: +limit,
      apartment_id: apartment_id ? +apartment_id : undefined,
      billing_month
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const recordUtility = async (req, res) => {
  try {
    const { apartment_id, billing_month, electricity_curr, water_curr } = req.body;
    if (!apartment_id || !billing_month || electricity_curr === undefined || water_curr === undefined) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ các thông tin bắt buộc' });
    }

    const data = await service.recordUtilityReading({
      ...req.body,
      apartment_id: +apartment_id,
      electricity_curr: +electricity_curr,
      water_curr: +water_curr,
      electricity_unit_price: req.body.electricity_unit_price !== undefined ? +req.body.electricity_unit_price : undefined,
      water_unit_price: req.body.water_unit_price !== undefined ? +req.body.water_unit_price : undefined
    }, req.user.userId);

    res.status(201).json({ success: true, data, message: 'Ghi nhận số điện nước thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

// Invoices (Hóa Đơn)
export const getInvoices = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, contract_id, billing_month } = req.query;
    const data = await service.getInvoices({
      page: +page,
      limit: +limit,
      status,
      contract_id: contract_id ? +contract_id : undefined,
      billing_month
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getInvoiceById = async (req, res) => {
  try {
    const data = await service.getInvoiceById(+req.params.id);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy hóa đơn' });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const generateInvoice = async (req, res) => {
  try {
    const { contract_id, billing_month, other_amount } = req.body;
    if (!contract_id || !billing_month) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn hợp đồng và tháng thanh toán' });
    }

    const data = await service.generateInvoice({
      contract_id: +contract_id,
      billing_month,
      other_amount: other_amount !== undefined ? +other_amount : 0
    }, req.user.userId);

    res.status(201).json({ success: true, data, message: 'Lập hóa đơn thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateInvoiceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp trạng thái' });
    }

    const data = await service.updateInvoiceStatus(+req.params.id, status);
    res.json({ success: true, data, message: 'Cập nhật trạng thái hóa đơn thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

// Payments (Phiếu Thu)
export const recordPayment = async (req, res) => {
  try {
    const { invoice_id, amount, payment_method, payment_date } = req.body;
    if (!invoice_id || amount === undefined || !payment_method || !payment_date) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ thông tin thanh toán bắt buộc' });
    }

    const data = await service.recordPayment({
      ...req.body,
      invoice_id: +invoice_id,
      amount: +amount
    }, req.user.userId);

    res.status(201).json({ success: true, data, message: 'Ghi nhận thanh toán thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};
