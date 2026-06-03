import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';
import cors from 'cors';
import authRouter from '@my/auth-backend';
import buildingRouter from '@my/building-backend';
import tenantRouter from '@my/tenant-backend';
import contractRouter from '@my/contract-backend';
import financeRouter from '@my/finance-backend';
import serviceRequestRouter from '@my/service-requests-backend';
import publicRouter from '@my/public-backend';
import dashboardRouter from '../../modules/finance/backend/dashboard.router.js';
import auditLogRouter from '@my/audit-log-backend';
import notificationsRouter, { setIo } from '@my/notifications-backend';
import commentsRouter from '@my/comments-backend';
import attachmentsRouter from '@my/attachments-backend';
import searchRouter from '@my/search-backend';
import reportRouter from '@my/report-backend';
import expenseRouter from '@my/expense-backend';
import '@my/contract-backend/cron.js';

const app = express();
const httpServer = createServer(app);
const port = process.env.PORT || 3001;

// ─── Socket.io Setup ────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Truyền io instance vào notifications service để emit real-time
setIo(io);

io.on('connection', (socket) => {
  // Client gửi userId để join room cá nhân
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  socket.on('disconnect', () => {
    // Rooms tự cleanup
  });
});

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.use('/api/public', publicRouter);
app.use('/api/auth', authRouter);
app.use('/api/building', buildingRouter);
app.use('/api/tenant', tenantRouter);
app.use('/api/contract', contractRouter);
app.use('/api/finance', financeRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/service-requests', serviceRequestRouter);
app.use('/api/audit-logs', auditLogRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/search', searchRouter);
app.use('/api/report', reportRouter);
app.use('/api/expense', expenseRouter);

// ─── Start ───────────────────────────────────────────────────────────────────
httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Socket.io ready on ws://localhost:${port}`);
});
