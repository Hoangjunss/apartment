// modules/building/frontend/hooks/useBuilding.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import * as buildingApi from '../services/building.api.js';

// ── Buildings ──────────────────────────────────────────────────────────────────

export function useBuildings(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.buildings(params),
    queryFn: () => buildingApi.getBuildings(params),
    placeholderData: (prev) => prev,
  });
}

export function useBuildingById(id) {
  return useQuery({
    queryKey: QUERY_KEYS.building(id),
    queryFn: () => buildingApi.getBuildingById(id),
    enabled: !!id,
  });
}

export function useCreateBuilding(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: buildingApi.createBuilding,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.buildings({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useUpdateBuilding(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => buildingApi.updateBuilding(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.building(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.buildings({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

// ── Floors ─────────────────────────────────────────────────────────────────────

export function useFloors(buildingId) {
  return useQuery({
    queryKey: QUERY_KEYS.buildingFloors(buildingId),
    queryFn: () => buildingApi.getFloorsByBuilding(buildingId),
    enabled: !!buildingId,
  });
}

export function useBulkCreateFloors(buildingId, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => buildingApi.bulkCreateFloors(buildingId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.buildingFloors(buildingId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.building(buildingId) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

// ── Apartments ─────────────────────────────────────────────────────────────────

export function useApartments(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.apartments(params),
    queryFn: () => buildingApi.getApartments(params),
    placeholderData: (prev) => prev,
  });
}

export function useApartmentById(id) {
  return useQuery({
    queryKey: QUERY_KEYS.apartment(id),
    queryFn: () => buildingApi.getApartmentById(id),
    enabled: !!id,
  });
}

export function useCreateApartment(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: buildingApi.createApartment,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartments({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useUpdateApartment(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => buildingApi.updateApartment(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartment(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartments({}) });
      options.onSuccess?.(data);
    },
    onError: options.onError,
  });
}

export function useUpdateApartmentStatus(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ new_status, reason }) =>
      buildingApi.updateApartmentStatus(id, new_status, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartment(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartmentStatusLogs(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartments({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useApartmentStatusLogs(id) {
  return useQuery({
    queryKey: QUERY_KEYS.apartmentStatusLogs(id),
    queryFn: () => buildingApi.getApartmentStatusLogs(id),
    enabled: !!id,
  });
}

// ── Furniture ──────────────────────────────────────────────────────────────────

export function useFurniture(apartmentId) {
  return useQuery({
    queryKey: QUERY_KEYS.furniture(apartmentId),
    queryFn: () => buildingApi.getFurniture(apartmentId),
    enabled: !!apartmentId,
  });
}

export function useAddFurniture(apartmentId, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => buildingApi.addFurniture(apartmentId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.furniture(apartmentId) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useUpdateFurniture(apartmentId, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => buildingApi.updateFurniture(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.furniture(apartmentId) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useDeleteFurniture(apartmentId, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: buildingApi.deleteFurniture,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.furniture(apartmentId) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}
