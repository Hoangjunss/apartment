// src/contexts/NotificationContext.jsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { api } from '@/lib/axios.js';
import { useAuth } from './AuthContext.jsx';

const NotificationContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function NotificationProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);

  // Fetch initial unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications/count');
      setUnreadCount(res.data.data.count);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  // Fetch recent notifications (for dropdown)
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get('/notifications', { params: { limit: 10 } });
      setNotifications(res.data.data.items || []);
    } catch {
      // ignore
    }
  }, [isAuthenticated]);

  // Mark one as read
  const markAsRead = useCallback(async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  }, []);

  // Setup WebSocket
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    fetchUnreadCount();
    fetchNotifications();

    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      // Join user's personal room
      newSocket.emit('join', user.id);
    });

    // Real-time notification received
    newSocket.on('notification', (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 10));
      setUnreadCount((prev) => prev + 1);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        markAsRead,
        markAllAsRead,
        fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications phải được dùng trong NotificationProvider');
  return ctx;
}
