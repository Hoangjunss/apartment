import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as inventoryApi from '../services/inventory.api.js';

export function useWarehouses(params = {}) {
  return useQuery({
    queryKey: ['warehouses', params],
    queryFn: () => inventoryApi.getWarehouses(params),
    placeholderData: (prev) => prev
  });
}

export function useWarehouseById(id) {
  return useQuery({
    queryKey: ['warehouse', id],
    queryFn: () => inventoryApi.getWarehouseById(id),
    enabled: !!id
  });
}

export function useCreateWarehouse(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createWarehouse,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

export function useUpdateWarehouse(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => inventoryApi.updateWarehouse(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouse', id] });
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

export function useDeleteWarehouse(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.deleteWarehouse,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

export function useInventoryItems(params = {}) {
  return useQuery({
    queryKey: ['inventoryItems', params],
    queryFn: () => inventoryApi.getInventoryItems(params),
    placeholderData: (prev) => prev
  });
}

export function useInventoryItemById(id) {
  return useQuery({
    queryKey: ['inventoryItem', id],
    queryFn: () => inventoryApi.getInventoryItemById(id),
    enabled: !!id
  });
}

export function useCreateInventoryItem(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.createInventoryItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

export function useUpdateInventoryItem(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => inventoryApi.updateInventoryItem(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItem', id] });
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

export function useDeleteInventoryItem(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.deleteInventoryItem,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

export function useStockTransactions(params = {}) {
  return useQuery({
    queryKey: ['stockTransactions', params],
    queryFn: () => inventoryApi.getStockTransactions(params),
    placeholderData: (prev) => prev
  });
}

export function useRecordStockTransaction(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inventoryApi.recordStockTransaction,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['inventoryItems'] });
      queryClient.invalidateQueries({ queryKey: ['stockTransactions'] });
      if (data.inventory_item_id) {
        queryClient.invalidateQueries({ queryKey: ['inventoryItem', data.inventory_item_id] });
      }
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}
