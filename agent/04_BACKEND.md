# ⚙️ Sub-Agent 04 — Backend Code Review (Node.js/NestJS/Express)

## Mục đích
Đánh giá code Backend: API design, database patterns, caching, async patterns, và scalability.

---

## 1. API Design

### ❌ Dấu hiệu BAD
```typescript
// Bad: endpoint không RESTful, động từ trong URL
POST /api/getUsers
POST /api/createNewUser
GET  /api/deleteUser?id=123
POST /api/doUserUpdate

// Bad: response format không nhất quán
// Endpoint A trả về:
{ users: [...], total: 100 }

// Endpoint B trả về:
{ data: [...], count: 100, success: true }

// Endpoint C trả về:
[...] // bare array

// Bad: HTTP status code sai
// Lỗi validation trả 200 OK
res.status(200).json({ success: false, error: 'Invalid email' }); // ❌

// Resource không tìm thấy trả 200
res.status(200).json({ user: null }); // ❌
```

### ✅ RESTful & Consistent
```typescript
// Good: RESTful conventions
GET    /api/users              // list
POST   /api/users              // create
GET    /api/users/:id          // get one
PATCH  /api/users/:id          // partial update
DELETE /api/users/:id          // delete
GET    /api/users/:id/orders   // nested resource

// Good: response format nhất quán
interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

interface ApiErrorResponse {
  error: {
    code: string;        // machine-readable: 'VALIDATION_ERROR'
    message: string;     // human-readable
    details?: unknown;   // chi tiết lỗi
    requestId?: string;  // để trace log
  };
}

// Good: HTTP status đúng nghĩa
// 200 OK, 201 Created, 204 No Content
// 400 Bad Request, 401 Unauthorized, 403 Forbidden
// 404 Not Found, 409 Conflict, 422 Unprocessable Entity
// 429 Too Many Requests, 500 Internal Server Error
```

**Câu hỏi review API Design:**
- [ ] URL có dùng danh từ, không dùng động từ không?
- [ ] HTTP method có đúng ngữ nghĩa không (GET cho read, POST cho create, ...)?
- [ ] HTTP status code có đúng không?
- [ ] Response format có nhất quán trong toàn bộ API không?
- [ ] API có versioning không (`/api/v1/`)?

---

## 2. Database Patterns

### ❌ Dấu hiệu BAD
```typescript
// Bad: N+1 query
const orders = await Order.findAll();
for (const order of orders) {
  // ❌ 1 query cho mỗi order = N+1 queries
  order.user = await User.findByPk(order.userId);
  order.items = await OrderItem.findAll({ where: { orderId: order.id } });
}

// Bad: fetch toàn bộ data, filter ở code
const allUsers = await User.findAll(); // ❌ fetch 100k users
const activeUsers = allUsers.filter(u => u.isActive); // filter ở memory

// Bad: không có transaction khi cần
async function transferMoney(fromId: string, toId: string, amount: number) {
  await Account.decrement({ balance: amount }, { where: { id: fromId } });
  // ❌ nếu dòng này fail → from bị trừ tiền nhưng to không được cộng
  await Account.increment({ balance: amount }, { where: { id: toId } });
}

// Bad: SQL injection
const users = await db.query(
  `SELECT * FROM users WHERE email = '${email}'` // ❌ SQL injection!
);
```

### ✅ Database Best Practices
```typescript
// Good: eager loading (include) thay N+1
const orders = await Order.findAll({
  include: [
    { model: User, attributes: ['id', 'name', 'email'] },
    { model: OrderItem, include: [{ model: Product }] },
  ],
  where: { status: 'pending' },
  limit: 50,
  offset: page * 50,
});

// Good: query với pagination + filter ở DB
const activeUsers = await User.findAndCountAll({
  where: { isActive: true }, // filter ở DB, không phải code
  attributes: ['id', 'name', 'email'], // chỉ lấy field cần thiết
  limit: pageSize,
  offset: (page - 1) * pageSize,
  order: [['createdAt', 'DESC']],
});

// Good: transaction đảm bảo atomicity
async function transferMoney(fromId: string, toId: string, amount: number) {
  return sequelize.transaction(async (t) => {
    const from = await Account.findByPk(fromId, {
      lock: t.LOCK.UPDATE, // pessimistic lock
      transaction: t,
    });
    
    if (!from || from.balance < amount) {
      throw new InsufficientFundsError();
    }
    
    await from.decrement({ balance: amount }, { transaction: t });
    await Account.increment({ balance: amount }, { 
      where: { id: toId },
      transaction: t 
    });
  });
}

// Good: parameterized query chống SQL injection
const users = await db.query(
  'SELECT * FROM users WHERE email = $1',
  { bind: [email] } // ✅ parameterized
);
```

**Câu hỏi review Database:**
- [ ] Có N+1 query không? (loop + DB call bên trong)
- [ ] Filter/sort có được làm ở DB (WHERE clause) không, hay fetch hết rồi filter ở code?
- [ ] Các thao tác multi-step có dùng transaction không?
- [ ] Có raw string SQL interpolation (SQL injection risk) không?
- [ ] Query có SELECT * không? (nên chọn fields cụ thể)
- [ ] Có index cho các column hay query không?

