import * as service from './service.js';

export const getEvents = async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp start và end date (YYYY-MM-DD)' });
    }
    const data = await service.getEvents({ start, end });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
