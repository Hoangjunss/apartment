// src/components/layout/Navbar.jsx
import { LogOut, User, ChevronDown, Search } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { ROLE_LABELS } from '@/constants/roles.js';
import { NotificationBell } from './NotificationBell.jsx';
import { useGlobalSearch } from 'modules/search/frontend/hooks/useSearch.js';
import { SearchDropdown } from 'modules/search/frontend/components/SearchDropdown.jsx';
import { useActiveBuilding } from '@/contexts/BuildingContext.jsx';

export function Navbar() {
  const { user, logout } = useAuth();
  const { buildings, selectedBuildingId, setSelectedBuildingId } = useActiveBuilding();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const { data: searchResults, isLoading: isSearching } = useGlobalSearch(debouncedQuery);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
      {/* Left: Global Search Input */}
      <div ref={searchRef} className="relative w-64 md:w-80 no-print">
        <div className="relative">
          <input
            type="text"
            placeholder="Tìm kiếm khách thuê, phòng, hóa đơn..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowSearchDropdown(true);
            }}
            onFocus={() => setShowSearchDropdown(true)}
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs outline-none transition-colors"
            id="global-search-input"
          />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        {showSearchDropdown && searchQuery.trim().length > 0 && (
          <SearchDropdown
            results={searchResults}
            isLoading={isSearching}
            query={searchQuery}
            onClose={() => {
              setShowSearchDropdown(false);
              setSearchQuery('');
            }}
          />
        )}
      </div>

      {/* Right: notification bell + user menu */}
      <div className="flex items-center gap-3">
        {/* Global Building Selector */}
        {buildings.length > 0 && (
          <div className="flex items-center gap-1.5 no-print">
            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl text-xs px-2.5 py-1.5 outline-none transition-colors font-medium text-gray-700"
              id="global-building-selector"
            >
              <option value="all">Tất cả tòa nhà</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  [{b.code}] {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <NotificationBell />

        {/* User menu dropdown */}
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
      </div>
    </header>
  );
}
