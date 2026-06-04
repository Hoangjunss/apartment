import * as service from './service.js';

const getErrorStatus = (message) => {
  if (message.includes('đã tồn tại')) return 409;
  if (message.includes('Không tìm thấy')) return 404;
  return 500;
};

export const getAssets = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, building_id, category, status } = req.query;
    const data = await service.getAssets({
      page: +page,
      limit: +limit,
      search,
      building_id: building_id ? +building_id : undefined,
      category,
      status
    }, req.user);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAssetById = async (req, res) => {
  try {
    const data = await service.getAssetById(+req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy tài sản' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAssetByCode = async (req, res) => {
  try {
    const data = await service.getAssetByCode(req.params.code, req.user);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy tài sản với mã này hoặc không có quyền truy cập' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createAsset = async (req, res) => {
  try {
    const data = await service.createAsset(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateAsset = async (req, res) => {
  try {
    const data = await service.updateAsset(+req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const deleteAsset = async (req, res) => {
  try {
    await service.deleteAsset(+req.params.id);
    res.json({ success: true, message: 'Xóa tài sản thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAssetTimeline = async (req, res) => {
  try {
    const data = await service.getAssetTimeline(+req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getAssetAttachments = async (req, res) => {
  try {
    const data = await service.getAssetAttachments(+req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
