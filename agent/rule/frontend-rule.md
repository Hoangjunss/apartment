# Rule: frontend-rule

> Áp dụng cho **mọi file Frontend** trong dự án QLCHDC.  
> Đọc file này trước khi viết bất kỳ component, hook, hay service nào.

---

## Cấu trúc bắt buộc mỗi module frontend

```
modules/<tên-module>/frontend/
├── pages/              ← Trang đầy đủ, là target của Route
│   └── XxxPage.jsx
├── components/         ← Component riêng của module (không dùng ngoài module này)
│   └── XxxCard.jsx
├── hooks/              ← Custom hooks (useQuery/useMutation wrappers)
│   └── useXxx.js
├── services/           ← Hàm gọi API thuần (không chứa hook)
│   └── xxx.api.js
└── package.json
```

---

## Quy ước đặt tên

| Loại | Convention | Ví dụ |
|------|------------|-------|
| Component file | PascalCase + `.jsx` | `TenantCard.jsx`, `ContractFormPage.jsx` |
| Hook file | camelCase bắt đầu `use` | `useTenants.js`, `useCreateContract.js` |
| Service file | camelCase + `.api.js` | `tenant.api.js`, `building.api.js` |
| CSS class | Tailwind utility (không viết CSS file riêng) | — |
| Biến/hàm | camelCase | `tenantList`, `handleSubmit` |
| Constant | UPPER_SNAKE_CASE | `APARTMENT_STATUS`, `DEFAULT_PAGE_SIZE` |

---

## Template: Page Component

```jsx
// modules/<module>/frontend/pages/ExamplePage.jsx

import { useState } from 'react';
import { useExampleList } from '../hooks/useExample.js';
import { PageHeader } from '@/components/common/PageHeader.jsx';
import { DataTable } from '@/components/common/DataTable.jsx';
import { ExampleForm } from '../components/ExampleForm.jsx';

export default function ExamplePage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data, isLoading, isError } = useExampleList({ search, page });

  if (isError) {
    return <div className="text-red-500">Không thể tải dữ liệu</div>;
  }

  return (
    <div>
      <PageHeader
        title="Tiêu đề trang"
        action={<button onClick={() => setIsFormOpen(true)}>+ Thêm mới</button>}
      />

      <DataTable
        data={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        onPageChange={setPage}
        isLoading={isLoading}
        columns={columns}
      />

      {isFormOpen && (
        <ExampleForm onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
}
```

---

## Template: Detail Page (có Tabs)

```jsx
export default function ExampleDetailPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('info');

  const { data: item, isLoading } = useExampleById(+id);

  if (isLoading) return <LoadingSpinner />;
  if (!item) return <EmptyState message="Không tìm thấy" />;

  return (
    <div>
      <PageHeader title={item.name} backUrl="/examples" />

      {/* Info section */}
      <InfoCard data={item} />

      {/* Tabs */}
      <TabGroup activeTab={activeTab} onChange={setActiveTab} tabs={[
        { key: 'tab1', label: 'Tab 1' },
        { key: 'tab2', label: 'Tab 2' },
      ]} />

      {activeTab === 'tab1' && <Tab1Content itemId={+id} />}
      {activeTab === 'tab2' && <Tab2Content itemId={+id} />}
    </div>
  );
}
```

---

## Template: Form Component (Modal)

```jsx
// modules/<module>/frontend/components/ExampleForm.jsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateExample } from '../hooks/useExample.js';

const schema = z.object({
  name: z.string().min(1, 'Tên không được để trống'),
  code: z.string().min(1, 'Mã không được để trống'),
});

export function ExampleForm({ onClose, defaultValues }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const { mutate: create, isPending } = useCreateExample({
    onSuccess: () => {
      toast.success('Tạo thành công');
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <Modal title="Thêm mới" onClose={onClose}>
      <form onSubmit={handleSubmit(create)}>
        <FormField label="Tên" error={errors.name?.message}>
          <input {...register('name')} />
        </FormField>

        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onClose}>Hủy</button>
          <button type="submit" disabled={isPending}>
            {isPending ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

---

## Quy tắc bắt buộc

### 1. Không dùng class component
```jsx
// ❌ Sai
class MyComponent extends React.Component { render() {...} }

