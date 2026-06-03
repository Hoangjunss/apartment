import { useState } from 'react';
import toast from 'react-hot-toast';
import { Download, UploadCloud, CheckCircle, XCircle, AlertCircle, Loader2, Save } from 'lucide-react';
import { Modal } from '@/components/common/Modal.jsx';
import { useImportUtilityPreview, useBulkSaveUtilities } from '../hooks/useFinance.js';
import { downloadUtilityTemplate } from '../services/finance.api.js';

export function BulkUtilityReadingModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [previewRows, setPreviewRows] = useState([]);
  const [hasUploaded, setHasUploaded] = useState(false);

  // Hook 1: Import Excel and get preview data
  const { mutate: getPreview, isPending: isUploading } = useImportUtilityPreview({
    onSuccess: (data) => {
      toast.success('Đọc file Excel thành công!');
      setPreviewRows(data);
      setHasUploaded(true);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lỗi khi đọc file Excel');
    }
  });

  // Hook 2: Save the validated records to DB
  const { mutate: saveUtilities, isPending: isSaving } = useBulkSaveUtilities({
    onSuccess: (data) => {
      toast.success(`Đã lưu thành công ${data.successCount} chỉ số điện nước!`);
      if (data.errorCount > 0) {
        toast.error(`Thất bại ${data.errorCount} phòng. Vui lòng kiểm tra lại.`);
      }
      onClose();
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Lưu chỉ số điện nước thất bại');
    }
  });

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadUtilityTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'utility_readings_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('Đã tải xuống file mẫu chứa danh sách phòng!');
    } catch (err) {
      console.error(err);
      toast.error('Không thể tải file mẫu. Vui lòng thử lại.');
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
        toast.error('Chỉ chấp nhận file Excel (.xlsx, .xls)');
        return;
      }
      setFile(selectedFile);
      setPreviewRows([]);
      setHasUploaded(false);
    }
  };

  const handleUploadSubmit = (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Vui lòng chọn file Excel trước');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    getPreview(formData);
  };

  // Handle local change in preview table
  const handleRowChange = (index, field, value) => {
    const updatedRows = [...previewRows];
    const row = updatedRows[index];

    // Update value
    row[field] = value !== '' ? Number(value) : '';

    // Local validation
    let error = null;
    let isValid = true;

    if (row.electricity_curr === '' || isNaN(row.electricity_curr)) {
      isValid = false;
      error = 'Thiếu chỉ số điện mới';
    } else if (Number(row.electricity_curr) < Number(row.electricity_prev)) {
      isValid = false;
      error = `Số điện mới (${row.electricity_curr}) < số cũ (${row.electricity_prev})`;
    }

    row.isValid = isValid;
    row.error = error;

    setPreviewRows(updatedRows);
  };

  const handleSaveConfirm = () => {
    const validRows = previewRows.filter((r) => r.isValid && r.apartment_id);
    if (validRows.length === 0) {
      toast.error('Không có dòng dữ liệu nào hợp lệ để lưu!');
      return;
    }

    saveUtilities(validRows);
  };

  const handleReset = () => {
    setFile(null);
    setPreviewRows([]);
    setHasUploaded(false);
  };

  // Compute counters
  const totalCount = previewRows.length;
  const validCount = previewRows.filter((r) => r.isValid).length;
  const invalidCount = totalCount - validCount;

  return (
    <Modal title="Nhập chỉ số điện nước từ Excel" onClose={onClose} size="xl">
      <div className="space-y-4">
        {/* Step 1: dynamic template description */}
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Bước 1: Sử dụng file mẫu Excel chứa danh sách phòng</h4>
            <p className="text-xs text-indigo-600 max-w-xl leading-relaxed">
              Hệ thống sẽ quét toàn bộ phòng có hợp đồng thuê hoạt động, điền sẵn Mã căn hộ, Tháng hiện tại và Chỉ số cũ của tháng trước để bạn dễ đối chiếu.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="btn-secondary flex items-center gap-1.5 shrink-0 text-xs py-1.5 px-3 bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            id="download-template-btn"
          >
            <Download size={14} />
            Tải file mẫu Excel
          </button>
        </div>

        {/* Phase 1: Upload File Form */}
        {!hasUploaded ? (
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bước 2: Chọn file Excel chỉ số điện đã điền</h4>
              <p className="text-xs text-slate-500">
                Sau khi điền số điện mới vào file mẫu, hãy tải lên đây để đối chiếu.
              </p>
            </div>

            <div className="border-2 border-dashed border-slate-200 rounded-xl hover:border-indigo-400 transition-colors p-8 text-center bg-white cursor-pointer relative">
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                disabled={isUploading}
                id="excel-file-input"
              />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                  <UploadCloud size={24} />
                </div>
                {file ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-800">{file.name}</p>
                    <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700">Kéo thả file Excel vào đây hoặc click để chọn</p>
                    <p className="text-xs text-slate-400">Chấp nhận file định dạng .xlsx, .xls</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                disabled={isUploading}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                disabled={!file || isUploading}
                id="submit-excel-btn"
              >
                {isUploading && <Loader2 size={14} className="animate-spin" />}
                {isUploading ? 'Đang đọc dữ liệu...' : 'Tải lên & Xem trước'}
              </button>
            </div>
          </form>
        ) : (
          /* Phase 2: Preview & Edit Grid */
          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bước 3: Kiểm tra, chỉnh sửa dữ liệu xem trước</h4>
              <p className="text-xs text-slate-500">
                Bạn có thể sửa trực tiếp chỉ số mới bị sai ngay tại bảng. Hệ thống chỉ lưu các dòng ở trạng thái <strong className="text-emerald-600">Hợp lệ</strong>.
              </p>
            </div>

            {/* Preview Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-center">
                <span className="block text-xs font-semibold text-slate-500">Tổng dòng nhập</span>
                <span className="block text-base font-bold text-slate-800 mt-0.5">{totalCount}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <span className="block text-xs font-semibold text-emerald-600">Hợp lệ (Sẵn sàng lưu)</span>
                <span className="block text-base font-bold text-emerald-700 mt-0.5">{validCount}</span>
              </div>
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-center">
                <span className="block text-xs font-semibold text-rose-600">Lỗi (Cần chỉnh sửa)</span>
                <span className="block text-base font-bold text-rose-700 mt-0.5">{invalidCount}</span>
              </div>
            </div>

            {/* Editable Preview Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden bg-white max-h-[350px] overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">Căn hộ</th>
                    <th className="py-2.5 px-3">Tháng</th>
                    <th className="py-2.5 px-3 text-right">Điện cũ</th>
                    <th className="py-2.5 px-3">Điện mới (kWh)</th>
                    <th className="py-2.5 px-3">Trạng thái</th>
                    <th className="py-2.5 px-3">Chi tiết lỗi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((row, index) => (
                    <tr
                      key={index}
                      className={`hover:bg-slate-50/80 transition-colors ${!row.isValid ? 'bg-rose-50/20' : ''}`}
                    >
                      <td className="py-2 px-3 font-semibold text-slate-700">{row.apartment_code}</td>
                      <td className="py-2 px-3 text-slate-500 font-mono">{row.billing_month}</td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400">{row.electricity_prev}</td>
                      <td className="py-1 px-3">
                        <input
                          type="number"
                          value={row.electricity_curr}
                          onChange={(e) => handleRowChange(index, 'electricity_curr', e.target.value)}
                          className={`w-24 p-1 border rounded font-mono text-xs focus:ring-1 focus:ring-indigo-500 outline-none ${
                            !row.isValid && row.error?.includes('điện')
                              ? 'border-rose-300 bg-rose-50 text-rose-700'
                              : 'border-slate-200 bg-white text-slate-800'
                          }`}
                        />
                      </td>
                      <td className="py-2 px-3">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle size={10} /> Hợp lệ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                            <XCircle size={10} /> Lỗi
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-rose-600 font-medium text-[11px] max-w-[150px] truncate" title={row.error}>
                        {row.error}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Preview warning alerts */}
            {invalidCount > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2 text-xs text-amber-700">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Đang có <strong>{invalidCount} dòng lỗi</strong>. Bạn hãy chỉnh sửa lại các ô bị đỏ cho hợp lệ, hoặc tiếp tục lưu — hệ thống sẽ tự động <strong>bỏ qua các dòng lỗi</strong> này khi lưu.
                </span>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                disabled={isSaving}
              >
                Tải file khác
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
                  disabled={isSaving}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfirm}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
                  disabled={validCount === 0 || isSaving}
                  id="confirm-excel-btn"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Đang cập nhật...
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      Xác nhận & Cập nhật ({validCount} căn)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
