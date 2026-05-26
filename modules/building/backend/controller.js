import * as service from './service.js';

export const getBuildings = async (req, res) => {
  try {
    const data = await service.getBuildings();
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getBuildingById = async (req, res) => {
  try {
    const data = await service.getBuildingById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createBuilding = async (req, res) => {
  try {
    const data = await service.createBuilding(req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateBuilding = async (req, res) => {
  try {
    const data = await service.updateBuilding(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getFloorsByBuilding = async (req, res) => {
  try {
    const data = await service.getFloorsByBuilding(req.params.buildingId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const bulkCreateFloors = async (req, res) => {
  try {
    const data = await service.bulkCreateFloors(req.params.buildingId, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getApartments = async (req, res) => {
  try {
    const data = await service.getApartments(req.query);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getApartmentById = async (req, res) => {
  try {
    const data = await service.getApartmentById(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const createApartment = async (req, res) => {
  try {
    const data = await service.createApartment(req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateApartment = async (req, res) => {
  try {
    const data = await service.updateApartment(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateApartmentStatus = async (req, res) => {
  try {
    const { new_status, reason } = req.body;
    const userId = req.user.userId;
    const data = await service.updateApartmentStatus(req.params.id, new_status, reason, userId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getApartmentStatusLogs = async (req, res) => {
  try {
    const data = await service.getApartmentStatusLogs(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getFurniture = async (req, res) => {
  try {
    const data = await service.getFurnitureByApartment(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const addFurniture = async (req, res) => {
  try {
    const data = await service.addFurniture(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateFurniture = async (req, res) => {
  try {
    const data = await service.updateFurniture(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteFurniture = async (req, res) => {
  try {
    await service.deleteFurniture(req.params.id);
    res.json({ success: true, message: 'Đã xóa nội thất thành công' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
