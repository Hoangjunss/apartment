// src/components/layout/Navbar.jsx
import { LogOut, User, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { ROLE_LABELS } from '@/constants/roles.js';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      {/* Left: breadcrumb placeholder */}
      <div />

      {/* Right: user menu */}
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm"
          id="user-menu-btn"
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-gray-800 leading-tight">
              {user?.full_name}
            </p>
            <p className="text-xs text-gray-500 leading-tight">
              {ROLE_LABELS[user?.role] ?? user?.role}
            </p>
          </div>
          <ChevronDown size={14} className="text-gray-400" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
            <button
              onClick={() => { setOpen(false); navigate('/profile'); }}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
              id="profile-menu-item"
            >
              <User size={16} className="text-gray-400" />
              Đổi mật khẩu
            </button>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
              id="logout-menu-item"
            >
              <LogOut size={16} />
              Đăng xuất
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
