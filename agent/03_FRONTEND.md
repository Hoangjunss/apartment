# 🎨 Sub-Agent 03 — Frontend Code Review (React/Vue/Next.js)

## Mục đích
Đánh giá code Frontend theo các tiêu chí chuyên biệt: component design, state management, rendering performance, accessibility, và UX concerns.

---

## 1. Component Design

### ❌ Dấu hiệu BAD
```tsx
// Bad: God Component — làm quá nhiều thứ
function UserDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});

  // 300+ dòng JSX với logic lẫn lộn
  return (
    <div>
      {/* search, filter, table, pagination, modal, form... tất cả trong 1 */}
    </div>
  );
}

// Bad: prop drilling quá sâu
<Grandparent user={user} onUserUpdate={handleUpdate} theme={theme}>
  <Parent user={user} onUserUpdate={handleUpdate} theme={theme}>
    <Child user={user} onUserUpdate={handleUpdate} theme={theme}>
      <GrandChild user={user} onUserUpdate={handleUpdate} theme={theme} />
    </Child>
  </Parent>
</Grandparent>
```

### ✅ Dấu hiệu GOOD
```tsx
// Good: tách component theo trách nhiệm
function UserDashboard() {
  return (
    <UserDashboardProvider>
      <UserSearchBar />
      <UserFilterPanel />
      <UserTable />
      <UserPagination />
      <UserDetailModal />
    </UserDashboardProvider>
  );
}

// Good: custom hook tách logic
function useUserList() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchUsers = useCallback(async (filters: UserFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await userApi.getUsers(filters);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  return { users, loading, error, fetchUsers };
}
```

**Câu hỏi review Component Design:**
- [ ] Component có hơn 150-200 dòng không?
- [ ] Component có hơn 5-6 state riêng lẻ không? (cân nhắc useReducer/Zustand)
- [ ] Có prop drilling quá 2-3 cấp không?
- [ ] Logic có được tách ra custom hook không?
- [ ] Component có làm quá nhiều việc (fetch data + render + handle form)?

---

## 2. React Hooks — Sai lầm phổ biến

### ❌ Vi phạm Rules of Hooks & Optimization

```tsx
// Bad: dependency array sai → stale closure / infinite loop
useEffect(() => {
  fetchUser(userId);
}, []); // ❌ thiếu userId trong deps

// Bad: tạo object/function mới mỗi render → child re-render vô hạn
function Parent() {
  const config = { pageSize: 10, sortBy: 'name' }; // ❌ tạo mới mỗi render
  const handleClick = () => doSomething(); // ❌ tạo mới mỗi render

  return <ExpensiveChild config={config} onClick={handleClick} />;
}

// Bad: useEffect làm quá nhiều
useEffect(() => {
  fetchUser();
  fetchOrders();
  trackPageView();
  document.title = 'Dashboard';
  // 4 concerns trong 1 effect → khó debug
}, [userId]);

// Bad: state không cần thiết (computed value)
const [fullName, setFullName] = useState(''); // ❌ có thể compute từ firstName + lastName

useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);
```

### ✅ Đúng cách
```tsx
// Good: dependency array đúng
useEffect(() => {
  fetchUser(userId);
}, [userId]); // đầy đủ deps

// Good: memo hoá đúng chỗ
function Parent() {
  const config = useMemo(() => ({ pageSize: 10, sortBy: 'name' }), []);
  const handleClick = useCallback(() => doSomething(), []);

  return <ExpensiveChild config={config} onClick={handleClick} />;
}

// Good: tách useEffect theo concern
useEffect(() => { fetchUser(); }, [userId]);
useEffect(() => { fetchOrders(); }, [userId]);
useEffect(() => { trackPageView('dashboard'); }, []);
useEffect(() => { document.title = 'Dashboard'; }, []);

// Good: compute trực tiếp thay vì state + effect
const fullName = `${firstName} ${lastName}`; // ✅ simple, no extra render
```

**Câu hỏi review Hooks:**
- [ ] useEffect dependency array có đầy đủ và chính xác không? (dùng eslint-plugin-react-hooks)
- [ ] Có tạo object/array/function trực tiếp trong render mà pass vào memo component không?
- [ ] Có state nào thực ra là computed value không cần state không?
- [ ] Có cleanup function cho subscriptions, timers, event listeners không?

---

## 3. Performance — React Rendering

### ❌ Dấu hiệu BAD
```tsx
// Bad: render list không có key (hoặc dùng index làm key với dynamic list)
users.map((user) => <UserRow user={user} />) // ❌ thiếu key

users.map((user, index) => (
  <UserRow key={index} user={user} /> // ❌ key là index → bug khi xoá/reorder
))

// Bad: inline style object → re-render mỗi lần
<div style={{ color: 'red', marginTop: 16 }}> // ❌

// Bad: không memo hoá component tốn kém
function ProductList({ products, filters }) {
  // render 1000 items, tốn kém nhưng không memo
  return products.map(p => <ProductCard key={p.id} product={p} />);
}

// Bad: fetch trong render (waterfall)
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  useEffect(() => { fetchUser(userId).then(setUser); }, [userId]);
  // Sau khi có user mới fetch orders → waterfall!
  useEffect(() => {
    if (user) fetchOrders(user.id).then(setOrders);
  }, [user]);
}
```

