import React from 'react';

export function Footer() {
  return (
    <footer className="relative w-full py-2.5 px-6 mt-auto overflow-hidden bg-[#f4f8f5] border-t border-[#d8e8e0] text-center text-[12px] text-[#14503F]/70">
      {/* Background họa tiết đường sóng đồi núi nhạt gần gũi */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <svg className="w-full h-full" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0,10 C300,35 600,0 900,25 C1050,35 1150,15 1200,20 L1200,40 L0,40 Z" fill="#dceee3" />
        </svg>
      </div>

      {/* Nội dung duy nhất: Dòng Copyright siêu bé */}
      <div className="relative z-10 font-medium tracking-wide">
        © 2026 Aethera. All rights reserved.
      </div>
    </footer>
  );
}