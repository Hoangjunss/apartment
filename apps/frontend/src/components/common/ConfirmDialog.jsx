// src/components/common/ConfirmDialog.jsx
import { Modal } from './Modal.jsx';
import { AlertTriangle } from 'lucide-react';

export function ConfirmDialog({
  title = 'Xác nhận',
  message,
  onConfirm,
  onCancel,
  confirmText = 'Xác nhận',
  confirmVariant = 'danger', // 'danger' | 'primary'
  isLoading = false,
}) {
  return (
    <Modal title={title} onClose={onCancel} size="sm">
      <div className="flex gap-3 mb-5">
        <AlertTriangle
          className="text-amber-500 shrink-0 mt-0.5"
          size={20}
        />
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-secondary" type="button">
          Hủy
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className={confirmVariant === 'danger' ? 'btn-danger' : 'btn-primary'}
          type="button"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Đang xử lý...
            </span>
          ) : (
            confirmText
          )}
        </button>
      </div>
    </Modal>
  );
}
