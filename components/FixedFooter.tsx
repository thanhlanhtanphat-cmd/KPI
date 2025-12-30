
import React from 'react';
import { FileImage, FileText, Share2 } from 'lucide-react';

export type ViewState = 'LOGIN' | 'HUB' | 'PROJECT_DASHBOARD' | 'DETAIL' | 'PLANNING' | 'AI_AGENT' | 'APP_SETTINGS' | 'MONTHLY_PLAN' | 'KPI_DASHBOARD';

interface FixedFooterProps {
  view: ViewState;
  onExportPNG?: () => void;
  onExportPDF?: () => void;
  isExporting?: boolean;
}

const PAGE_MAP: Record<string, { id: string; title: string }> = {
  'LOGIN': { id: '01', title: 'BẢNG ĐĂNG NHẬP' },
  'HUB': { id: '02', title: 'HỆ THỐNG MENU CHÍNH' },
  'PROJECT_DASHBOARD': { id: '03', title: 'DANH SÁCH DỰ ÁN NĂM' },
  'AI_AGENT': { id: '04', title: 'TRỢ LÝ ẢO TÂN PHÁT' },
  'DETAIL': { id: '05', title: 'CHI TIẾT HỒ SƠ DỰ ÁN' },
  'PLANNING': { id: '06', title: 'KẾ HOẠCH CHI TIẾT PHÒNG THIẾT KẾ' },
  'APP_SETTINGS': { id: '07', title: 'QUẢN LÝ ỨNG DỤNG' },
  'MONTHLY_PLAN': { id: '08', title: 'DANH SÁCH CÔNG VIỆC XỬ LÝ TRONG THÁNG' },
  'KPI_DASHBOARD': { id: '09', title: 'QUẢN TRỊ HIỆU SUẤT NHÂN SỰ' },
};

const FixedFooter: React.FC<FixedFooterProps> = ({ view, onExportPNG, onExportPDF, isExporting = false }) => {
  const pageInfo = PAGE_MAP[view] || { id: '99', title: 'SYSTEM ERROR' };
  const showExport = (view === 'PROJECT_DASHBOARD' || view === 'DETAIL') && onExportPNG && onExportPDF;

  return (
    <div className="fixed bottom-0 left-0 w-full h-12 bg-slate-900 border-t border-slate-800 z-[100] flex items-center justify-between px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]">
      {/* Left: Page Number & Title */}
      <div className="flex items-center gap-4">
        <div className="text-xl font-black text-red-600 tracking-tighter">
          {pageInfo.id}
        </div>
        <div className="h-4 w-[1px] bg-slate-700"></div>
        <div className="text-xs font-bold text-white uppercase tracking-widest">
          {pageInfo.title}
        </div>
      </div>

      {/* Right: Export Controls (Conditional) */}
      {showExport && (
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-bold text-slate-500 uppercase mr-2 hidden md:block">
            Export Tools
          </div>
          <button 
            onClick={onExportPNG}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold transition-all border border-slate-700 hover:border-slate-500 disabled:opacity-50"
            title="Xuất ảnh PNG"
          >
            <FileImage size={14} className="text-blue-400" /> 
            <span className="hidden sm:inline">PNG</span>
          </button>
          
          <button 
            onClick={onExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold transition-all border border-slate-700 hover:border-slate-500 disabled:opacity-50"
            title="Xuất báo cáo PDF"
          >
            <FileText size={14} className="text-red-400" />
            <span className="hidden sm:inline">PDF</span>
          </button>
        </div>
      )}
      
      {/* Copyright/Version for Login/Menu (When no exports) */}
      {!showExport && (
        <div className="text-[10px] font-medium text-slate-600">
           TÂN PHÁT TOTE & BUILDING © 2025
        </div>
      )}
    </div>
  );
};

export default FixedFooter;
