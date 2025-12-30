
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Link as LinkIcon, Image as ImageIcon, RotateCcw, Calculator, Lock, Unlock } from 'lucide-react';
import FixedFooter from './FixedFooter';
import { AppLink } from '../types';
import { DEFAULT_APP_LINKS } from '../constants';

interface AppSettingsProps {
  onBack: () => void;
  appLinks: AppLink[];
  onUpdateAppLinks: (newLinks: AppLink[]) => void;
}

const AppSettings: React.FC<AppSettingsProps> = ({ onBack, appLinks, onUpdateAppLinks }) => {
  const [editingLinks, setEditingLinks] = useState<AppLink[]>(JSON.parse(JSON.stringify(appLinks)));
  const [activeTab, setActiveTab] = useState<'APPS' | 'SYSTEM'>('APPS');
  const [isSaving, setIsSaving] = useState(false);

  // KPI Config State
  const [kpiConfig, setKpiConfig] = useState({ heSoKPI: '1.7', chiPhiThietKe: '180' });
  const [isKpiUnlocked, setIsKpiUnlocked] = useState(false);
  const [kpiPasswordInput, setKpiPasswordInput] = useState('');

  // Load KPI Config
  useEffect(() => {
    const savedKpi = localStorage.getItem('SYSTEM_KPI_CONFIG');
    if (savedKpi) {
      setKpiConfig(JSON.parse(savedKpi));
    } else {
      const defaults = { heSoKPI: '1.7', chiPhiThietKe: '180' };
      localStorage.setItem('SYSTEM_KPI_CONFIG', JSON.stringify(defaults));
      setKpiConfig(defaults);
    }
  }, []);

  // App Links Handlers
  const handleChange = (id: string, field: keyof AppLink, value: string) => {
    setEditingLinks(prev => prev.map(app => 
      app.id === id ? { ...app, [field]: value } : app
    ));
  };

  const handleReset = (id: string) => {
    const defaultApp = DEFAULT_APP_LINKS.find(d => d.id === id);
    if (defaultApp) {
      setEditingLinks(prev => prev.map(app => 
        app.id === id ? { ...app, imageUrl: defaultApp.imageUrl, name: defaultApp.name, description: defaultApp.description } : app
      ));
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onUpdateAppLinks(editingLinks);
      localStorage.setItem('SYSTEM_KPI_CONFIG', JSON.stringify(kpiConfig));
      setIsSaving(false);
      alert("Đã lưu cấu hình thành công!");
    }, 500);
  };

  const handleUnlockKpi = () => {
    if (kpiPasswordInput === '1') {
      setIsKpiUnlocked(true);
      setKpiPasswordInput('');
    } else {
      alert("Mật khẩu không đúng!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative pb-20">
      
      {/* HEADER */}
      <div className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
         <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800">
               <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
               <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Cài Đặt Hệ Thống</h1>
               <p className="text-xs text-slate-500 font-medium">Quản lý ứng dụng và hệ thống</p>
            </div>
         </div>
         <button 
           onClick={handleSave}
           disabled={isSaving}
           className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50 active:scale-95"
         >
           {isSaving ? "Đang lưu..." : <><Save size={18} /> Lưu Thay Đổi</>}
         </button>
      </div>

      <div className="max-w-5xl mx-auto w-full p-6 space-y-6">
         {/* TABS */}
         <div className="flex bg-white p-1 rounded-xl shadow-sm border border-slate-200 w-fit">
            <button 
              onClick={() => setActiveTab('APPS')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'APPS' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <LinkIcon size={16} /> Ứng Dụng Mở Rộng
            </button>
            <button 
              onClick={() => setActiveTab('SYSTEM')}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'SYSTEM' ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <Calculator size={16} /> Cấu Hình Hệ Thống
            </button>
         </div>

         {/* APPS TAB */}
         {activeTab === 'APPS' && (
           <div className="space-y-8 animate-fade-in">
             <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-blue-800 text-sm flex items-start gap-3">
                <div className="p-1 bg-blue-100 rounded-full"><LinkIcon size={16} /></div>
                <div>
                   <strong>Hướng dẫn:</strong> Tại đây bạn có thể thay đổi đường dẫn (URL) trỏ tới ứng dụng, cập nhật hình ảnh đại diện (URL ảnh) và đổi tên hiển thị. 
                </div>
             </div>
             <div className="grid grid-cols-1 gap-6">
                {editingLinks.map((app) => (
                   <div key={app.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row gap-6 hover:shadow-md transition-shadow">
                      {/* PREVIEW IMAGE */}
                      <div className="w-full md:w-64 flex-shrink-0 flex flex-col gap-2">
                         <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group">
                            <img src={app.imageUrl} alt={app.name} className="w-full h-full object-cover" />
                         </div>
                         <button onClick={() => handleReset(app.id)} className="text-xs flex items-center gap-1 text-slate-400 hover:text-red-500 font-medium justify-center mt-1">
                            <RotateCcw size={12} /> Khôi phục mặc định
                         </button>
                      </div>
                      {/* EDIT FIELDS */}
                      <div className="flex-1 space-y-5">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-xs font-bold text-slate-700">Tên Ứng Dụng</label>
                               <input type="text" value={app.name} onChange={(e) => handleChange(app.id, 'name', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold text-slate-800" />
                            </div>
                            <div className="space-y-1">
                               <label className="text-xs font-bold text-slate-700">Mô tả ngắn</label>
                               <input type="text" value={app.description} onChange={(e) => handleChange(app.id, 'description', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-600" />
                            </div>
                         </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1"><LinkIcon size={12}/> Đường Dẫn (Link URL)</label>
                            <input type="text" value={app.defaultUrl} onChange={(e) => handleChange(app.id, 'defaultUrl', e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-blue-700 bg-slate-50" />
                         </div>
                         <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 flex items-center gap-1"><ImageIcon size={12}/> Đường Dẫn Ảnh (Image URL)</label>
                            <input type="text" value={app.imageUrl} onChange={(e) => handleChange(app.id, 'imageUrl', e.target.value)} className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono text-slate-600 bg-slate-50" />
                         </div>
                      </div>
                   </div>
                ))}
             </div>
           </div>
         )}

         {/* SYSTEM CONFIG TAB */}
         {activeTab === 'SYSTEM' && (
            <div className="max-w-2xl mx-auto animate-fade-in">
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-red-50">
                     <h3 className="text-lg font-black text-red-700 uppercase mb-1 flex items-center gap-2">
                        <Lock size={20} /> CẤU HÌNH HỆ SỐ KPI
                     </h3>
                     <p className="text-sm text-red-600/80">Khu vực dành cho quản trị viên.</p>
                  </div>
                  <div className="p-8">
                     {!isKpiUnlocked ? (
                        <div className="text-center py-8">
                           <div className="mb-6 flex justify-center"><div className="p-4 bg-slate-100 rounded-full text-slate-400"><Lock size={48} /></div></div>
                           <h4 className="text-lg font-bold text-slate-800 mb-2">Đã khóa cấu hình</h4>
                           <div className="flex gap-2 max-w-xs mx-auto">
                              <input type="password" value={kpiPasswordInput} onChange={e => setKpiPasswordInput(e.target.value)} className="flex-1 p-2 border border-slate-300 rounded-lg text-center font-bold tracking-widest focus:outline-none focus:border-red-500" placeholder="****" />
                              <button onClick={handleUnlockKpi} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors"><Unlock size={18} /></button>
                           </div>
                        </div>
                     ) : (
                        <div className="space-y-6 animate-fade-in">
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Hệ số KPI (Global Coefficient)</label>
                              <input type="number" value={kpiConfig.heSoKPI} onChange={e => setKpiConfig({...kpiConfig, heSoKPI: e.target.value})} className="w-full p-4 text-xl font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" step="0.1" />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Chi phí thiết kế cơ bản (VNĐ)</label>
                              <input type="number" value={kpiConfig.chiPhiThietKe} onChange={e => setKpiConfig({...kpiConfig, chiPhiThietKe: e.target.value})} className="w-full p-4 text-xl font-bold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                           </div>
                           <div className="pt-4 border-t border-slate-100 flex justify-end">
                              <button onClick={() => setIsKpiUnlocked(false)} className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center gap-1"><Lock size={14} /> Khóa lại</button>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         )}
      </div>

      <FixedFooter view="APP_SETTINGS" />
    </div>
  );
};

export default AppSettings;