// ✅ Đúng
function MyComponent() { return <div>...</div>; }
export default function MyComponent() { ... }
```

### 2. Không gọi API trực tiếp bằng fetch — luôn dùng axios instance
```jsx
// ❌ Sai
const res = await fetch('/api/tenant/tenants');

// ✅ Đúng
import { api } from '@/lib/axios.js';
const res = await api.get('/tenant/tenants');
```

### 3. Không hardcode string role — dùng constant
```jsx
// ❌ Sai
if (user.role === 'ADMIN') { ... }

// ✅ Đúng
import { ROLES } from '@/constants/roles.js';
if (user.role === ROLES.ADMIN) { ... }
```

### 4. Luôn xử lý loading và error state
```jsx
// Mỗi trang/section dùng useQuery phải có:
if (isLoading) return <LoadingSpinner />;
if (isError) return <div className="text-red-500">{error.message}</div>;
if (!data) return <EmptyState />;
```

### 5. Toast thông báo bằng tiếng Việt
```jsx
// ✅ Đúng — dùng message từ API trực tiếp
onError: (err) => toast.error(err.message)
onSuccess: () => toast.success('Tạo thành công')
```

### 6. Không truyền function vô danh xuống prop gây re-render
```jsx
// ❌ Sai
<DataTable onPageChange={(p) => setPage(p)} />

// ✅ Đúng
const handlePageChange = useCallback((p) => setPage(p), []);
<DataTable onPageChange={handlePageChange} />
```

### 7. Import alias — dùng `@/` cho apps/frontend/src
```jsx
import { AppLayout } from '@/components/layout/AppLayout.jsx';
import { api } from '@/lib/axios.js';
import { AuthContext } from '@/contexts/AuthContext.jsx';
```

---

## Cấu trúc apps/frontend/src (bắt buộc tạo đúng)

```
src/
├── main.jsx
├── App.jsx
├── constants/
│   ├── roles.js        ← export const ROLES = { ADMIN: 'ADMIN', ... }
│   └── status.js       ← APARTMENT_STATUS, CONTRACT_STATUS labels + colors
├── lib/
│   ├── axios.js        ← Axios singleton instance + interceptors
│   └── queryClient.js  ← new QueryClient({ defaultOptions: ... })
├── contexts/
│   └── AuthContext.jsx ← createContext, Provider, useAuth hook
├── components/
│   ├── layout/         ← AppLayout, Sidebar, Navbar
│   └── common/         ← Shared UI components
└── (không chứa domain logic — domain logic đặt trong modules/)
```

---

## Xử lý Date

```jsx
// Date từ API về là ISO string — parse trước khi hiển thị
import { format, parseISO, differenceInDays } from 'date-fns';
import { vi } from 'date-fns/locale';

// Hiển thị ngày tháng
const displayDate = format(parseISO(contract.end_date), 'dd/MM/yyyy');

// Tính số ngày còn lại
const daysLeft = differenceInDays(parseISO(contract.end_date), new Date());

// Input date → ISO string gửi API
const isoDate = new Date(inputValue).toISOString().split('T')[0]; // YYYY-MM-DD
```

---

## Xử lý số tiền (Decimal từ Prisma)

```jsx
// Prisma Decimal serialized thành string khi qua JSON
// Luôn parse trước khi tính toán và format

const formatCurrency = (value) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(Number(value));
};

// Ví dụ: "9000000" → "9.000.000 ₫"
```

---

## Checklist trước khi xong một trang

- [ ] Page có loading + error + empty state
- [ ] Form có validation (React Hook Form + Zod)
- [ ] Action buttons ẩn đúng theo role (dùng RoleGuard)
- [ ] Sau mutation → invalidate query cache → UI tự cập nhật
- [ ] Toast thông báo cho mọi success/error
- [ ] Link/navigate đúng path đã định nghĩa trong DESIGN.md
- [ ] Responsive cơ bản (min-width: 1024px là đủ vì internal tool)
