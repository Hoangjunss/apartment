import * as service from './service.js';

const getErrorStatus = (message) => {
  if (message.includes('đã tồn tại')) return 409;
  if (message.includes('Không tìm thấy')) return 404;
  if (message.includes('Không thể chuyển trạng thái') || message.includes('lớn hơn')) return 400;
  return 500;
};

// ==========================================
// BUILDINGS
// ==========================================

export const getBuildings = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const data = await service.getBuildings({ page: +page, limit: +limit, search });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getBuildingById = async (req, res) => {
  try {
    const data = await service.getBuildingById(+req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy tòa nhà' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createBuilding = async (req, res) => {
  try {
    const data = await service.createBuilding(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateBuilding = async (req, res) => {
  try {
    const data = await service.updateBuilding(+req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

// ==========================================
// FLOORS
// ==========================================

export const getFloorsByBuildingId = async (req, res) => {
  try {
    const data = await service.getFloorsByBuildingId(+req.params.buildingId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const bulkCreateFloors = async (req, res) => {
  try {
    const { from_floor, to_floor } = req.body;
    if (!from_floor || !to_floor) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp from_floor và to_floor' });
    }
    const data = await service.bulkCreateFloors(+req.params.buildingId, +from_floor, +to_floor);
    res.status(201).json({ success: true, data, message: `Đã tạo ${data.count} tầng thành công` });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

// ==========================================
// APARTMENTS
// ==========================================

export const getApartments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, building_id, floor_id, room_type } = req.query;
    const data = await service.getApartments({
      page: +page,
      limit: +limit,
      status,
      building_id: building_id ? +building_id : undefined,
      floor_id: floor_id ? +floor_id : undefined,
      room_type,
    });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getApartmentById = async (req, res) => {
  try {
    const data = await service.getApartmentById(+req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Không tìm thấy căn hộ' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const createApartment = async (req, res) => {
  try {
    const data = await service.createApartment(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateApartment = async (req, res) => {
  try {
    const data = await service.updateApartment(+req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const updateApartmentStatus = async (req, res) => {
  try {
    const { new_status, reason } = req.body;
    if (!new_status) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp new_status' });
    }
    const data = await service.updateApartmentStatus(+req.params.id, new_status, reason, req.user.userId);
    res.json({ success: true, data, message: 'Đổi trạng thái thành công' });
  } catch (err) {
    res.status(getErrorStatus(err.message)).json({ success: false, message: err.message });
  }
};

export const getApartmentStatusLogs = async (req, res) => {
  try {
    const data = await service.getApartmentStatusLogs(+req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ==========================================
// FURNITURE
// ==========================================

export const getFurnitureByApartmentId = async (req, res) => {
  try {
    const data = await service.getFurnitureByApartmentId(+req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const addFurniture = async (req, res) => {
  try {
    const data = await service.addFurniture(+req.params.id, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const updateFurniture = async (req, res) => {
  try {
    const data = await service.updateFurniture(+req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteFurniture = async (req, res) => {
  try {
    await service.deleteFurniture(+req.params.id);
    res.json({ success: true, message: 'Đã xóa nội thất thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
