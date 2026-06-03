import { useState } from 'react';
import { Send, User, MessageSquare } from 'lucide-react';
import { useComments, useCreateComment } from '../hooks/useComments.js';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

const ROLE_BADGES = {
  ADMIN: 'bg-rose-100 text-rose-700 border-rose-200',
  MANAGER: 'bg-purple-100 text-purple-700 border-purple-200',
  RECEPTIONIST: 'bg-blue-100 text-blue-700 border-blue-200',
  TECHNICIAN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const ROLE_LABELS = {
  ADMIN: 'Admin',
  MANAGER: 'Quản lý',
  RECEPTIONIST: 'Lễ tân',
  TECHNICIAN: 'Kỹ thuật',
};

export function CommentsSection({ serviceRequestId }) {
  const [content, setContent] = useState('');
  const { data: comments = [], isLoading } = useComments(serviceRequestId);

  const { mutate: createComment, isPending } = useCreateComment({
    onSuccess: () => {
      setContent('');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Không thể gửi bình luận');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    createComment({ service_request_id: serviceRequestId, content });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col h-[500px]">
      <h3 className="font-bold text-slate-800 text-base flex items-center gap-2 border-b pb-3 shrink-0">
        <MessageSquare size={18} className="text-indigo-600" />
        Trao đổi nội bộ
      </h3>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Đang tải thảo luận...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm space-y-1">
            <p>Chưa có thảo luận nào cho sự cố này.</p>
            <p className="text-[10px] text-slate-300">Hãy là người đầu tiên đưa ra cập nhật nội bộ.</p>
          </div>
        ) : (
          comments.map((comment) => {
            const initials = getInitials(comment.creator?.full_name);
            const roleBadge = ROLE_BADGES[comment.creator?.role] || 'bg-slate-100 text-slate-600';
            const roleLabel = ROLE_LABELS[comment.creator?.role] || comment.creator?.role;

            return (
              <div key={comment.id} className="flex gap-3 items-start text-sm">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 select-none">
                  {initials}
                </div>

                {/* Content */}
                <div className="flex-1 space-y-1 bg-slate-50 border border-slate-100 rounded-2xl px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-800">{comment.creator?.full_name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${roleBadge}`}>
                        {roleLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {comment.created_at ? format(parseISO(comment.created_at), 'HH:mm dd/MM/yyyy') : ''}
                    </span>
                  </div>
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap mt-1 text-xs">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="border-t pt-3 flex gap-2 shrink-0">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Nhập nội dung thảo luận nội bộ... (Shift+Enter để xuống dòng)"
          disabled={isPending}
          className="flex-1 min-h-[38px] max-h-[80px] p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white resize-none"
          rows={1}
        />
        <button
          type="submit"
          disabled={isPending || !content.trim()}
          className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl transition-colors shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
