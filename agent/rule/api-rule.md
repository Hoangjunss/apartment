# Rule: api-rule

> Quy tắc gọi API từ Frontend QLCHDC.  
> Áp dụng cho mọi file `*.api.js` và mọi nơi dùng `axios`.

---

## Axios Instance — Setup bắt buộc

```js
// src/lib/axios.js
import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor: Gắn accessToken vào mọi request ───────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: Tự động refresh token khi 401 ────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu 401 và chưa retry và không phải từ /auth/refresh hoặc /auth/login
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/refresh') &&
      !originalRequest.url.includes('/auth/login')
    ) {
      if (isRefreshing) {
        // Đang refresh → xếp hàng chờ
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        // Không có refresh token → logout
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      try {
        const res = await api.post('/auth/refresh', { refreshToken });
        const { accessToken } = res.data.data;

        localStorage.setItem('accessToken', accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
```

---

## Cấu trúc Service File

```js
// modules/<module>/frontend/services/<module>.api.js

import { api } from '@/lib/axios.js';

// ─── Quy tắc ────────────────────────────────────────────────────────────────
// 1. Mỗi hàm tương ứng 1 API endpoint
// 2. Hàm trả về res.data.data (đã unwrap từ { success, data })
// 3. Không xử lý error ở đây — để hook/component xử lý
// 4. Params query đặt trong object, axios tự serialize

export const getTenants = async ({ page = 1, limit = 20, search, status }) => {
  const res = await api.get('/tenant/tenants', {
    params: { page, limit, search, status },
  });
  return res.data.data; // { items, total, page, limit }
};

export const getTenantById = async (id) => {
  const res = await api.get(`/tenant/tenants/${id}`);
  return res.data.data;
};

export const createTenant = async (data) => {
  const res = await api.post('/tenant/tenants', data);
  return res.data.data;
};

export const updateTenant = async (id, data) => {
  const res = await api.put(`/tenant/tenants/${id}`, data);
  return res.data.data;
};
```

---

## Template: Service Files per Module

### auth.api.js
```js
import { api } from '@/lib/axios.js';

export const login = async (email, password) => {
  const res = await api.post('/auth/login', { email, password });
  return res.data.data; // { accessToken, refreshToken, user }
};

export const getMe = async () => {
  const res = await api.get('/auth/me');
  return res.data.data;
};

export const changePassword = async (oldPassword, newPassword) => {
  const res = await api.put('/auth/change-password', { oldPassword, newPassword });
  return res.data;
};

export const getUsers = async ({ page, limit, search }) => {
  const res = await api.get('/auth/users', { params: { page, limit, search } });
  return res.data.data;
};

export const createUser = async (data) => {
  const res = await api.post('/auth/users', data);
  return res.data.data;
};

export const updateUser = async (id, data) => {
  const res = await api.put(`/auth/users/${id}`, data);
  return res.data.data;
};

export const toggleUserActive = async (id) => {
  const res = await api.patch(`/auth/users/${id}/toggle-active`);
  return res.data.data;
};
```

### building.api.js
```js
import { api } from '@/lib/axios.js';

// Buildings
export const getBuildings = async (params) => {
  const res = await api.get('/building/buildings', { params });
  return res.data.data;
};
export const getBuildingById = async (id) => {
  const res = await api.get(`/building/buildings/${id}`);
  return res.data.data;
};
export const createBuilding = async (data) => {
  const res = await api.post('/building/buildings', data);
  return res.data.data;
};
export const updateBuilding = async (id, data) => {
  const res = await api.put(`/building/buildings/${id}`, data);
  return res.data.data;
};

// Floors
export const getFloorsByBuilding = async (buildingId) => {
  const res = await api.get(`/building/buildings/${buildingId}/floors`);
  return res.data.data;
};
export const bulkCreateFloors = async (buildingId, data) => {
  const res = await api.post(`/building/buildings/${buildingId}/floors`, data);
  return res.data;
};

// Apartments
export const getApartments = async (params) => {
  const res = await api.get('/building/apartments', { params });
  return res.data.data;
};
export const getApartmentById = async (id) => {
  const res = await api.get(`/building/apartments/${id}`);
  return res.data.data;
};
export const createApartment = async (data) => {
  const res = await api.post('/building/apartments', data);
  return res.data.data;
};
export const updateApartment = async (id, data) => {
  const res = await api.put(`/building/apartments/${id}`, data);
  return res.data.data;
};
export const updateApartmentStatus = async (id, new_status, reason) => {
  const res = await api.patch(`/building/apartments/${id}/status`, { new_status, reason });
  return res.data.data;
};
export const getApartmentStatusLogs = async (id) => {
  const res = await api.get(`/building/apartments/${id}/status-logs`);
  return res.data.data;
};

// Furniture
export const getFurniture = async (apartmentId) => {
  const res = await api.get(`/building/apartments/${apartmentId}/furniture`);
  return res.data.data;
};
export const addFurniture = async (apartmentId, data) => {
  const res = await api.post(`/building/apartments/${apartmentId}/furniture`, data);
  return res.data.data;
};
export const updateFurniture = async (id, data) => {
  const res = await api.put(`/building/furniture/${id}`, data);
  return res.data.data;
};
export const deleteFurniture = async (id) => {
  const res = await api.delete(`/building/furniture/${id}`);
  return res.data;
};
```

