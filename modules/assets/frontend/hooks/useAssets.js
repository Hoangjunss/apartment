import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as assetsApi from '../services/assets.api.js';

export function useAssets(params = {}) {
  return useQuery({
    queryKey: ['assets', params],
    queryFn: () => assetsApi.getAssets(params),
    placeholderData: (prev) => prev
  });
}

export function useAssetById(id) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetsApi.getAssetById(id),
    enabled: !!id
  });
}

export function useAssetByCode(code, enabled = true) {
  return useQuery({
    queryKey: ['assetByCode', code],
    queryFn: () => assetsApi.getAssetByCode(code),
    enabled: enabled && !!code,
    retry: false
  });
}

export function useCreateAsset(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assetsApi.createAsset,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

export function useUpdateAsset(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => assetsApi.updateAsset(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

export function useDeleteAsset(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assetsApi.deleteAsset,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      options.onSuccess?.(data);
    },
    onError: options.onError
  });
}

export function useAssetTimeline(id) {
  return useQuery({
    queryKey: ['assetTimeline', id],
    queryFn: () => assetsApi.getAssetTimeline(id),
    enabled: !!id
  });
}

export function useAssetAttachments(id) {
  return useQuery({
    queryKey: ['assetAttachments', id],
    queryFn: () => assetsApi.getAssetAttachments(id),
    enabled: !!id
  });
}
