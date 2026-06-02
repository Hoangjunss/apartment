import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/axios.js';
import { 
  Building2, 
  User, 
  Phone, 
  FileText, 
  AlertCircle, 
  CheckCircle, 
  Wrench, 
  Brush, 
  MessageSquareCode, 
  Layers,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  requester_name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  requester_phone: z.string().regex(/^(03|05|07|08|09)+([0-9]{8})$/, 'Số điện thoại Việt Nam không hợp lệ'),
  type: z.enum(['MAINTENANCE', 'CLEANING', 'COMPLAINT', 'OTHER'], {
    required_error: 'Vui lòng chọn loại yêu cầu',
  }),
  title: z.string().min(5, 'Tiêu đề ngắn phải có ít nhất 5 ký tự').max(100, 'Tiêu đề tối đa 100 ký tự'),
  description: z.string().min(1, 'Vui lòng mô tả chi tiết sự cố'),
});

export default function PublicRequestPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');
  
  const [loading, setLoading] = useState(true);
  const [roomInfo, setRoomInfo] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Đường dẫn không hợp lệ. Vui lòng kiểm tra lại mã QR code.');
      setLoading(false);
      return;
    }

    const fetchRoomInfo = async () => {
      try {
        const response = await api.get(`/public/room-info?t=${token}`);
        if (response.data?.success) {
          setRoomInfo(response.data.data);
        } else {
          setErrorMsg('Mã QR code này đã hết hạn hoặc không tồn tại. Vui lòng liên hệ lễ tân.');
        }
      } catch (err) {
        setErrorMsg(err.response?.data?.message || 'Không thể xác thực thông tin phòng. Vui lòng liên hệ lễ tân.');
      } finally {
        setLoading(false);
      }
    };

    fetchRoomInfo();
  }, [token]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'MAINTENANCE',
    }
  });

  const onSubmit = async (data) => {
    try {
      const payload = {
        token,
        ...data,
        priority: 'NORMAL', // Default priority from public form
      };
      const response = await api.post('/public/service-requests', payload);
      if (response.data?.success) {
        setSuccessData(response.data.data);
        toast.success('Gửi yêu cầu thành công!');
      } else {
        toast.error('Có lỗi xảy ra khi gửi yêu cầu.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu.');
    }
  };

  const handleResetForm = () => {
    setSuccessData(null);
    reset();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 shadow-2xl space-y-6">
          <div className="h-10 bg-slate-700/50 rounded-lg animate-pulse w-3/4 mx-auto" />
          <div className="h-28 bg-slate-700/50 rounded-xl animate-pulse" />
          <div className="space-y-4">
            <div className="h-12 bg-slate-700/50 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-700/50 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-700/50 rounded-lg animate-pulse" />
            <div className="h-32 bg-slate-700/50 rounded-lg animate-pulse" />
            <div className="h-12 bg-slate-700/50 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800/85 border border-slate-700/50 rounded-2xl p-8 text-center shadow-2xl space-y-5">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-950/50 border border-red-500/30 text-red-400 mb-2">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Liên kết không hợp lệ</h2>
          <p className="text-slate-400 leading-relaxed text-sm">
            {errorMsg}
          </p>
          <div className="pt-2 text-xs text-slate-500">
            Hệ thống quản lý căn hộ dịch vụ
          </div>
        </div>
      </div>
    );
  }

  if (successData) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-800/85 border border-slate-700/50 rounded-2xl p-8 text-center shadow-2xl space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-950/50 border border-emerald-500/30 text-emerald-400 mb-2">
            <CheckCircle size={32} />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-100">Gửi yêu cầu thành công!</h2>
            <p className="text-xs text-slate-400">
              Mã số yêu cầu của bạn:
            </p>
            <div className="inline-block px-4 py-1.5 bg-slate-700/80 rounded-lg text-emerald-400 font-mono font-bold text-lg">
              #{successData.id}
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Chúng tôi đã tiếp nhận yêu cầu và sẽ cử nhân viên xử lý sớm nhất. Quý khách vui lòng để ý điện thoại liên lạc.
          </p>
          <button
            onClick={handleResetForm}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg shadow-blue-500/20"
          >
            Gửi yêu cầu khác
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 flex items-center justify-center">
      <div className="w-full max-w-lg bg-slate-800/85 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-sm">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-6 text-white relative">
          <div className="absolute top-4 right-4 text-white/20 animate-pulse">
            <Sparkles size={24} />
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold">Gửi Yêu Cầu Hỗ Trợ</h1>
              <p className="text-xs text-blue-100">Căn hộ dịch vụ cao cấp</p>
            </div>
          </div>
        </div>

        {/* Room Info Section (Read-only) */}
        <div className="bg-slate-700/40 border-b border-slate-700 px-6 py-4 flex justify-between items-center text-sm">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="font-semibold text-white">{roomInfo?.building_name}</span>
          </div>
          <div className="flex gap-2">
            <span className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-300 border border-slate-700">Tầng {roomInfo?.floor_number}</span>
            <span className="px-2 py-0.5 bg-blue-950 text-blue-300 rounded text-xs font-bold border border-blue-800">Phòng {roomInfo?.apartment_code}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Reporter Name */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                {...register('requester_name')}
                type="text"
                placeholder="Nhập họ và tên của bạn"
                className={`w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-500 ${
                  errors.requester_name ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
                }`}
              />
            </div>
            {errors.requester_name && (
              <p className="text-xs text-red-400 font-medium">{errors.requester_name.message}</p>
            )}
          </div>

          {/* Reporter Phone */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Số điện thoại liên lạc <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                {...register('requester_phone')}
                type="tel"
                placeholder="Ví dụ: 0987654321"
                className={`w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-500 ${
                  errors.requester_phone ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
                }`}
              />
            </div>
            {errors.requester_phone && (
              <p className="text-xs text-red-400 font-medium">{errors.requester_phone.message}</p>
            )}
          </div>

          {/* Request Type */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Loại yêu cầu <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Layers size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                {...register('type')}
                className={`w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                  errors.type ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
                }`}
              >
                <option value="MAINTENANCE" className="bg-slate-800">🛠️ Sửa chữa & kỹ thuật (điện, nước...)</option>
                <option value="CLEANING" className="bg-slate-800">🧹 Dọn dẹp & vệ sinh phòng</option>
                <option value="COMPLAINT" className="bg-slate-800">💬 Phản ánh & đóng góp ý kiến</option>
                <option value="OTHER" className="bg-slate-800">❓ Yêu cầu dịch vụ khác</option>
              </select>
            </div>
            {errors.type && (
              <p className="text-xs text-red-400 font-medium">{errors.type.message}</p>
            )}
          </div>

          {/* Short Title */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Tiêu đề ngắn <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                {...register('title')}
                type="text"
                placeholder="Ví dụ: Hỏng vòi nước phòng tắm, mất điện ổ cắm..."
                className={`w-full pl-10 pr-3 py-2.5 bg-slate-800/80 border text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-500 ${
                  errors.title ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
                }`}
              />
            </div>
            {errors.title && (
              <p className="text-xs text-red-400 font-medium">{errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Mô tả chi tiết sự cố <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('description')}
              rows={4}
              placeholder="Vui lòng miêu tả chi tiết tình trạng sự cố để chúng tôi chuẩn bị dụng cụ phù hợp khi tới kiểm tra..."
              className={`w-full px-4 py-2.5 bg-slate-800/80 border text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition placeholder:text-slate-500 ${
                errors.description ? 'border-red-500 focus:ring-red-500' : 'border-slate-700'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-red-400 font-medium">{errors.description.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 mt-3 shadow-lg shadow-blue-500/20"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Đang gửi yêu cầu...
              </span>
            ) : (
              'Gửi yêu cầu hỗ trợ'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pb-6 text-slate-500 text-xs bg-slate-850">
          Phát triển bởi đội ngũ kỹ thuật QLCHDC
        </div>
      </div>
    </div>
  );
}
