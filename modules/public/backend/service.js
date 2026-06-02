import { prisma } from '@my/prisma';

export const getRoomInfoByToken = async (token) => {
  const tokenRecord = await prisma.apartmentTokens.findUnique({
    where: { token },
    include: {
      apartment: {
        include: {
          floor: {
            include: {
              building: true
            }
          }
        }
      }
    }
  });

  if (!tokenRecord) return null;

  // Check expiration
  if (new Date() > new Date(tokenRecord.expires_at)) {
    return null;
  }

  const apt = tokenRecord.apartment;
  return {
    apartment_id: apt.id,
    apartment_code: apt.apartment_code,
    floor_number: apt.floor.floor_number,
    building_name: apt.floor.building.name
  };
};

export const createPublicRequest = async (token, data) => {
  const roomInfo = await getRoomInfoByToken(token);
  if (!roomInfo) {
    throw new Error('Token không hợp lệ hoặc đã hết hạn');
  }

  // Find active contract for this apartment
  const activeContract = await prisma.contracts.findFirst({
    where: {
      apartment_id: roomInfo.apartment_id,
      status: 'ACTIVE'
    }
  });

  const contractId = activeContract ? activeContract.id : null;

  return prisma.serviceRequests.create({
    data: {
      apartment_id: roomInfo.apartment_id,
      contract_id: contractId,
      title: data.title,
      description: data.description,
      type: data.type || 'MAINTENANCE',
      priority: data.priority || 'NORMAL',
      status: 'PENDING',
      source: 'PUBLIC_FORM',
      requester_name: data.requester_name,
      requester_phone: data.requester_phone,
    },
    include: {
      apartment: {
        select: {
          id: true,
          apartment_code: true,
          floor: { select: { floor_number: true, building: { select: { name: true } } } }
        }
      }
    }
  });
};
