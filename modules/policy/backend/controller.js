import { prisma } from '@my/prisma';
import * as service from './service.js';

export const getAll = async (req, res) => {
  try {
    const { role, userId } = req.user;
    let data;
    if (role === 'ADMIN') {
      data = await service.getAllAssignments();
    } else {
      data = await prisma.buildingAssignments.findMany({
        where: { 
          user_id: Number(userId),
          user: { is_active: true }
        },
        include: {
          user: { select: { id: true, full_name: true, role: true, email: true } },
          building: { select: { id: true, name: true, code: true } },
          assigner: { select: { id: true, full_name: true } }
        },
        orderBy: { assigned_at: 'desc' }
      });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const assign = async (req, res) => {
  try {
    const { user_id, building_id, building_ids, notes } = req.body;
    const finalBuildingIds = building_ids || (building_id ? [building_id] : []);

    if (!user_id || !finalBuildingIds || !Array.isArray(finalBuildingIds) || finalBuildingIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Thiếu user_id hoặc building_ids' });
    }
    
    const data = await service.assignBuildings(user_id, finalBuildingIds, req.user.userId, notes);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const revoke = async (req, res) => {
  try {
    const { notes } = req.body;
    const data = await service.revokeAssignment(req.params.id, notes);
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};
