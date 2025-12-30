
import React, { useState } from 'react';
import { LayoutDashboard, PencilRuler, Bot, LogOut, ArrowRight, Settings, Sliders, CalendarDays, TrendingUp } from 'lucide-react';
import FixedFooter from './FixedFooter';
import { AppLink } from '../types';

interface HubProps {
  onSelectModule: (module: 'PROJECT_DASHBOARD' | 'PLANNING' | 'AI_AGENT' | 'APP_SETTINGS' | 'MONTHLY_PLAN' | 'KPI_DASHBOARD') => void;
  onLogout: () => void;
  appLinks: AppLink[];
}

const Hub: React.FC<HubProps> = ({ onSelectModule, onLogout, appLinks }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 opacity-20"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop")' }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-900/90 to-slate-900 z-10"></div>

      <div className="relative z-20 w-full max-w-7xl flex flex-col items-center">
        
        <div className="text-center mb-16 animate-fade-in-down flex flex-col items-center">
           <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-2">
             <span className="text-red-600">TÂN PHÁT</span> <span className="text-white">TOTE & BUILDING</span>
           </h1>
           <h2 className="text-sm font-medium text-slate-400 italic tracking-wider">
             Luôn luôn đồng hành - Luôn luôn chia sẻ
           </h2>
           <div className="h-1 w-24 bg-red-600 mx-auto mt-6 rounded-full"></div>
        </div>

        {/* Updated Grid: 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
          
          <div 
            onClick={() => onSelectModule('PROJECT_DASHBOARD')}
            className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 cursor-pointer hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-blue-900/20"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-t-3xl"></div>
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:bg-blue-500 group-hover:text-white transition-colors">
              <LayoutDashboard size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">BÁO CÁO TIẾN ĐỘ</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 h-10 line-clamp-2">
              Theo dõi tổng quan tiến độ, quản lý thiết kế, thi công và hồ sơ pháp lý.
            </p>
            <div className="flex items-center text-blue-400 font-bold text-xs uppercase tracking-wide group-hover:gap-2 transition-all">
              Truy cập <ArrowRight size={14} className="ml-1" />
            </div>
          </div>

          <div 
            onClick={() => onSelectModule('PLANNING')}
            className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 cursor-pointer hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-orange-900/20"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-yellow-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-t-3xl"></div>
            <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-400 mb-6 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              <PencilRuler size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">KẾ HOẠCH CHI TIẾT PHÒNG THIẾT KẾ</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 h-10 line-clamp-2">
              Lập kế hoạch nhân sự, phân bổ nguồn lực và timeline chi tiết.
            </p>
            <div className="flex items-center text-orange-400 font-bold text-xs uppercase tracking-wide group-hover:gap-2 transition-all">
              Truy cập <ArrowRight size={14} className="ml-1" />
            </div>
          </div>

          <div 
            onClick={() => onSelectModule('MONTHLY_PLAN')}
            className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 cursor-pointer hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-900/20"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-t-3xl"></div>
            <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:bg-purple-500 group-hover:text-white transition-colors">
              <CalendarDays size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">KẾ HOẠCH THÁNG</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 h-10 line-clamp-2">
              Chọn lọc các dự án tồn đọng cần xử lý trong tháng.
            </p>
            <div className="flex items-center text-purple-400 font-bold text-xs uppercase tracking-wide group-hover:gap-2 transition-all">
              Truy cập <ArrowRight size={14} className="ml-1" />
            </div>
          </div>

          <div 
            onClick={() => onSelectModule('KPI_DASHBOARD')}
            className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-8 cursor-pointer hover:bg-white/10 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-900/20"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 rounded-t-3xl"></div>
            <div className="w-14 h-14 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 group-hover:bg-indigo-500 group-hover:text-white transition-colors">
              <TrendingUp size={28} />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">KPI - TÂN PHÁT</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 h-10 line-clamp-2">
              Quản trị hiệu suất nhân sự, đánh giá năng lực và chất lượng công việc.
            </p>
            <div className="flex items-center text-indigo-400 font-bold text-xs uppercase tracking-wide group-hover:gap-2 transition-all">
              Truy cập <ArrowRight size={14} className="ml-1" />
            </div>
          </div>

        </div>

        <div className="mt-16 flex gap-4">
          <button 
            onClick={() => onSelectModule('APP_SETTINGS')}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10"
          >
            <Settings size={14} /> Cài đặt
          </button>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors font-bold text-xs uppercase tracking-wider px-4 py-2 rounded-full hover:bg-white/5 border border-transparent hover:border-white/10"
          >
            <LogOut size={14} /> Đăng xuất
          </button>
        </div>

      </div>

      {/* FAB AI AGENT - Bottom Right */}
      <div className="fixed bottom-20 right-6 z-40 group">
         <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
            Trò chuyện với AI
            <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rotate-45"></div>
         </div>
         
         <button 
           onClick={() => onSelectModule('AI_AGENT')}
           className="w-16 h-16 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-all duration-300 ring-4 ring-purple-600/30"
           title="Trò chuyện với AI"
         >
           <Bot size={32} />
           {/* Notification Dot */}
           <span className="absolute top-0 right-0 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-slate-900"></span>
            </span>
         </button>
      </div>

      <FixedFooter view="HUB" />
    </div>
  );
};

export default Hub;
