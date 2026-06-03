import * as service from './service.js';

export const getComments = async (req, res) => {
  try {
    const { serviceRequestId } = req.params;
    if (!serviceRequestId) {
      return res.status(400).json({ success: false, message: 'Thiếu ID yêu cầu dịch vụ' });
    }

    const data = await service.getComments(serviceRequestId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createComment = async (req, res) => {
  try {
    const { service_request_id, content } = req.body;
    if (!service_request_id || !content) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ thông tin bắt buộc' });
    }

    const data = await service.createComment(req.body, req.user.userId);
    res.status(201).json({ success: true, data, message: 'Thêm bình luận thành công' });
  } catch (err) {
    const status = err.message.includes('Không tìm thấy') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};
