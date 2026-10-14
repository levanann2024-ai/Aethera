import React from 'react';
import { Mail, Phone, ExternalLink, MessageSquareHeart } from 'lucide-react';

export function ContactPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8">
      {/* Tiêu đề trang to rõ */}
      <div className="space-y-1">
        <h2 className="text-3xl font-bold text-[#14503F]">Liên hệ & Góp ý</h2>
        <p className="text-base text-gray-500">Đội ngũ Aethera luôn sẵn sàng lắng nghe và hỗ trợ bạn.</p>
      </div>

      {/* Grid 2 Cột Bề Thế, To Rộng */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Cột 1: Thông tin liên hệ trực tiếp */}
        <div className="bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between space-y-8 min-h-[380px]">
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-emerald-900 border-b border-gray-100 pb-4">
              Kênh hỗ trợ trực tiếp
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-5 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/60">
                <div className="p-3.5 bg-emerald-700 text-white rounded-xl flex-shrink-0 shadow-sm">
                  <Mail size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Email chính thức</p>
                  <p className="text-base font-bold text-gray-800 mt-0.5">contact@aethera.edu.vn</p>
                </div>
              </div>

              <div className="flex items-center gap-5 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/60">
                <div className="p-3.5 bg-emerald-700 text-white rounded-xl flex-shrink-0 shadow-sm">
                  <Phone size={24} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Hotline / Zalo hỗ trợ</p>
                  <p className="text-base font-bold text-gray-800 mt-0.5">0123 456 789</p>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-400 italic text-center">Phản hồi thường được xử lý trong vòng 24 giờ làm việc.</p>
        </div>

        {/* Cột 2: Nút mở Google Form đóng góp ý kiến */}
        <div className="bg-amber-500/10 border border-amber-200/80 p-8 md:p-10 rounded-3xl shadow-sm flex flex-col justify-between space-y-8 min-h-[380px]">
          <div className="space-y-4">
            <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-md">
              <MessageSquareHeart size={28} />
            </div>
            <h3 className="text-2xl font-bold text-amber-950">Góp ý & Báo lỗi</h3>
            <p className="text-base text-amber-900/80 leading-relaxed">
              Mọi ý kiến đóng góp về tính năng hoặc báo lỗi dữ liệu từ vựng đều rất quý giá để Aethera ngày càng hoàn thiện hơn.
            </p>
          </div>

          <a
            href="https://forms.gle/your-google-form-link" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full py-4 px-6 bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-3 active:scale-98"
          >
            <span>Đóng góp qua Google Forms</span>
            <ExternalLink size={22} />
          </a>
        </div>

      </div>
    </div>
  );
}