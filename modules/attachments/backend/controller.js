import multer from 'multer';
import path from 'path';
import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import * as service from './service.js';

// Setup multer in-memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // Giới hạn 10MB
  },
});

export const uploadMiddleware = upload.single('file');

/**
 * Upload buffer lên Cloudinary dùng Stream.
 */
const uploadToCloudinary = (fileBuffer, fileName, mimeType) => {
  return new Promise((resolve, reject) => {
    // Làm sạch tên file để đưa vào public_id của Cloudinary
    const parsed = path.parse(fileName);
    const cleanName = parsed.name.replace(/[^a-zA-Z0-9]/g, '_');
    const folder = process.env.CLOUDINARY_FOLDER || 'qlchdv';

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto', // Tự động phát hiện ảnh/raw file
        public_id: `${cleanName}_${Date.now()}`,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(fileBuffer).pipe(uploadStream);
  });
};

export const getAttachments = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.query;
    if (!entity_type || !entity_id) {
      return res.status(400).json({ success: false, message: 'Thiếu entity_type hoặc entity_id' });
    }

    const data = await service.getAttachments(entity_type, entity_id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const uploadAttachment = async (req, res) => {
  try {
    const { entity_type, entity_id } = req.body;
    const file = req.file;

    if (!entity_type || !entity_id) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin entity_type hoặc entity_id' });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: 'Không có file được chọn' });
    }

    // 1. Upload file lên Cloudinary thông qua stream
    const cloudinaryResult = await uploadToCloudinary(file.buffer, file.originalname, file.mimetype);

    // 2. Lưu thông tin URL của Cloudinary trả về vào DB
    const data = await service.createAttachment({
      file_name: file.originalname,
      file_url: cloudinaryResult.secure_url,
      file_size: file.size,
      mime_type: file.mimetype,
      entity_type,
      entity_id: +entity_id,
    }, req.user.userId);

    res.status(201).json({
      success: true,
      data,
      message: 'Upload file đính kèm thành công',
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: 'Thiếu ID file đính kèm' });
    }

    const data = await service.deleteAttachment(+id, req.user.userId, req.user.role);
    res.json({ success: true, data, message: 'Xóa file đính kèm thành công' });
  } catch (err) {
    const status = err.message.includes('không có quyền') ? 403 : err.message.includes('Không tìm thấy') ? 404 : 400;
    res.status(status).json({ success: false, message: err.message });
  }
};