### tenant.api.js
```js
import { api } from '@/lib/axios.js';

export const getTenants = async (params) => {
  const res = await api.get('/tenant/tenants', { params });
  return res.data.data;
};
export const getTenantById = async (id) => {
  const res = await api.get(`/tenant/tenants/${id}`);
  return res.data.data;
};
export const getTenantHistory = async (id) => {
  const res = await api.get(`/tenant/tenants/${id}/history`);
  return res.data.data;
};
export const createTenant = async (data) => {
  const res = await api.post('/tenant/tenants', data);
  return res.data.data;
};
export const updateTenant = async (id, data) => {
  const res = await api.put(`/tenant/tenants/${id}`, data);
  return res.data.data;
};
export const getRegistrationsByTenant = async (tenantId) => {
  const res = await api.get(`/tenant/tenants/${tenantId}/registrations`);
  return res.data.data;
};
export const createRegistration = async (tenantId, data) => {
  const res = await api.post(`/tenant/tenants/${tenantId}/registrations`, data);
  return res.data.data;
};
export const getAllRegistrations = async (params) => {
  const res = await api.get('/tenant/registrations', { params });
  return res.data.data;
};
```

### contract.api.js
```js
import { api } from '@/lib/axios.js';

export const getContracts = async (params) => {
  const res = await api.get('/contract', { params });
  return res.data.data;
};
export const getContractById = async (id) => {
  const res = await api.get(`/contract/${id}`);
  return res.data.data;
};
export const getExpiringSoon = async () => {
  const res = await api.get('/contract/expiring-soon');
  return res.data.data;
};
export const createContract = async (data) => {
  const res = await api.post('/contract', data);
  return res.data.data;
};
export const updateContract = async (id, data) => {
  const res = await api.put(`/contract/${id}`, data);
  return res.data.data;
};
export const terminateContract = async (id, termination_reason) => {
  const res = await api.patch(`/contract/${id}/terminate`, { termination_reason });
  return res.data.data;
};
export const renewContract = async (id, data) => {
  const res = await api.post(`/contract/${id}/renew`, data);
  return res.data.data;
};
export const getRenewals = async (contractId) => {
  const res = await api.get(`/contract/${contractId}/renewals`);
  return res.data.data;
};
```

---

## Xử lý Error từ API

```js
// API trả về error dạng:
// { success: false, message: "Sai thông tin đăng nhập" }

// Axios throw error khi status >= 4xx
// error.response.data.message chứa message tiếng Việt từ backend

// Trong hook/component:
const handleApiError = (err) => {
  const message = err.response?.data?.message || 'Đã có lỗi xảy ra';
  toast.error(message);
};

// Trong useMutation:
const mutation = useMutation({
  mutationFn: createTenant,
  onError: (err) => {
    toast.error(err.response?.data?.message || 'Tạo hồ sơ thất bại');
  },
});
```

---

## TanStack Query — Config

```js
// src/lib/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 2,   // 2 phút — data được coi là "fresh"
      gcTime: 1000 * 60 * 10,     // 10 phút — giữ trong cache
      refetchOnWindowFocus: false, // Internal tool, không cần refetch khi focus
    },
    mutations: {
      retry: 0,
    },
  },
});
```

---

## Query Keys Convention

```js
// Dùng array để tạo hierarchical query keys
// Giúp invalidate đúng target sau mutation

export const QUERY_KEYS = {
  // Buildings
  buildings: ['buildings'],
  building: (id) => ['buildings', id],
  buildingFloors: (id) => ['buildings', id, 'floors'],

  // Apartments
  apartments: (params) => ['apartments', params],
  apartment: (id) => ['apartments', id],
  apartmentStatusLogs: (id) => ['apartments', id, 'status-logs'],
  furniture: (apartmentId) => ['apartments', apartmentId, 'furniture'],

  // Tenants
  tenants: (params) => ['tenants', params],
  tenant: (id) => ['tenants', id],
  tenantHistory: (id) => ['tenants', id, 'history'],
  registrations: (tenantId) => ['tenants', tenantId, 'registrations'],
  allRegistrations: (params) => ['registrations', params],

  // Contracts
  contracts: (params) => ['contracts', params],
  contract: (id) => ['contracts', id],
  renewals: (contractId) => ['contracts', contractId, 'renewals'],
  expiringSoon: ['contracts', 'expiring-soon'],

  // Auth
  me: ['auth', 'me'],
  users: (params) => ['users', params],
};

// Sau khi tạo tenant → invalidate list
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenants({}) });
// Sau khi update 1 tenant → invalidate detail đó
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tenant(id) });
```

---

## Env Variables

```env
# apps/frontend/.env
VITE_API_URL=http://localhost:3001/api

# apps/frontend/.env.production
VITE_API_URL=https://api.your-domain.com/api
```

---

## Checklist trước khi xong 1 service file

- [ ] Tất cả hàm dùng `api` instance (không dùng `fetch` hay `axios` trực tiếp)
- [ ] Mỗi hàm unwrap `res.data.data` trước khi return
- [ ] Params query truyền qua `{ params: ... }` (axios tự encode)
- [ ] Không có try/catch trong service — lỗi để bubble lên hook/component
- [ ] Tên hàm rõ nghĩa: `getXxx`, `createXxx`, `updateXxx`, `deleteXxx`
