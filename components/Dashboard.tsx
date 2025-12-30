
import React, { useState, useEffect } from 'react';
import { Project, ProjectMetadata } from '../types';
import { YEARS, STAGES, INITIAL_METADATA } from '../constants';
import { PlusCircle, Search, Trash2, Edit, AlertTriangle, MapPin, User, Calendar, LayoutGrid, Grid, Table as TableIcon, Settings, X, Plus, FilePlus, Loader2, Tag, ShieldAlert, Lock, Unlock, Star, HardHat, PenTool } from 'lucide-react';
import { deleteProject, updateProject, createProject } from '../services/api';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import FixedFooter from './FixedFooter';

interface DashboardProps {
  projects: Project[];
  selectedYear: string;
  onYearChange: (year: string) => void;
  onCreate: (projectData?: Partial<Project>) => void;
  onSelectProject: (project: Project) => void;
  onRefresh: () => void;
  onBackToHub: () => void;
  teamMembers: string[];
}

type FilterType = 'ALL' | 'PRIORITY' | 'CONSTRUCTION' | 'DESIGN';
type ViewMode = 'grid' | 'compact' | 'table';

const Dashboard: React.FC<DashboardProps> = ({ 
  projects, 
  selectedYear, 
  onYearChange, 
  onCreate, 
  onSelectProject,
  onRefresh,
  onBackToHub,
  teamMembers
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [securityKey, setSecurityKey] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [localProjects, setLocalProjects] = useState<Project[]>(projects);
  const [isExporting, setIsExporting] = useState(false);
  const [alerts, setAlerts] = useState<{delays: Project[], personnel: {name: string, count: number}[]}>({ delays: [], personnel: [] });
  
  // Bulk Create State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // Secure Delete Mode State
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [isDeleteAuthOpen, setIsDeleteAuthOpen] = useState(false);
  const [deleteAuthPass, setDeleteAuthPass] = useState('');

  // Sync props to local state
  useEffect(() => {
    setLocalProjects(projects);
    generateAlerts(projects);
  }, [projects]);

  const generateAlerts = (data: Project[]) => {
    const now = new Date();
    const delayCandidates = data.filter(p => {
       const progress = calculateProgress(p);
       if (progress >= 70) return false;
       const startDateStr = p.metadata?.ngayTraoDoi || p.metadata?.ngayThiCong;
       if (!startDateStr) return false;
       const startDate = new Date(startDateStr);
       const diffTime = Math.abs(now.getTime() - startDate.getTime());
       const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
       return diffDays > 30;
    });

    const shuffled = [...delayCandidates].sort(() => 0.5 - Math.random());
    const selectedDelays = shuffled.slice(0, 5);

    const personnelCounts: {[name: string]: number} = {};
    data.forEach(p => {
      STAGES.forEach(stage => {
        const stageData = p.stageData?.[stage.id];
        if (stageData && stageData.owner) {
           const unchecked = stageData.checkedItems.filter(item => !item).length;
           if (unchecked > 0) {
             const name = stageData.owner.trim();
             personnelCounts[name] = (personnelCounts[name] || 0) + unchecked;
           }
        }
      });
    });

    const redFlagPersonnel = Object.entries(personnelCounts)
       .filter(([_, count]) => count > 20)
       .map(([name, count]) => ({ name, count }))
       .sort((a, b) => b.count - a.count);

    setAlerts({ delays: selectedDelays, personnel: redFlagPersonnel });
  };

  const handleQuickUpdate = async (project: Project, updates: Partial<ProjectMetadata>) => {
    const updatedProject = {
      ...project,
      metadata: { ...project.metadata, ...updates },
      lastUpdated: new Date().toISOString()
    };
    setLocalProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
    try {
      await updateProject(updatedProject);
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const calculateProgress = (project: Project) => {
    let progress = 0;
    if (!project.stageData) return 0;
    STAGES.forEach(stage => {
      const data = project.stageData[stage.id];
      if (data) {
        const checkedCount = data.checkedItems.filter(Boolean).length;
        const totalItems = stage.items.length;
        if (totalItems > 0) progress += (checkedCount / totalItems) * stage.percentage;
      }
    });
    return Math.min(100, progress);
  };

  const getDisplayName = (project: Project) => {
    if (project.metadata?.chuDauTu && project.metadata?.diaChi) return `${project.metadata.chuDauTu} - ${project.metadata.diaChi}`;
    return project.tenDuAn;
  };

  // --- PROJECT CODE GENERATION ---
  const generateProjectCode = (year: string, offset: number = 1): string => {
    const yearProjects = localProjects.filter(p => p.nam === year);
    let maxSeq = 0;
    yearProjects.forEach(p => {
      if (p.maSoDuAn && p.maSoDuAn.startsWith(`TP${year}-`)) {
        const parts = p.maSoDuAn.split('-');
        if (parts.length === 2) {
          const seq = parseInt(parts[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      }
    });

    const newSeq = maxSeq + offset;
    return `TP${year}-${newSeq.toString().padStart(3, '0')}`;
  };

  // --- CREATE HANDLER ---
  const handleSingleCreate = () => {
    const nextCode = generateProjectCode(selectedYear);
    const tempName = `Dự án mới ${selectedYear}`;
    
    onCreate({
      nam: selectedYear,
      tenDuAn: tempName,
      maSoDuAn: nextCode,
    });
  };

  // --- BULK CREATE LOGIC ---
  const handleBulkSubmit = async () => {
    if (!bulkInput.trim()) return;
    setIsBulkProcessing(true);
    // Updated to 50 items
    const lines = bulkInput.split('\n').filter(line => line.trim() !== '').slice(0, 50);
    try {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split('|').map(s => s.trim());
        const tenDuAn = parts[0];
        const chuDauTu = parts[1] || '';
        const diaChi = parts[2] || '';
        const projectCode = generateProjectCode(selectedYear, i + 1);

        if (tenDuAn) {
          await createProject({
            nam: selectedYear,
            tenDuAn: tenDuAn,
            maSoDuAn: projectCode,
            metadata: {
              ...INITIAL_METADATA,
              chuDauTu: chuDauTu,
              diaChi: diaChi,
              ngayTraoDoi: new Date().toISOString()
            }
          });
        }
      }
      onRefresh();
      setBulkInput('');
      setIsBulkModalOpen(false);
      alert(`Đã tạo thành công ${lines.length} dự án!`);
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra trong quá trình tạo hàng loạt.");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // --- SECURE DELETE MODE LOGIC ---
  const handleEnterDeleteMode = () => {
    setIsDeleteAuthOpen(true);
  };

  const handleConfirmDeleteAuth = () => {
    if (deleteAuthPass === 'TANPHAT') {
      setIsDeleteMode(true);
      setIsDeleteAuthOpen(false);
      setDeleteAuthPass('');
    } else {
      alert("Mật khẩu quản trị không đúng!");
    }
  };

  const handleQuickDelete = async (id: string) => {
    // Optimistic update
    const previousProjects = [...localProjects];
    setLocalProjects(prev => prev.filter(p => p.id !== id));
    
    try {
      // Use internal security key directly since user is authorized in this mode
      await deleteProject(id, "TANPHAT");
    } catch (e) {
      console.error(e);
      alert("Lỗi khi xóa dự án. Đang hoàn tác...");
      setLocalProjects(previousProjects);
    }
  };

  // --- EXPORT LOGIC FOR DASHBOARD ---
  const handleExportPNG = async () => {
    const input = document.getElementById('dashboard-grid-container');
    if (!input) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(input, { 
        scale: 2, 
        useCORS: true,
        backgroundColor: '#0f172a'
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `TanPhat_Dashboard_${selectedYear}.png`;
      link.click();
    } catch (e) {
      alert("Lỗi xuất ảnh dashboard.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    const input = document.getElementById('dashboard-grid-container');
    if (!input) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#0f172a' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`TanPhat_Dashboard_${selectedYear}.pdf`);
    } catch (e) {
      alert("Lỗi xuất PDF dashboard.");
    } finally {
      setIsExporting(false);
    }
  };

  const filteredProjects = localProjects
    .filter(p => p.nam === selectedYear)
    .filter(p => {
      const name = getDisplayName(p).toLowerCase();
      const code = (p.maSoDuAn || '').toLowerCase();
      return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
    })
    .filter(p => {
      if (filterType === 'ALL') return true;
      if (filterType === 'PRIORITY') return p.metadata?.isPriority;
      if (filterType === 'CONSTRUCTION') return p.metadata?.isConstruction;
      if (filterType === 'DESIGN') return !p.metadata?.isConstruction;
      return true;
    })
    .sort((a, b) => {
      const codeA = a.maSoDuAn || '';
      const codeB = b.maSoDuAn || '';
      return codeA.localeCompare(codeB);
    });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await deleteProject(deleteId, securityKey);
      if (res.status === 'success') {
        onRefresh();
        setDeleteId(null);
        setSecurityKey('');
      } else {
        alert("Mã bảo mật không chính xác!");
      }
    } catch (e) {
      alert("Lỗi kết nối!");
    }
  };

  const renderContent = () => {
    if (filteredProjects.length === 0) {
      return (
        <div className="col-span-full text-center py-20 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
          <div className="text-white/50 text-lg">Chưa có dữ liệu dự án cho bộ lọc này.</div>
          <button onClick={() => setFilterType('ALL')} className="mt-4 text-red-400 hover:text-red-300 font-bold underline">Xóa bộ lọc</button>
        </div>
      );
    }

    if (viewMode === 'table') {
      return (
        <div className={`col-span-full bg-white rounded-2xl shadow-lg overflow-hidden ${isDeleteMode ? 'ring-4 ring-red-500' : ''}`}>
          <table className="w-full text-left border-collapse">
             <thead>
               <tr className="bg-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider">
                 <th className="p-4 border-b border-slate-200">Mã Dự Án</th>
                 <th className="p-4 border-b border-slate-200">Dự án / Chủ Đầu Tư</th>
                 <th className="p-4 border-b border-slate-200 hidden md:table-cell">Địa điểm</th>
                 <th className="p-4 border-b border-slate-200 hidden md:table-cell">Khởi công</th>
                 <th className="p-4 border-b border-slate-200">Trạng thái</th>
                 <th className="p-4 border-b border-slate-200 text-center">Tiến độ</th>
                 <th className="p-4 border-b border-slate-200 text-right">Thao tác</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {filteredProjects.map(project => {
                 const progress = calculateProgress(project);
                 const isConstruction = project.metadata?.isConstruction;
                 const startDate = project.metadata?.ngayThiCong || project.metadata?.ngayTraoDoi || '---';

                 return (
                   <tr 
                     key={project.id} 
                     className={`transition-colors cursor-pointer ${isDeleteMode ? 'hover:bg-red-50 cursor-crosshair' : 'hover:bg-slate-50'}`} 
                     onClick={(e) => {
                        e.stopPropagation();
                        if (isDeleteMode) handleQuickDelete(project.id);
                        else onSelectProject(project);
                     }}
                   >
                     <td className="p-4 font-mono font-bold text-red-600 text-sm">{project.maSoDuAn || '---'}</td>
                     <td className="p-4">
                        <div className="font-bold text-slate-800 text-sm">{project.metadata?.chuDauTu || project.tenDuAn}</div>
                        {project.metadata?.isPriority && <span className="inline-flex items-center gap-1 text-[10px] text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded mt-1"><Star size={10} className="fill-yellow-500"/> Nổi bật</span>}
                     </td>
                     <td className="p-4 hidden md:table-cell text-sm text-slate-600">{project.metadata?.diaChi || '---'}</td>
                     <td className="p-4 hidden md:table-cell text-sm text-slate-600">{startDate}</td>
                     <td className="p-4">
                       <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${isConstruction ? 'bg-blue-100 text-blue-700' : 'bg-teal-100 text-teal-700'}`}>
                         {isConstruction ? <HardHat size={12}/> : <PenTool size={12}/>}
                         {isConstruction ? 'Thi Công' : 'Thiết Kế'}
                       </span>
                     </td>
                     <td className="p-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                             <div className={`h-full ${progress >= 100 ? 'bg-green-500' : (progress < 50 ? 'bg-red-500' : 'bg-orange-500')}`} style={{width: `${progress}%`}}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-700">{progress.toFixed(0)}%</span>
                        </div>
                     </td>
                     <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button onClick={(e) => { e.stopPropagation(); onSelectProject(project); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                           <button onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                        </div>
                     </td>
                   </tr>
                 )
               })}
             </tbody>
          </table>
        </div>
      );
    }

    if (viewMode === 'compact') {
      return (
         <div className={`grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 col-span-full ${isDeleteMode ? 'p-4 rounded-xl border-4 border-red-500 bg-red-50/50' : ''}`}>
            {filteredProjects.map(project => {
              const progress = calculateProgress(project);
              const displayName = project.metadata?.chuDauTu || project.tenDuAn;
              let progressBarColor = progress >= 100 ? "bg-green-500" : (progress >= 50 ? "bg-orange-500" : "bg-red-500");
              const isPriority = project.metadata?.isPriority || false;

              return (
                <div 
                  key={project.id} 
                  className={`bg-white rounded-lg p-3 shadow hover:shadow-md transition-all border cursor-pointer group ${isPriority ? 'border-yellow-400' : 'border-slate-100'} ${isDeleteMode ? 'hover:bg-red-100 ring-2 ring-transparent hover:ring-red-500' : ''}`} 
                  onClick={(e) => {
                     e.stopPropagation();
                     if (isDeleteMode) handleQuickDelete(project.id);
                     else onSelectProject(project);
                  }}
                >
                   <div className="flex justify-between items-start mb-2 border-b border-slate-50 pb-1">
                      <span className="text-[10px] font-mono font-bold text-red-600 bg-red-50 px-1 rounded">{project.maSoDuAn || '---'}</span>
                      <span className={`text-[10px] font-black uppercase ${progress >= 100 ? 'text-green-600' : 'text-slate-400'}`}>
                        {progress.toFixed(0)}%
                      </span>
                   </div>
                   <h3 className="font-bold text-slate-800 text-xs line-clamp-2 leading-tight mb-2 h-8" title={getDisplayName(project)}>
                      {displayName}
                   </h3>
                   <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div className={`h-full ${progressBarColor}`} style={{ width: `${progress}%` }}></div>
                   </div>
                   {isDeleteMode && (
                     <div className="absolute inset-0 bg-red-500/10 flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-lg pointer-events-none">
                       <Trash2 size={32} className="text-red-600" />
                     </div>
                   )}
                </div>
              )
            })}
         </div>
      );
    }

    // Grid View
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 col-span-full transition-all ${isDeleteMode ? 'p-6 rounded-2xl border-4 border-red-500 bg-red-50/30' : ''}`}>
        {filteredProjects.map(project => {
            const progress = calculateProgress(project);
            const displayName = getDisplayName(project);
            
            let statusColor = "text-red-500";
            let progressBarColor = "bg-gradient-to-r from-red-500 to-red-600";
            let statusText = "Cần chú ý";
            
            if (progress >= 100) {
              statusColor = "text-green-600";
              progressBarColor = "bg-gradient-to-r from-green-500 to-emerald-600";
              statusText = "Hoàn thành";
            } else if (progress >= 50) {
              statusColor = "text-orange-500";
              progressBarColor = "bg-gradient-to-r from-orange-400 to-orange-600";
              statusText = "Đang chạy";
            }

            const isPriority = project.metadata?.isPriority || false;
            const isConstruction = project.metadata?.isConstruction || false;

            return (
              <div 
                key={project.id} 
                onClick={(e) => {
                  if (isDeleteMode) {
                    e.stopPropagation();
                    handleQuickDelete(project.id);
                  }
                }}
                className={`group bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${isPriority ? 'ring-2 ring-yellow-400' : ''} ${isDeleteMode ? 'cursor-not-allowed opacity-90 hover:opacity-100 hover:ring-4 hover:ring-red-500' : ''}`}
              >
                <div className="h-32 bg-slate-100 relative overflow-hidden">
                  <div className="absolute inset-0 bg-slate-200 animate-pulse"></div>
                  <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '10px 10px'}}></div>
                  
                  {isDeleteMode && (
                    <div className="absolute inset-0 bg-red-600/20 z-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <div className="bg-white p-2 rounded-full shadow-lg">
                          <Trash2 size={32} className="text-red-600" />
                       </div>
                    </div>
                  )}

                  {/* PROJECT CODE BADGE */}
                  <div className="absolute top-3 left-3 z-30">
                     <div className="bg-red-600 text-white font-mono font-bold text-xs px-2 py-1 rounded shadow-md border border-white/20">
                       {project.maSoDuAn || 'NO-CODE'}
                     </div>
                  </div>

                  <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
                     <button 
                        onClick={(e) => { e.stopPropagation(); handleQuickUpdate(project, { isConstruction: !isConstruction }); }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all shadow-sm border ${isConstruction ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-500' : 'bg-teal-500 text-white border-teal-600 hover:bg-teal-400'}`}
                     >
                       {isConstruction ? <HardHat size={12} /> : <PenTool size={12} />}
                       {isConstruction ? "Thi công" : "Thiết kế"}
                     </button>

                     <button 
                        onClick={(e) => { e.stopPropagation(); handleQuickUpdate(project, { isPriority: !isPriority }); }}
                        className={`p-2 rounded-full transition-all shadow-sm backdrop-blur-sm ${isPriority ? 'bg-yellow-100 text-yellow-500 hover:bg-yellow-200' : 'bg-white/80 text-slate-400 hover:text-yellow-400 hover:bg-white'}`}
                     >
                       <Star size={16} className={isPriority ? "fill-yellow-500" : ""} />
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); setDeleteId(project.id); }}
                        className="bg-white/80 hover:bg-red-50 p-2 rounded-full text-slate-400 hover:text-red-500 transition-colors backdrop-blur-sm shadow-sm"
                     >
                       <Trash2 size={16} />
                     </button>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black/60 to-transparent">
                        <div className={`inline-block text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-sm bg-white ${statusColor}`}>
                        {statusText}
                      </div>
                  </div>
                </div>
                
                <div className="p-5">
                  <h3 className="text-lg font-bold text-slate-800 mb-3 line-clamp-2 h-14 leading-snug" title={displayName}>
                    {displayName}
                  </h3>
                  
                  <div className="space-y-2 mb-5">
                      <div className="flex items-start gap-2 text-sm text-slate-500">
                        <User size={14} className="mt-0.5 text-slate-400" />
                        <span className="line-clamp-1">{project.metadata?.chuDauTu || 'Chưa cập nhật CĐT'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm text-slate-500">
                        <MapPin size={14} className="mt-0.5 text-slate-400" />
                        <span className="line-clamp-1">{project.metadata?.diaChi || 'Chưa cập nhật địa chỉ'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-xs text-slate-400 mt-2 pt-2 border-t border-slate-100">
                        <Calendar size={12} className="mt-0.5" />
                        <span>Cập nhật: {new Date(project.lastUpdated).toLocaleDateString('vi-VN')}</span>
                      </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex-1 mr-4">
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-xs font-bold text-slate-400 uppercase">Tiến độ</span>
                        <span className={`text-xl font-black ${statusColor}`}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className={`h-full ${progressBarColor} transition-all duration-1000 ease-out`} 
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={(e) => {
                         if (!isDeleteMode) {
                           e.stopPropagation();
                           onSelectProject(project);
                         }
                      }}
                      className="bg-slate-900 text-white p-3 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-slate-900/20 group-hover:shadow-red-500/30"
                    >
                      <Edit size={18} />
                    </button>
                  </div>
                </div>
              </div>
            )
        })}
      </div>
    );
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-900 overflow-x-hidden pb-16">
      <div 
        className="fixed inset-0 bg-cover bg-center z-0"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1503387762-592deb58ef4e?q=80&w=2071&auto=format&fit=crop")' }}
      ></div>
      <div className="fixed inset-0 bg-slate-900/90 z-0"></div>

      {/* DELETE MODE OVERLAY BANNER */}
      {isDeleteMode && (
        <div className="fixed top-0 left-0 w-full bg-red-600 text-white z-[200] py-3 shadow-lg flex items-center justify-center gap-4 animate-fade-in-down">
           <div className="flex items-center gap-2 font-black uppercase tracking-widest text-sm animate-pulse">
              <ShieldAlert size={20} /> CHẾ ĐỘ XÓA NHANH ĐANG BẬT
           </div>
           <div className="h-4 w-[1px] bg-white/30"></div>
           <p className="text-xs font-medium opacity-90 hidden sm:block">
             Cẩn thận! Nhấp vào dự án sẽ xóa ngay lập tức.
           </p>
           <button 
             onClick={() => setIsDeleteMode(false)}
             className="bg-white text-red-600 px-4 py-1 rounded-full text-xs font-bold hover:bg-red-50 transition-colors shadow-sm ml-4"
           >
             THOÁT CHẾ ĐỘ XÓA
           </button>
        </div>
      )}

      <div className={`relative z-10 max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in ${isDeleteMode ? 'pt-20' : ''}`}>
        
        {/* BRANDING HEADER - VERTICAL STACK */}
        <div className="bg-slate-50/95 backdrop-blur-xl p-4 md:p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 border border-white/50">
          <div className="flex items-center gap-6">
            <button 
               onClick={onBackToHub}
               className="p-3 bg-slate-200 hover:bg-red-600 hover:text-white rounded-xl transition-all shadow-md group"
               title="Quay về Menu"
            >
              <Grid size={20} className="text-slate-600 group-hover:text-white" />
            </button>

            <div className="pl-2 border-l border-slate-300 flex flex-col">
              <h1 className="text-3xl font-black tracking-tight leading-none mb-1">
                <span className="text-red-600">TÂN PHÁT</span> <span className="text-slate-900">TOTE & BUILDING</span>
              </h1>
              <h2 className="text-xs font-medium text-slate-500 italic tracking-wider">Luôn luôn đồng hành - Luôn luôn chia sẻ</h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="text-right hidden md:block px-2">
               <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Người dùng</div>
               <div className="font-bold text-slate-800 text-sm">Quản Trị Viên</div>
             </div>
             <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg ring-2 ring-white">
               TP
             </div>
          </div>
        </div>

        {/* ALERTS */}
        {(alerts.delays.length > 0 || alerts.personnel.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-red-50/90 backdrop-blur-md rounded-2xl p-5 border border-red-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                   <div className="p-2 bg-red-100 rounded-full text-red-600"><AlertTriangle size={18} /></div>
                   <h3 className="font-bold text-slate-800 text-sm uppercase">Cảnh Báo Chậm Tiến Độ</h3>
                </div>
                {alerts.delays.length > 0 ? (
                  <ul className="space-y-2">
                     {alerts.delays.map(p => (
                       <li key={p.id} className="flex justify-between items-center bg-white p-2 rounded border border-red-100">
                          <span className="text-xs font-bold text-slate-700 truncate max-w-[70%]">{p.metadata?.chuDauTu || p.tenDuAn}</span>
                          <span className="text-xs font-black text-red-500">{calculateProgress(p).toFixed(0)}%</span>
                       </li>
                     ))}
                  </ul>
                ) : (
                  <p className="text-xs text-slate-500 italic">Hiện tại không có dự án nào trễ hạn.</p>
                )}
             </div>

             <div className="bg-orange-50/90 backdrop-blur-md rounded-2xl p-5 border border-orange-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                   <div className="p-2 bg-orange-100 rounded-full text-orange-600"><User size={18} /></div>
                   <h3 className="font-bold text-slate-800 text-sm uppercase">Nhân Sự Tồn Đọng {'>'} 20 mục</h3>
                </div>
                {alerts.personnel.length > 0 ? (
                   <ul className="space-y-2">
                      {alerts.personnel.slice(0, 3).map((person, idx) => (
                        <li key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-orange-100">
                           <span className="text-xs font-bold text-slate-700">{person.name}</span>
                           <span className="text-xs font-black text-orange-600">{person.count} mục</span>
                        </li>
                      ))}
                   </ul>
                ) : (
                   <p className="text-xs text-slate-500 italic">Nhân sự đang xử lý công việc tốt.</p>
                )}
             </div>
          </div>
        )}

        {/* CONTROLS */}
        <div className="bg-white/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/50 flex flex-col lg:flex-row justify-between gap-4 sticky top-4 z-50">
          <div className="flex bg-slate-100 p-1.5 rounded-xl overflow-x-auto shadow-inner">
            {YEARS.map(year => (
              <button
                key={year}
                onClick={() => onYearChange(year)}
                className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedYear === year ? 'bg-white shadow text-red-600 ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {year}
              </button>
            ))}
          </div>

          <div className="flex flex-1 gap-2 flex-col sm:flex-row">
            <div className="relative flex-1 group min-w-[200px]">
              <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4 group-focus-within:text-blue-500" />
              <input 
                type="text" 
                placeholder="Tìm dự án..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm bg-slate-50 focus:bg-white transition-all"
              />
            </div>
            
            <div className="relative group min-w-[150px]">
              <div className="absolute left-3 top-3 pointer-events-none">
                 <Settings size={16} className="text-slate-500" />
              </div>
              <select 
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                className="w-full pl-10 pr-8 py-2.5 border border-slate-200 rounded-xl appearance-none bg-slate-50 focus:bg-white focus:ring-2 focus:ring-red-500 outline-none text-sm font-bold text-slate-700 cursor-pointer"
              >
                <option value="ALL">Tất cả dự án</option>
                <option value="PRIORITY">★ Nổi bật</option>
                <option value="CONSTRUCTION">⚒ Thi công</option>
                <option value="DESIGN">✎ Thiết kế</option>
              </select>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
               <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Grid View">
                 <LayoutGrid size={18} />
               </button>
               <button onClick={() => setViewMode('compact')} className={`p-2 rounded-lg transition-all ${viewMode === 'compact' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Compact View">
                 <Grid size={18} />
               </button>
               <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`} title="Table View">
                 <TableIcon size={18} />
               </button>
            </div>

            <button 
              onClick={handleSingleCreate}
              className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
            >
              <PlusCircle size={16} /> <span className="hidden sm:inline">Tạo</span>
            </button>
          </div>
        </div>

        <div id="dashboard-grid-container" className="rounded-xl overflow-hidden min-h-[500px]">
          {renderContent()}
        </div>
        
        {/* Bulk Actions - Bottom Area */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 pb-8">
           <button 
             onClick={() => setIsBulkModalOpen(true)}
             className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all hover:-translate-y-1"
           >
             <FilePlus size={18} /> Tạo 50 Dự Án Nhanh
           </button>
           
           <button 
             onClick={handleEnterDeleteMode}
             className="flex items-center gap-2 bg-red-600/80 hover:bg-red-600 backdrop-blur-md border border-red-500/50 text-white px-6 py-3 rounded-full font-bold shadow-lg transition-all hover:-translate-y-1"
           >
             <Trash2 size={18} /> Xóa Dự Án Nhanh
           </button>
        </div>

      </div>

      {deleteId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-scale-in border border-slate-200">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-600 mb-4 shadow-inner">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800">Xóa Dự Án?</h3>
              <p className="text-sm text-slate-500 mt-2">Hành động này sẽ xóa vĩnh viễn dữ liệu và không thể khôi phục.</p>
            </div>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">Nhập mã bảo mật (TANPHAT)</label>
              <input 
                type="password" 
                value={securityKey}
                onChange={e => setSecurityKey(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl p-3 text-center tracking-[0.5em] font-bold text-lg focus:border-red-500 focus:outline-none transition-colors"
                placeholder="******"
              />
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => { setDeleteId(null); setSecurityKey(''); }}
                className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy bỏ
              </button>
              <button 
                onClick={handleDelete}
                className="flex-1 py-3 bg-red-600 text-white font-bold hover:bg-red-700 rounded-xl shadow-lg shadow-red-500/30 transition-colors"
              >
                Xác nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* BULK CREATE MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-scale-in flex flex-col max-h-[85vh]">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <FilePlus size={24} className="text-blue-600" /> Nhập Dữ Liệu Hàng Loạt
                </h3>
                {!isBulkProcessing && (
                  <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X size={24} />
                  </button>
                )}
             </div>
             
             <div className="p-6 flex-1 flex flex-col overflow-hidden">
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-4 text-sm text-blue-800">
                  <p className="font-bold mb-1">Định dạng nhập liệu (Mỗi dòng một dự án):</p>
                  <code className="bg-white px-2 py-1 rounded border border-blue-200 block mt-1 font-mono text-xs">
                    Tên Dự Án | Chủ Đầu Tư | Địa Chỉ
                  </code>
                  <p className="mt-2 text-xs opacity-75">Ví dụ: Biệt thự Anh Hùng | Mr. Hùng | Quận 7</p>
                  <p className="mt-1 text-xs opacity-75">* Tối đa 50 dòng. Năm dự án sẽ là {selectedYear}.</p>
                </div>
                
                <textarea 
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  disabled={isBulkProcessing}
                  placeholder="Paste danh sách dự án tại đây..."
                  className="w-full flex-1 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm resize-none leading-relaxed"
                />
             </div>

             <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
                <button 
                  onClick={() => setIsBulkModalOpen(false)}
                  disabled={isBulkProcessing}
                  className="px-5 py-3 text-slate-500 font-bold hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button 
                  onClick={handleBulkSubmit}
                  disabled={isBulkProcessing || !bulkInput.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBulkProcessing ? (
                    <><Loader2 size={18} className="animate-spin" /> Đang xử lý...</>
                  ) : (
                    <><PlusCircle size={18} /> Tạo Dự Án</>
                  )}
                </button>
             </div>
          </div>
        </div>
      )}

      {/* SECURE DELETE AUTH MODAL */}
      {isDeleteAuthOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[210] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in border border-slate-200">
             <div className="p-6 flex flex-col items-center text-center">
               <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <Lock size={32} />
               </div>
               <h3 className="text-xl font-black text-slate-800 uppercase mb-2">Xác Thực Quản Trị</h3>
               <p className="text-sm text-slate-500 mb-6">Vui lòng nhập mật khẩu quản trị để kích hoạt chế độ Xóa Nhanh.</p>
               
               <input 
                  type="password" 
                  value={deleteAuthPass} 
                  onChange={(e) => setDeleteAuthPass(e.target.value)} 
                  className="w-full text-center text-xl font-bold tracking-widest p-3 border-2 border-slate-200 rounded-xl focus:border-red-500 focus:outline-none mb-6"
                  placeholder="********"
               />

               <div className="flex gap-3 w-full">
                  <button 
                    onClick={() => { setIsDeleteAuthOpen(false); setDeleteAuthPass(''); }}
                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    onClick={handleConfirmDeleteAuth}
                    className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/30 transition-colors"
                  >
                    <Unlock size={18} className="inline mr-2" /> Mở khóa
                  </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* FIXED FOOTER */}
      <FixedFooter 
        view="PROJECT_DASHBOARD" 
        onExportPNG={handleExportPNG} 
        onExportPDF={handleExportPDF} 
        isExporting={isExporting} 
      />

    </div>
  );
};

export default Dashboard;
