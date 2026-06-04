import * as service from './service.js';

export const getRoomInfo = async (req, res) => {
  try {
    const { t } = req.query;
    if (!t) {
      return res.status(400).json({ success: false, message: 'Thiếu mã token xác thực phòng' });
    }
    if (typeof t !== 'string' || !/^[a-zA-Z0-9]{8}$/.test(t)) {
      return res.status(400).json({ success: false, message: 'Định dạng token xác thực phòng không hợp lệ' });
    }
    const data = await service.getRoomInfoByToken(t);
    if (!data) {
      return res.status(404).json({ success: false, message: 'Token không tồn tại hoặc đã hết hạn' });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createPublicRequest = async (req, res) => {
  try {
    const { token, title, description, type, priority, requester_name, requester_phone } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, message: 'Thiếu mã token xác thực phòng' });
    }
    if (typeof token !== 'string' || !/^[a-zA-Z0-9]{8}$/.test(token)) {
      return res.status(400).json({ success: false, message: 'Định dạng token xác thực phòng không hợp lệ' });
    }
    if (!title || !description || !requester_name || !requester_phone) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }

    const data = await service.createPublicRequest(token, {
      title,
      description,
      type,
      priority,
      requester_name,
      requester_phone
    });

    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
