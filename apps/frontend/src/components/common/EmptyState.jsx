// src/components/common/EmptyState.jsx
import { Inbox } from 'lucide-react';

export function EmptyState({ message = 'Không có dữ liệu', icon: Icon = Inbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Icon size={24} className="text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
