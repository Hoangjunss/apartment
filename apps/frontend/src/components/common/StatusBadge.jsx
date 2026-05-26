// src/components/common/StatusBadge.jsx
import { APARTMENT_STATUS_CONFIG, CONTRACT_STATUS_CONFIG, INVOICE_STATUS_CONFIG } from '@/constants/status.js';

export function ApartmentStatusBadge({ status }) {
  const config = APARTMENT_STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  );
}

export function ContractStatusBadge({ status, daysLeft }) {
  const config = CONTRACT_STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`badge ${config.className}`}>
      {config.label}
      {status === 'EXPIRING_SOON' && daysLeft != null && (
        <span className="ml-1">({daysLeft} ngày)</span>
      )}
    </span>
  );
}

export function InvoiceStatusBadge({ status }) {
  const config = INVOICE_STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  );
}
