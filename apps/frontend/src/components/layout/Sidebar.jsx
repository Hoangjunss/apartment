// src/components/layout/Sidebar.jsx
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  FileText,
  UserCog,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext.jsx';
import {
  ALL_ROLES,
  MANAGEMENT_ROLES,
  TENANT_ACCESS_ROLES,
  CONTRACT_VIEW_ROLES,
  ROLES,
} from '@/constants/roles.js';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    to: '/buildings',
    label: 'Tòa nhà',
    icon: Building2,
    roles: ALL_ROLES,
  },
  {
    to: '/apartments',
    label: 'Căn hộ',
    icon: Home,
    roles: ALL_ROLES,
  },
  {
    to: '/tenants',
    label: 'Khách thuê',
    icon: Users,
    roles: TENANT_ACCESS_ROLES,
  },
  {
    to: '/contracts',
    label: 'Hợp đồng',
    icon: FileText,
    roles: CONTRACT_VIEW_ROLES,
  },
  {
    to: '/users',
    label: 'Nhân viên',
    icon: UserCog,
    roles: [ROLES.ADMIN],
  },
];

export function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-60 bg-white border-r border-gray-200 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">QLCHDC</p>
            <p className="text-[10px] text-gray-500 leading-tight">Quản lý Căn hộ Dịch vụ</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.filter((item) => item.roles.includes(user?.role)).map(
          ({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              {label}
            </NavLink>
          ),
        )}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200">
        <p className="text-xs text-gray-400 text-center">v1.0.0</p>
      </div>
    </aside>
  );
}
