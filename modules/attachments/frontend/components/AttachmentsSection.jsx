import { useState, useRef } from 'react';
import { Paperclip, FileText, Image as ImageIcon, File, Trash2, Download, Loader2, Eye, X } from 'lucide-react';
import { useAttachments, useUploadAttachment, useDeleteAttachment } from '../hooks/useAttachments.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

export function AttachmentsSection({ entityType, entityId }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const { data: files = [], isLoading } = useAttachments(entityType, entityId);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

  const { mutate: uploadFile, isPending: isUploading } = useUploadAttachment({
    onSuccess: () => {
      toast.success('Tải lên file đính kèm thành công');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Không thể tải lên file');
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
  });

  const { mutate: deleteFile, isPending: isDeleting } = useDeleteAttachment({
    onSuccess: () => {
      toast.success('Đã xóa file đính kèm');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Xóa file đính kèm thất bại');
    },
  });

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Kích thước file không được vượt quá 10MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('entity_type', entityType);
    formData.append('entity_id', entityId);

    uploadFile(formData);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType) => {
    if (mimeType === 'application/pdf') return FileText;
    return File;
  };

  const triggerSelectFile = () => {
    fileInputRef.current?.click();
  };

  const imageFiles = files.filter((f) => f.mime_type.startsWith('image/'));
  const otherFiles = files.filter((f) => !f.mime_type.startsWith('image/'));

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <Paperclip size={18} className="text-indigo-600" />
          Tài liệu đính kèm
        </h3>

        {/* Upload Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
          />
          <button
            onClick={triggerSelectFile}
            disabled={isUploading}
            className="btn-secondary flex items-center gap-1 text-xs py-1.5 px-3"
            id="upload-attachment-btn"
          >
            {isUploading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Đang tải...
              </>
            ) : (
              <>\+ Đính kèm file</>
            )}
          </button>
        </div>
      </div>

      {/* Attachments Content */}
      {isLoading ? (
        <div className="text-center py-6 text-slate-400 text-sm">Đang tải tài liệu...</div>
      ) : files.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Chưa có tài liệu đính kèm.</p>
      ) : (
        <div className="space-y-4">
          {/* Image Gallery Preview */}
          {imageFiles.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Hình ảnh</p>
              <div className="grid grid-cols-2 gap-2">
                {imageFiles.map((file) => {
                  const isOwner = file.uploaded_by === user?.id;
                  const isManager = ['ADMIN', 'MANAGER'].includes(user?.role);
                  const canDelete = isOwner || isManager;

                  return (
                    <div
                      key={file.id}
                      className="group relative aspect-video rounded-xl overflow-hidden border border-slate-100 bg-slate-50"
                    >
                      <img
                        src={file.file_url}
                        alt={file.file_name}
                        className="w-full h-full object-cover cursor-zoom-in group-hover:scale-105 transition-transform duration-200"
                        onClick={() => setPreviewImageUrl(file.file_url)}
                      />
                      
                      {/* Actions Overlay */}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center gap-2">
                        <button
                          onClick={() => setPreviewImageUrl(file.file_url)}
                          className="w-7 h-7 flex items-center justify-center bg-white text-slate-700 hover:text-indigo-600 rounded-lg shadow-sm transition-colors"
                          title="Xem ảnh"
                        >
                          <Eye size={13} />
                        </button>
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 flex items-center justify-center bg-white text-slate-700 hover:text-indigo-600 rounded-lg shadow-sm transition-colors"
                          title="Tải ảnh gốc"
                        >
                          <Download size={13} />
                        </a>
                        {canDelete && (
                          <button
                            onClick={() => deleteFile({ id: file.id })}
                            disabled={isDeleting}
                            className="w-7 h-7 flex items-center justify-center bg-white text-rose-600 hover:bg-rose-50 rounded-lg shadow-sm transition-colors"
                            title="Xóa ảnh"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Other Documents List */}
          {otherFiles.length > 0 && (
            <div className="space-y-2">
              {imageFiles.length > 0 && <div className="border-t border-slate-100 my-2" />}
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tài liệu khác</p>
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {otherFiles.map((file) => {
                  const IconComponent = getFileIcon(file.mime_type);
                  const isOwner = file.uploaded_by === user?.id;
                  const isManager = ['ADMIN', 'MANAGER'].includes(user?.role);
                  const canDelete = isOwner || isManager;

                  return (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100/50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 mr-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <IconComponent size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate" title={file.file_name}>
                            {file.file_name}
                          </p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            {formatFileSize(file.file_size)} · {file.uploader?.full_name}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <a
                          href={file.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-colors"
                          title="Tải về"
                        >
                          <Download size={13} />
                        </a>
                        {canDelete && (
                          <button
                            onClick={() => deleteFile({ id: file.id })}
                            disabled={isDeleting}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition-colors"
                            title="Xóa"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Preview Modal (Lightbox) */}
      {previewImageUrl && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[85vh] w-full flex items-center justify-center">
            {/* Close button */}
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute -top-10 right-0 p-2 text-white hover:text-slate-200 transition-colors"
              title="Đóng"
            >
              <X size={24} />
            </button>
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
          {/* Click outside to close */}
          <div
            className="absolute inset-0 -z-10 w-full h-full"
            onClick={() => setPreviewImageUrl(null)}
          />
        </div>
      )}
    </div>
  );
}
