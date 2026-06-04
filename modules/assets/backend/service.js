import { prisma } from '@my/prisma';
import { applyBuildingScope } from '@my/policy-backend';

// Helper tính khấu hao động (Straight-Line)
export const calculateAssetDepreciation = (asset) => {
  const cost = Number(asset.purchase_cost);
  const salvage = Number(asset.salvage_value);
  const lifeYears = Number(asset.useful_life_years);
  const purchaseDate = new Date(asset.purchase_date);
  const currentDate = new Date();

  if (purchaseDate > currentDate) {
    return {
      accumulatedDepreciation: 0,
      remainingValue: cost,
      monthsUsed: 0
    };
  }

  const totalMonths = lifeYears * 12;
  if (totalMonths <= 0) {
    return {
      accumulatedDepreciation: cost - salvage,
      remainingValue: salvage,
      monthsUsed: 0
    };
  }

  let monthsUsed = (currentDate.getFullYear() - purchaseDate.getFullYear()) * 12 + (currentDate.getMonth() - purchaseDate.getMonth());
  if (monthsUsed < 0) monthsUsed = 0;
  if (monthsUsed > totalMonths) monthsUsed = totalMonths;

  const monthlyDepreciation = (cost - salvage) / totalMonths;
  const accumulatedDepreciation = monthlyDepreciation * monthsUsed;
  const remainingValue = cost - accumulatedDepreciation;

  return {
    accumulatedDepreciation: Number(accumulatedDepreciation.toFixed(2)),
    remainingValue: Number(remainingValue.toFixed(2)),
    monthsUsed
  };
};

export const getAssets = async ({ page = 1, limit = 20, search, building_id, category, status } = {}, currentUser) => {
  let where = {};

  if (building_id) {
    where.building_id = Number(building_id);
  }
  if (category) {
    where.category = category;
  }
  if (status) {
    where.status = status;
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { asset_code: { contains: search } }
    ];
  }

  where = await applyBuildingScope(currentUser, where, 'Asset');

  const [items, total] = await Promise.all([
    prisma.assets.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { asset_code: 'asc' },
      include: {
        building: { select: { id: true, name: true, code: true } }
      }
    }),
    prisma.assets.count({ where })
  ]);

  // Inject dynamic depreciation info into items
  const itemsWithDepreciation = items.map(item => {
    const dep = calculateAssetDepreciation(item);
    return {
      ...item,
      depreciation: dep
    };
  });

  return { items: itemsWithDepreciation, total, page, limit };
};

export const getAssetById = async (id) => {
  const asset = await prisma.assets.findUnique({
    where: { id: Number(id) },
    include: {
      building: { select: { id: true, name: true, code: true } }
    }
  });

  if (!asset) return null;

  const dep = calculateAssetDepreciation(asset);
  return {
    ...asset,
    depreciation: dep
  };
};

export const getAssetByCode = async (code, currentUser) => {
  let where = { asset_code: code };
  where = await applyBuildingScope(currentUser, where, 'Asset');

  const asset = await prisma.assets.findFirst({
    where,
    include: {
      building: { select: { id: true, name: true, code: true } }
    }
  });

  if (!asset) return null;

  const dep = calculateAssetDepreciation(asset);
  return {
    ...asset,
    depreciation: dep
  };
};

export const createAsset = async (data) => {
  const existing = await prisma.assets.findUnique({
    where: { asset_code: data.asset_code }
  });
  if (existing) {
    throw new Error(`Mã tài sản '${data.asset_code}' đã tồn tại`);
  }

  return prisma.assets.create({
    data: {
      building_id: Number(data.building_id),
      asset_code: data.asset_code,
      name: data.name,
      category: data.category,
      status: data.status || 'ACTIVE',
      purchase_cost: Number(data.purchase_cost),
      salvage_value: Number(data.salvage_value),
      useful_life_years: Number(data.useful_life_years),
      purchase_date: new Date(data.purchase_date),
      depreciation_method: data.depreciation_method || 'STRAIGHT_LINE',
      description: data.description || null
    }
  });
};

export const updateAsset = async (id, data) => {
  if (data.asset_code) {
    const existing = await prisma.assets.findUnique({
      where: { asset_code: data.asset_code }
    });
    if (existing && existing.id !== Number(id)) {
      throw new Error(`Mã tài sản '${data.asset_code}' đã tồn tại`);
    }
  }

  return prisma.assets.update({
    where: { id: Number(id) },
    data: {
      building_id: data.building_id ? Number(data.building_id) : undefined,
      asset_code: data.asset_code,
      name: data.name,
      category: data.category,
      status: data.status,
      purchase_cost: data.purchase_cost !== undefined ? Number(data.purchase_cost) : undefined,
      salvage_value: data.salvage_value !== undefined ? Number(data.salvage_value) : undefined,
      useful_life_years: data.useful_life_years !== undefined ? Number(data.useful_life_years) : undefined,
      purchase_date: data.purchase_date ? new Date(data.purchase_date) : undefined,
      depreciation_method: data.depreciation_method,
      description: data.description !== undefined ? data.description : undefined
    }
  });
};

export const deleteAsset = async (id) => {
  return prisma.assets.delete({
    where: { id: Number(id) }
  });
};

// ─── POLYMORPHIC TIMELINE & ATTACHMENTS FOR ASSETS ────────

export const getAssetTimeline = async (id) => {
  return prisma.timeline.findMany({
    where: {
      entity_type: 'Asset',
      entity_id: Number(id)
    },
    orderBy: { created_at: 'desc' }
  });
};

export const getAssetAttachments = async (id) => {
  return prisma.attachments.findMany({
    where: {
      entity_type: 'Asset',
      entity_id: Number(id)
    },
    orderBy: { created_at: 'desc' }
  });
};
