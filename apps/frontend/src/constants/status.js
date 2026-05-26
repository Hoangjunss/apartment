// src/constants/status.js

export const APARTMENT_STATUS_CONFIG = {
  AVAILABLE:   { label: 'Còn trống',   className: 'bg-green-100 text-green-800' },
  OCCUPIED:    { label: 'Đang thuê',   className: 'bg-blue-100 text-blue-800' },
  MAINTENANCE: { label: 'Bảo trì',     className: 'bg-yellow-100 text-yellow-800' },
  RESERVED:    { label: 'Đã đặt cọc', className: 'bg-purple-100 text-purple-800' },
};

export const CONTRACT_STATUS_CONFIG = {
  ACTIVE:        { label: 'Hiệu lực',     className: 'bg-green-100 text-green-800' },
  EXPIRING_SOON: { label: 'Sắp hết hạn', className: 'bg-orange-100 text-orange-800' },
  EXPIRED:       { label: 'Hết hạn',      className: 'bg-gray-100 text-gray-600' },
  TERMINATED:    { label: 'Chấm dứt',     className: 'bg-red-100 text-red-800' },
};

export const ROOM_TYPE_LABELS = {
  STUDIO:   'Studio',
  ONE_BR:   '1 Phòng ngủ',
  TWO_BR:   '2 Phòng ngủ',
  THREE_BR: '3 Phòng ngủ',
};

export const FURNITURE_CONDITION_LABELS = {
  NEW:  'Mới',
  GOOD: 'Tốt',
  WORN: 'Cũ',
};

export const GENDER_LABELS = {
  MALE:   'Nam',
  FEMALE: 'Nữ',
  OTHER:  'Khác',
};

export const REGISTRATION_TYPE_LABELS = {
  TEMPORARY_RESIDENCE: 'Tạm trú',
  TEMPORARY_ABSENCE:   'Tạm vắng',
};

// State machine: trạng thái tiếp theo hợp lệ
export const VALID_APARTMENT_TRANSITIONS = {
  AVAILABLE:   ['OCCUPIED', 'RESERVED', 'MAINTENANCE'],
  OCCUPIED:    ['AVAILABLE'],
  MAINTENANCE: ['AVAILABLE'],
  RESERVED:    ['AVAILABLE', 'OCCUPIED'],
};