### ✅ Tối ưu performance
```tsx
// Good: key ổn định, có nghĩa
users.map((user) => <UserRow key={user.id} user={user} />)

// Good: CSS class thay inline style
<div className="error-text">

// Good: React.memo + useMemo cho list tốn kém
const ProductList = React.memo(function ProductList({ products, onAddToCart }) {
  return products.map(p => (
    <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />
  ));
});

// Good: parallel fetch (Next.js / React Query)
function UserProfile({ userId }) {
  // Fetch parallel thay vì waterfall
  const [user, orders] = await Promise.all([
    fetchUser(userId),
    fetchOrders(userId), // không cần đợi user
  ]);
}
```

**Câu hỏi review Performance:**
- [ ] List có `key` hợp lệ (không dùng index với dynamic list) không?
- [ ] Có `React.memo`, `useMemo`, `useCallback` ở đúng chỗ không?
- [ ] Có lazy load cho route/component nặng không?
- [ ] Có N+1 fetch (fetch trong loop) không?
- [ ] Image có được optimize (next/image, lazy loading, correct format) không?

---

## 4. State Management

### ❌ Dấu hiệu BAD
```tsx
// Bad: server state nhét vào Redux/Zustand
const userSlice = createSlice({
  name: 'users',
  initialState: { list: [], loading: false, error: null },
  reducers: {
    setUsers: (state, action) => { state.list = action.payload; },
    setLoading: (state, action) => { state.loading = action.payload; },
    // Đây là server cache, không phải client state!
  }
});

// Bad: UI state global không cần thiết
// isModalOpen, activeTab, searchQuery → chỉ cần local state
const isCheckoutModalOpen = useSelector(state => state.ui.isCheckoutModalOpen);
```

### ✅ Đúng cách
```tsx
// Good: server state → React Query / SWR
const { data: users, isLoading, error } = useQuery({
  queryKey: ['users', filters],
  queryFn: () => userApi.getUsers(filters),
  staleTime: 5 * 60 * 1000, // cache 5 phút
});

// Good: phân loại state đúng
// Local UI state → useState (isOpen, inputValue)
// Shared UI state → Zustand/Context (theme, sidebar)
// Server/async state → React Query/SWR
// Form state → React Hook Form
```

**Câu hỏi review State Management:**
- [ ] Server state có dùng React Query/SWR không, hay tự quản lý loading/error/data?
- [ ] Global state có những thứ chỉ cần local state không?
- [ ] Form state có dùng React Hook Form / Formik không?
- [ ] Có cache/stale time hợp lý cho API calls không?

---

## 5. Accessibility (a11y)

### ❌ Dấu hiệu BAD
```tsx
// Bad: div làm button → không keyboard accessible
<div onClick={handleSubmit}>Submit</div> // ❌

// Bad: thiếu alt text
<img src={product.image} /> // ❌

// Bad: form không có label
<input type="text" placeholder="Email" /> // ❌

// Bad: modal không trap focus, không có aria attributes
<div className="modal">...</div> // ❌

// Bad: màu không đủ contrast
<p style={{ color: '#aaa', background: '#fff' }}>Important info</p> // ❌
```

### ✅ Accessible code
```tsx
// Good: semantic HTML
<button type="button" onClick={handleSubmit}>Submit</button>

// Good: aria khi cần thiết
<button
  aria-label="Xoá sản phẩm iPhone 15"
  aria-busy={isDeleting}
  onClick={handleDelete}
>
  <TrashIcon aria-hidden="true" />
</button>

// Good: label liên kết với input
<label htmlFor="email">Email</label>
<input id="email" type="email" aria-required="true" />

// Good: ảnh có alt text mô tả
<img src={product.image} alt={`Ảnh sản phẩm ${product.name}`} />

// Good: ảnh decorative có alt rỗng
<img src={divider.png} alt="" role="presentation" />
```

**Câu hỏi review a11y:**
- [ ] Có dùng `div/span` làm button/link không?
- [ ] Input có label không?
- [ ] Image có alt text không?
- [ ] Component interactive có thể dùng bằng keyboard không?
- [ ] Màu text có đủ contrast ratio (4.5:1 cho text thường, 3:1 cho text lớn) không?

---

## 6. Type Safety (TypeScript)

### ❌ Dấu hiệu BAD
```tsx
// Bad: any làm mất hết lợi ích TypeScript
function processApiResponse(data: any) { // ❌
  return data.user.profile.name;
}

// Bad: type assertion không an toàn
const user = response as User; // ❌ không kiểm tra runtime

// Bad: optional chaining bừa bãi để "tắt" lỗi TypeScript
const name = user?.profile?.address?.city?.name; // có thể là bug logic
```

### ✅ Type safe
```tsx
// Good: Zod validation cho external data
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  profile: z.object({
    name: z.string(),
    avatarUrl: z.string().url().optional(),
  }),
});

type User = z.infer<typeof UserSchema>;

async function fetchUser(id: string): Promise<User> {
  const response = await api.get(`/users/${id}`);
  return UserSchema.parse(response.data); // validate + type
}

// Good: type guard thay vì assertion
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error
  );
}
```

**Câu hỏi review TypeScript:**
- [ ] Có dùng `any` không có lý do không?
- [ ] External data (API response, form input) có được validate runtime không?
- [ ] Props của component có được type đầy đủ không?
- [ ] Có dùng `unknown` thay `any` cho external data không?
