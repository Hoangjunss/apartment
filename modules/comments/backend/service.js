import { prisma } from '@my/prisma';

/**
 * Lấy danh sách bình luận của một yêu cầu dịch vụ.
 * 
 * @param {number} serviceRequestId - ID của yêu cầu dịch vụ
 */
export const getComments = async (serviceRequestId) => {
  return prisma.serviceRequestComments.findMany({
    where: {
      service_request_id: Number(serviceRequestId),
    },
    orderBy: {
      created_at: 'asc',
    },
    include: {
      creator: {
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
 * Tạo một bình luận mới.
 * 
 * @param {object} data
 * @param {number} data.service_request_id - ID của yêu cầu dịch vụ
 * @param {string} data.content            - Nội dung bình luận
 * @param {number} userId                  - ID người viết bình luận
 */
export const createComment = async (data, userId) => {
  const { service_request_id, content } = data;

  if (!service_request_id || !content || !content.trim()) {
    throw new Error('Nội dung bình luận không được để trống');
  }

  // Kiểm tra sự tồn tại của Service Request
  const srExists = await prisma.serviceRequests.findUnique({
    where: { id: Number(service_request_id) },
  });

  if (!srExists) {
    throw new Error('Không tìm thấy yêu cầu kỹ thuật liên quan');
  }

  return prisma.serviceRequestComments.create({
    data: {
      service_request_id: Number(service_request_id),
      content: content.trim(),
      created_by: userId,
    },
    include: {
      creator: {
        select: {
          id: true,
          full_name: true,
          role: true,
        },
      },
    },
  });
};
