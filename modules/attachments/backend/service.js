import { prisma } from '@my/prisma';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Lấy danh sách file đính kèm của một thực thể.
 * 
 * @param {string} entityType - Loại thực thể (e.g. ServiceRequest, Contract...)
 * @param {number} entityId   - ID của thực thể
 */
export const getAttachments = async (entityType, entityId) => {
  return prisma.attachments.findMany({
    where: {
      entity_type: entityType,
      entity_id: Number(entityId),
    },
    orderBy: {
      created_at: 'desc',
    },
    include: {
      uploader: {
        select: {
          id: true,
          full_name: true,
          role: true,
        },
      },
    },
  });
};

/**
 * Tạo một bản ghi đính kèm file mới.
 */
export const createAttachment = async (data, userId) => {
  const { file_name, file_url, file_size, mime_type, entity_type, entity_id } = data;

  if (!file_name || !file_url || !entity_type || !entity_id) {
    throw new Error('Thiếu thông tin file đính kèm bắt buộc');
  }

  return prisma.attachments.create({
    data: {
      file_name,
      file_url,
      file_size: Number(file_size),
      mime_type,
      entity_type,
      entity_id: Number(entity_id),
      uploaded_by: userId,
    },
    include: {
      uploader: {
        select: {
          id: true,
          full_name: true,
          role: true,
        },
      },
    },
  });
};

/**
 * Trích xuất public_id của Cloudinary từ URL để thực hiện xóa.
 */
const getPublicIdFromUrl = (url) => {
  const parts = url.split('/upload/');
  if (parts.length < 2) return null;
  
  const pathWithVersion = parts[1];
  const pathParts = pathWithVersion.split('/');
  let startIndex = 0;
  
  // Bỏ qua phần version (e.g., v1717399...) nếu có
  if (pathParts[0].startsWith('v') && !isNaN(pathParts[0].substring(1))) {
    startIndex = 1;
  }
  
  const publicIdWithExt = pathParts.slice(startIndex).join('/');
  const lastDot = publicIdWithExt.lastIndexOf('.');
  if (lastDot === -1) return publicIdWithExt;
  return publicIdWithExt.substring(0, lastDot);
};

/**
 * Xóa một file đính kèm khỏi DB và Cloudinary.
 */
export const deleteAttachment = async (id, userId, userRole) => {
  const attachment = await prisma.attachments.findUnique({
    where: { id: Number(id) },
  });

  if (!attachment) {
    throw new Error('Không tìm thấy file đính kèm');
  }

  // Quyền xóa: Người upload hoặc ADMIN, MANAGER
  const isOwner = attachment.uploaded_by === userId;
  const isManager = ['ADMIN', 'MANAGER'].includes(userRole);

  if (!isOwner && !isManager) {
    throw new Error('Bạn không có quyền xóa file đính kèm này');
  }

  // 1. Xóa file trên Cloudinary
  const publicId = getPublicIdFromUrl(attachment.file_url);
  if (publicId) {
    try {
      // Cloudinary api yêu cầu xác định loại resource (image/raw/video)
      // Mặc định destroy hoạt động tốt với images, với files thông thường cần chỉ định resource_type là raw hoặc tự nhận diện
      let resourceType = 'image';
      const isImage = attachment.mime_type.startsWith('image/');
      if (!isImage) {
        resourceType = 'raw'; // PDF, Excel, v.v. được Cloudinary phân loại là 'raw'
      }

      await new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, { resource_type: resourceType }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
      console.log(`[Cloudinary] Deleted file ${publicId}`);
    } catch (cloudinaryErr) {
      console.error('[Cloudinary] Failed to delete file:', cloudinaryErr.message);
      // Vẫn tiếp tục xóa trong DB kể cả nếu Cloudinary báo lỗi (ví dụ file đã bị xóa trước đó)
    }
  }

  // 2. Xóa record trong DB
  return prisma.attachments.delete({
    where: { id: Number(id) },
  });
};
