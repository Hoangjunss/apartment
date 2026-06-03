import * as service from './service.js';
import * as exportService from './export.service.js';

export const getRevenueReport = async (req, res) => {
  try {
    const { building_id, from_month, to_month } = req.query;
    const data = await service.getRevenueReport({ building_id, from_month, to_month });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getOccupancyReport = async (req, res) => {
  try {
    const { building_id } = req.query;
    const data = await service.getOccupancyReport({ building_id });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getMaintenanceReport = async (req, res) => {
  try {
    const { building_id, from_month, to_month } = req.query;
    const data = await service.getMaintenanceReport({ building_id, from_month, to_month });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getContractsReport = async (req, res) => {
  try {
    const { building_id, from_month, to_month } = req.query;
    const data = await service.getContractsReport({ building_id, from_month, to_month });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// EXPORT CONTROLLERS
const sendExportFile = (res, buffers, format, filename) => {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
    // Thêm BOM \uFEFF giúp Excel đọc được chữ tiếng Việt không bị lỗi font
    res.send('\uFEFF' + buffers.csvContent);
  } else {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
    res.send(buffers.excelBuffer);
  }
};

export const exportTenants = async (req, res) => {
  try {
    const { format = 'excel', search } = req.query;
    const buffers = await exportService.exportTenants({ search });
    sendExportFile(res, buffers, format, 'danh_sach_khach_thue');
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const exportContracts = async (req, res) => {
  try {
    const { format = 'excel', status, search } = req.query;
    const buffers = await exportService.exportContracts({ status, search });
    sendExportFile(res, buffers, format, 'danh_sach_hop_dong');
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const exportInvoices = async (req, res) => {
  try {
    const { format = 'excel', status, billing_month, search } = req.query;
    const buffers = await exportService.exportInvoices({ status, billing_month, search });
    sendExportFile(res, buffers, format, 'danh_sach_hoa_don');
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const exportRevenue = async (req, res) => {
  try {
    const { format = 'excel', building_id, from_month, to_month } = req.query;
    const buffers = await exportService.exportRevenue({ building_id, from_month, to_month });
    sendExportFile(res, buffers, format, 'bao_cao_doanh_thu');
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
