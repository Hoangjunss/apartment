# Skill: integrate-api

Dùng skill này khi viết **custom hooks** kết nối Frontend ↔ Backend — bao gồm `useQuery` (fetch data) và `useMutation` (tạo/sửa/xoá).

---

## Quy tắc quan trọng

1. **Hook là cầu nối duy nhất** giữa component và service API — component không gọi service trực tiếp
2. **`useQuery`** cho GET — cache tự động, refetch khi stale
3. **`useMutation`** cho POST/PUT/PATCH/DELETE — invalidate cache sau khi thành công
4. **Query key** theo convention trong `api-rule.md` (dùng `QUERY_KEYS` object)
5. **Error không được xử lý trong hook** — bubble lên component qua `onError` callback

---

## Template: useQuery Hook (GET list)

```js
// modules/<module>/frontend/hooks/useXxx.js
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import { getXxxList } from '../services/xxx.api.js';

/**
 * Lấy danh sách Xxx có phân trang + filter
 */
export function useXxxList({ page = 1, limit = 20, search, ...filters } = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.xxxList({ page, limit, search, ...filters }),
    queryFn: () => getXxxList({ page, limit, search, ...filters }),
    placeholderData: (prev) => prev, // Giữ data cũ khi đang fetch trang mới
  });
}

/**
 * Lấy chi tiết 1 Xxx theo id
 */
export function useXxxById(id) {
  return useQuery({
    queryKey: QUERY_KEYS.xxx(id),
    queryFn: () => getXxxById(id),
    enabled: !!id, // Chỉ fetch khi có id
  });
}
```

---

## Template: useMutation Hook (POST/PUT/PATCH/DELETE)

```js
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import { createXxx, updateXxx, deleteXxx } from '../services/xxx.api.js';

/**
 * Tạo Xxx mới
 */
export function useCreateXxx(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => createXxx(data),
    onSuccess: (newItem) => {
      // Invalidate list để refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xxxList({}) });
      options.onSuccess?.(newItem);
    },
    onError: options.onError,
  });
}

/**
 * Cập nhật Xxx
 */
export function useUpdateXxx(id, options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => updateXxx(id, data),
    onSuccess: (updated) => {
      // Invalidate cả list và detail
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xxx(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xxxList({}) });
      options.onSuccess?.(updated);
    },
    onError: options.onError,
  });
}

/**
 * Xoá Xxx
 */
export function useDeleteXxx(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteXxx(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.xxxList({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}
```

---

## Hooks từng Module — Đầy đủ

### hooks/useAuth.js
```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import * as authApi from '../services/auth.api.js';

export function useUsers(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.users(params),
    queryFn: () => authApi.getUsers(params),
  });
}

export function useCreateUser(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useUpdateUser(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => authApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useToggleUserActive(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.toggleUserActive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useChangePassword(options = {}) {
  return useMutation({
    mutationFn: ({ oldPassword, newPassword }) =>
      authApi.changePassword(oldPassword, newPassword),
    onSuccess: options.onSuccess,
    onError: options.onError,
  });
}
```

### hooks/useBuilding.js
```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import * as buildingApi from '../services/building.api.js';

// ── Buildings ─────────────────────────────────────────────────────────────────

export function useBuildings(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.buildings(params),
    queryFn: () => buildingApi.getBuildings(params),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.buildings({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useUpdateBuilding(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => buildingApi.updateBuilding(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.building(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.buildings({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

// ── Floors ────────────────────────────────────────────────────────────────────

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
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

// ── Apartments ────────────────────────────────────────────────────────────────

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartments({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useUpdateApartment(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => buildingApi.updateApartment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartment(id) });
      options.onSuccess?.();
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

// ── Furniture ─────────────────────────────────────────────────────────────────

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
```

### hooks/useTenant.js
```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import * as tenantApi from '../services/tenant.api.js';

export function useTenants(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.tenants(params),
    queryFn: () => tenantApi.getTenants(params),
    placeholderData: (prev) => prev,
  });
}

export function useTenantById(id) {
  return useQuery({
    queryKey: QUERY_KEYS.tenant(id),
    queryFn: () => tenantApi.getTenantById(id),
    enabled: !!id,
  });
}

export function useTenantHistory(id) {
  return useQuery({
    queryKey: QUERY_KEYS.tenantHistory(id),
    queryFn: () => tenantApi.getTenantHistory(id),
    enabled: !!id,
  });
}

export function useCreateTenant(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantApi.createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useUpdateTenant(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => tenantApi.updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenant(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useRegistrationsByTenant(tenantId) {
  return useQuery({
    queryKey: QUERY_KEYS.registrations(tenantId),
    queryFn: () => tenantApi.getRegistrationsByTenant(tenantId),
    enabled: !!tenantId,
  });
}

export function useCreateRegistration(tenantId, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => tenantApi.createRegistration(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.registrations(tenantId) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}
```

### hooks/useContract.js
```js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/queryKeys.js';
import * as contractApi from '../services/contract.api.js';

export function useContracts(params = {}) {
  return useQuery({
    queryKey: QUERY_KEYS.contracts(params),
    queryFn: () => contractApi.getContracts(params),
    placeholderData: (prev) => prev,
  });
}

export function useContractById(id) {
  return useQuery({
    queryKey: QUERY_KEYS.contract(id),
    queryFn: () => contractApi.getContractById(id),
    enabled: !!id,
  });
}

export function useExpiringSoon() {
  return useQuery({
    queryKey: QUERY_KEYS.expiringSoon,
    queryFn: contractApi.getExpiringSoon,
    staleTime: 1000 * 60 * 5, // 5 phút
  });
}

export function useCreateContract(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: contractApi.createContract,
    onSuccess: (newContract) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts({}) });
      // Căn hộ đã đổi trạng thái → invalidate apartments
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartments({}) });
      options.onSuccess?.(newContract);
    },
    onError: options.onError,
  });
}

export function useTerminateContract(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason) => contractApi.terminateContract(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contract(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts({}) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.apartments({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useRenewContract(id, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => contractApi.renewContract(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contract(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.renewals(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.contracts({}) });
      options.onSuccess?.();
    },
    onError: options.onError,
  });
}

export function useRenewals(contractId) {
  return useQuery({
    queryKey: QUERY_KEYS.renewals(contractId),
    queryFn: () => contractApi.getRenewals(contractId),
    enabled: !!contractId,
  });
}
```

---

## Dùng hook trong component

```jsx
// Ví dụ: TenantsPage.jsx
import { useState } from 'react';
import { useTenants } from '../hooks/useTenant.js';

export default function TenantsPage() {
  const [params, setParams] = useState({ page: 1, limit: 20 });
  
  const { data, isLoading, isError, error } = useTenants(params);

  if (isError) return <div>{error.response?.data?.message || 'Lỗi tải dữ liệu'}</div>;

  return (
    <DataTable
      data={data?.items ?? []}
      total={data?.total ?? 0}
      page={params.page}
      isLoading={isLoading}
      onPageChange={(page) => setParams(p => ({ ...p, page }))}
    />
  );
}
```

---

## Checklist trước khi xong 1 hook file

- [ ] `useQuery`: có `enabled: !!id` cho detail hooks (tránh gọi API với id undefined)
- [ ] `useQuery` list: có `placeholderData: (prev) => prev` để tránh flicker khi đổi trang
- [ ] `useMutation`: invalidate đúng query keys sau success
- [ ] Khi 1 mutation ảnh hưởng nhiều resource (contract → apartments), invalidate đủ tất cả
- [ ] Không có try/catch trong hook — lỗi xử lý qua `onError` callback
- [ ] Export named (không default) cho hooks