---

## 3. Async & Error Handling

### ❌ Dấu hiệu BAD
```typescript
// Bad: bỏ qua error (silent failure)
async function saveUser(data: CreateUserDto) {
  try {
    await userRepo.create(data);
  } catch (error) {
    console.log(error); // ❌ log xong bỏ qua, caller không biết có lỗi
  }
}

// Bad: callback hell / promise chain lẫn lộn
getUserById(id, function(err, user) {
  if (err) { /* handle */ }
  getOrdersByUser(user.id, function(err, orders) { /* ... */ });
});

// Bad: không xử lý unhandled promise rejection
fetchData().then(process); // ❌ thiếu .catch()

// Bad: async trong forEach (không đợi)
await Promise.all(
  items.forEach(async (item) => { // ❌ forEach không await được
    await processItem(item);
  })
);
```

### ✅ Async Best Practices
```typescript
// Good: error phải được xử lý hoặc rethrow
async function saveUser(data: CreateUserDto): Promise<User> {
  try {
    return await userRepo.create(data);
  } catch (error) {
    // Log với context đủ để debug
    logger.error('Failed to create user', {
      error,
      input: { email: data.email }, // không log sensitive data
    });
    // Rethrow hoặc wrap thành domain error
    throw new UserCreationError('Failed to create user', { cause: error });
  }
}

// Good: xử lý concurrent đúng cách
// Parallel (không phụ thuộc nhau)
const [user, orders] = await Promise.all([
  fetchUser(userId),
  fetchOrders(userId),
]);

// Sequential (phụ thuộc nhau)
const user = await fetchUser(userId);
const orders = await fetchOrders(user.id);

// Good: map + Promise.all thay forEach
await Promise.all(
  items.map(async (item) => await processItem(item)) // ✅
);

// Good: giới hạn concurrency để không overload
import pLimit from 'p-limit';
const limit = pLimit(5); // tối đa 5 concurrent
await Promise.all(
  items.map(item => limit(() => processItem(item)))
);
```

**Câu hỏi review Async:**
- [ ] Có empty catch block hoặc chỉ console.log không?
- [ ] Promise có được await/then+catch đầy đủ không?
- [ ] Có dùng async trong forEach không?
- [ ] Các operation độc lập có chạy parallel (Promise.all) không?
- [ ] Concurrency limit khi bulk operation không?

---

## 4. Validation & Input Sanitization

### ❌ Dấu hiệu BAD
```typescript
// Bad: tin tưởng input từ client
@Post('/orders')
async createOrder(@Body() body: any) { // ❌ any, không validate
  await orderService.create({
    userId: body.userId, // client có thể fake userId!
    total: body.total,   // client có thể gửi bất kỳ số nào!
  });
}

// Bad: validate ở nhiều nơi không nhất quán
// Controller validate một kiểu, Service validate kiểu khác
```

### ✅ Validate đúng cách (NestJS)
```typescript
// Good: validate input với class-validator
import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateUserDto {
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  displayName?: string;
}

// Good: lấy userId từ JWT token, không từ body
@Post('/orders')
@UseGuards(JwtAuthGuard)
async createOrder(
  @CurrentUser() user: AuthUser, // từ JWT, không thể fake
  @Body() dto: CreateOrderDto,   // validated + typed
) {
  return this.orderService.create(user.id, dto);
}
```

**Câu hỏi review Validation:**
- [ ] Input từ client có được validate không?
- [ ] User identity có lấy từ JWT/session không, hay từ body (có thể fake)?
- [ ] Có whitelist validation (chỉ accept fields được khai báo) không?
- [ ] Có sanitize input để chống XSS không?

---

## 5. Logging & Observability

### ❌ Dấu hiệu BAD
```typescript
// Bad: console.log trong production code
console.log('user:', user); // ❌ leak sensitive data, không có log level
console.log('error:', error);

// Bad: log thiếu context
logger.error('Error occurred'); // ❌ quá chung chung, không debug được

// Bad: log sensitive data
logger.info('User logged in', { 
  user: { ...user, password: user.hashedPassword } // ❌
});
```

### ✅ Logging tốt
```typescript
// Good: structured logging với context
logger.error('Failed to process payment', {
  orderId: order.id,
  userId: order.userId,
  amount: order.total,
  paymentMethod: order.paymentMethod,
  error: {
    message: error.message,
    code: error.code,
    stack: error.stack,
  },
  requestId: ctx.requestId, // để trace distributed system
});

// Good: log levels phù hợp
logger.debug('Cache miss, fetching from DB', { key: cacheKey });
logger.info('User registered', { userId: user.id });
logger.warn('Rate limit approaching', { userId, requestCount });
logger.error('Payment failed', { orderId, error });

// Good: KHÔNG log sensitive data
logger.info('User authenticated', {
  userId: user.id,
  email: user.email,
  // Không log: password, token, card number, SSN
});
```

**Câu hỏi review Logging:**
- [ ] Dùng `console.log` trong production code không?
- [ ] Log có đủ context để debug không?
- [ ] Log có leak sensitive data (password, token, PII) không?
- [ ] Log level có phù hợp không?
- [ ] Có request ID để trace trong distributed system không?
