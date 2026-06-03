import { useQuery } from '@tanstack/react-query';
import * as reportApi from '../services/report.api.js';

export function useRevenueReport(params = {}) {
  return useQuery({
    queryKey: ['report-revenue', params],
    queryFn: () => reportApi.getRevenueReport(params),
    placeholderData: (prev) => prev,
  });
}

export function useOccupancyReport(params = {}) {
  return useQuery({
    queryKey: ['report-occupancy', params],
    queryFn: () => reportApi.getOccupancyReport(params),
    placeholderData: (prev) => prev,
  });
}

export function useMaintenanceReport(params = {}) {
  return useQuery({
    queryKey: ['report-maintenance', params],
    queryFn: () => reportApi.getMaintenanceReport(params),
    placeholderData: (prev) => prev,
  });
}

export function useContractsReport(params = {}) {
  return useQuery({
    queryKey: ['report-contracts', params],
    queryFn: () => reportApi.getContractsReport(params),
    placeholderData: (prev) => prev,
  });
}
