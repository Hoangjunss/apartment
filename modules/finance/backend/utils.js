import { WATER_PRICE_PER_PERSON } from './constants.js';

/**
 * Calculates the flat-rate water cost based on the number of residents.
 * @param {number|null} soNguoiO - Number of residents.
 * @returns {number} The calculated water cost in VND.
 */
export const calculateWaterCost = (soNguoiO) => {
  const count = soNguoiO !== null && soNguoiO !== undefined ? Number(soNguoiO) : 0;
  return count * WATER_PRICE_PER_PERSON;
};
