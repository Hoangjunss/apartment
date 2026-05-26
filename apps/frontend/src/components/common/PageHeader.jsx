// src/components/common/PageHeader.jsx
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PageHeader({ title, subtitle, backUrl, action }) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        {backUrl && (
          <button
            onClick={() => navigate(backUrl)}
            className="btn-icon"
            title="Quay lại"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}
