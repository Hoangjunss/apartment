// src/components/forms/ModalFooter.jsx
export function ModalFooter({ onCancel, isLoading, submitLabel = 'Lưu', submitVariant = 'primary' }) {
  return (
    <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-gray-100">
      <button
        type="button"
        onClick={onCancel}
        className="btn-secondary"
        disabled={isLoading}
      >
        Hủy
      </button>
      <button
        type="submit"
        disabled={isLoading}
        className={submitVariant === 'danger' ? 'btn-danger' : 'btn-primary'}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Đang lưu...
          </span>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  );
}
