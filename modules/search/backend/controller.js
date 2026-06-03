import * as service from './service.js';

export const handleGlobalSearch = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        data: { tenants: [], apartments: [], buildings: [], contracts: [], invoices: [] }
      });
    }

    const data = await service.globalSearch(q);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
