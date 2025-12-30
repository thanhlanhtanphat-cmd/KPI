
import React, { useState, useEffect } from 'react';
import { Project, StageData, ProjectMetadata } from '../types';
import { STAGES, INITIAL_METADATA } from '../constants';
import { ArrowLeft, Save, CheckSquare, Square, Layout, GitMerge, Clock, Pencil, X, CheckCircle2, User, CheckCheck, Ruler, Coins, Trophy } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import FishboneDiagram from './FishboneDiagram';
import { updateProject } from '../services/api';
import FixedFooter from './FixedFooter';

interface ProjectDetailProps {
  project: Project;
  onBack: () => void;
  onUpdate: (updatedProject: Project) => void;
  teamMembers: string[];
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, onBack, onUpdate, teamMembers }) => {
  const [metadata, setMetadata] = useState<ProjectMetadata>(project.metadata || INITIAL_METADATA);
  const [stageData, setStageData] = useState<StageData>(project.stageData || {});
  const [activeView, setActiveView] = useState<'table' | 'fishbone'>('table');
  const [isSaving, setIsSaving] = useState(false);
  const [totalProgress, setTotalProgress] = useState(0);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>(project.lastUpdated);
  const [isExporting, setIsExporting] = useState(false);
  
  // New state for editable Project Code
  const [editedMaSoDuAn, setEditedMaSoDuAn] = useState(project.maSoDuAn);

  // New state for Global Config (Base Design Cost) - Default 180 if not found
  const [baseDesignCost, setBaseDesignCost] = useState<number>(180);

  useEffect(() => {
    // Sync if project prop updates
    setEditedMaSoDuAn(project.maSoDuAn);
  }, [project]);

  // Load Global Config for KPI Calculation
  useEffect(() => {
    const savedConfig = localStorage.getItem('SYSTEM_KPI_CONFIG');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        const cost = parseFloat(parsed.chiPhiThietKe || '180');
        setBaseDesignCost(isNaN(cost) ? 180 : cost);
      } catch (e) {
        console.error("Failed to load KPI config", e);
        setBaseDesignCost(180);
      }
    } else {
      setBaseDesignCost(180);
    }
  }, []);

  // AUTOMATED KPI CALCULATION EFFECT
  useEffect(() => {
    if (!isEditingMetadata) return;

    // 1. Get Area Values
    const sSuDung = parseFloat(metadata.dienTichSuDung || '0');
    const sSanVuon = parseFloat(metadata.dienTichSanVuon || '0');
    
    // 2. Check validity (Cost must be valid, area can be 0 but at least one should be present logically, though user might delete field)
    if (!isNaN(baseDesignCost) && (!isNaN(sSuDung) || !isNaN(sSanVuon))) {
       // 3. Formula: KPI = (S_SuDung + (S_SanVuon / 5)) * BaseCost
       const cost = baseDesignCost;
       const kpiValue = (sSuDung + (sSanVuon / 5)) * cost;
       
       // 4. Update State (only if changed to prevent loops)
       const newKpiStr = Number.isInteger(kpiValue) ? kpiValue.toString() : kpiValue.toFixed(2);
       
       setMetadata(prev => {
         if (prev.diemKPI === newKpiStr) return prev;
         return { ...prev, diemKPI: newKpiStr };
       });
    }
  }, [metadata.dienTichSuDung, metadata.dienTichSanVuon, baseDesignCost, isEditingMetadata]);

  useEffect(() => {
    const newStageData = { ...stageData };
    let changed = false;
    STAGES.forEach(stage => {
      if (!newStageData[stage.id]) {
        newStageData[stage.id] = {
          owner: '',
          checkedItems: new Array(stage.items.length).fill(false)
        };
        changed = true;
      }
    });
    if (changed) setStageData(newStageData);
  }, []);

  useEffect(() => {
    let progress = 0;
    STAGES.forEach(stage => {
      const data = stageData[stage.id];
      if (data) {
        const checkedCount = data.checkedItems.filter(Boolean).length;
        const totalItems = stage.items.length;
        if (totalItems > 0) {
          const stageCompletion = checkedCount / totalItems;
          progress += stageCompletion * stage.percentage;
        }
      }
    });
    setTotalProgress(Math.min(100, progress));
  }, [stageData]);

  const handleMetadataChange = (field: keyof ProjectMetadata, value: string) => {
    setMetadata(prev => ({ ...prev, [field]: value }));
  };

  const handleStageOwnerChange = (stageId: number, value: string) => {
    setStageData(prev => ({
      ...prev,
      [stageId]: { ...prev[stageId], owner: value }
    }));
  };

  // HELPER: CENTRALIZED IMMEDIATE SAVE
  const performImmediateSave = async (updatedStageData: StageData) => {
    // Optimistic UI Update
    setStageData(updatedStageData);

    // Prepare Update Payload
    let progress = 0;
    STAGES.forEach(stage => {
      const data = updatedStageData[stage.id];
      if (data) {
        const checkedCount = data.checkedItems.filter(Boolean).length;
        const totalItems = stage.items.length;
        if (totalItems > 0) progress += (checkedCount / totalItems) * stage.percentage;
      }
    });
    
    let status = "Đang thực hiện";
    if (progress >= 100) status = "Hoàn thành";
    else if (progress < 50) status = "Cần chú ý";

    const currentTimestamp = new Date().toISOString();
    setLastUpdated(currentTimestamp);

    const updatedProject: Project = {
      ...project,
      maSoDuAn: editedMaSoDuAn,
      tenDuAn: project.tenDuAn, // Keep name unless meta edit
      trangThai: status,
      metadata,
      stageData: updatedStageData,
      lastUpdated: currentTimestamp
    };

    try {
      await updateProject(updatedProject);
      onUpdate(updatedProject); // Sync back to App
    } catch (error) {
      console.error("Auto-save failed", error);
    }
  };

  const handleItemCheck = (stageId: number, itemIndex: number) => {
    setStageData(prev => {
      const currentStage = prev[stageId];
      const newCheckedItems = [...currentStage.checkedItems];
      newCheckedItems[itemIndex] = !newCheckedItems[itemIndex];
      const newData = {
        ...prev,
        [stageId]: { ...currentStage, checkedItems: newCheckedItems }
      };
      
      // TRIGGER IMMEDIATE SAVE
      performImmediateSave(newData);
      
      return newData;
    });
  };

  // NEW: Handle Mark Whole Stage Complete
  const handleMarkStageComplete = (stageId: number) => {
    if (!window.confirm(`Xác nhận hoàn thành toàn bộ Giai đoạn ${stageId}?`)) return;

    setStageData(prev => {
      const stageDef = STAGES.find(s => s.id === stageId);
      if (!stageDef) return prev;
      
      const currentStage = prev[stageId];
      // Create new array filled with true
      const newCheckedItems = new Array(stageDef.items.length).fill(true);
      
      const newData = {
        ...prev,
        [stageId]: { ...currentStage, checkedItems: newCheckedItems }
      };

      // TRIGGER IMMEDIATE SAVE
      performImmediateSave(newData);

      return newData;
    });
  };

  const handleCancelMetadata = () => {
    setMetadata(project.metadata || INITIAL_METADATA);
    setEditedMaSoDuAn(project.maSoDuAn); // Reset code
    setIsEditingMetadata(false);
  };

  const handleSaveMetadata = async () => {
    if (!editedMaSoDuAn.trim()) {
      alert("Mã Số Dự Án không được để trống!");
      return;
    }
    await handleSave();
    setIsEditingMetadata(false);
  };

  const handleMarkAllComplete = async () => {
    if (!window.confirm("Xác nhận hoàn thành toàn bộ 100% các hạng mục của dự án này?")) {
      return;
    }

    const newStageData: StageData = {};
    STAGES.forEach(stage => {
       const existingStage = stageData[stage.id];
       newStageData[stage.id] = {
         owner: existingStage?.owner || "",
         checkedItems: new Array(stage.items.length).fill(true)
       };
    });
    
    setStageData(newStageData);
    setTotalProgress(100);

    setIsSaving(true);
    const currentTimestamp = new Date().toISOString();
    setLastUpdated(currentTimestamp);
    
    let newProjectName = project.tenDuAn;
    if (metadata.chuDauTu && metadata.diaChi) {
      newProjectName = `${metadata.chuDauTu} - ${metadata.diaChi}`;
    } else if (metadata.chuDauTu) {
      newProjectName = `${metadata.chuDauTu}`;
    }

    const updatedProject: Project = {
      ...project,
      maSoDuAn: editedMaSoDuAn, // Save edited code
      tenDuAn: newProjectName,
      trangThai: "Hoàn thành",
      metadata,
      stageData: newStageData,
      lastUpdated: currentTimestamp
    };

    try {
      await updateProject(updatedProject);
      onUpdate(updatedProject);
    } catch (error) {
      console.error(error);
      alert("Lỗi khi lưu dữ liệu.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    let status = "Đang thực hiện";
    if (totalProgress >= 100) status = "Hoàn thành";
    else if (totalProgress < 50) status = "Cần chú ý";

    let newProjectName = project.tenDuAn;
    if (metadata.chuDauTu && metadata.diaChi) {
      newProjectName = `${metadata.chuDauTu} - ${metadata.diaChi}`;
    } else if (metadata.chuDauTu) {
      newProjectName = `${metadata.chuDauTu}`;
    }

    const currentTimestamp = new Date().toISOString();
    setLastUpdated(currentTimestamp);

    const updatedProject: Project = {
      ...project,
      maSoDuAn: editedMaSoDuAn, // Save edited code
      tenDuAn: newProjectName,
      trangThai: status,
      metadata,
      stageData,
      lastUpdated: currentTimestamp
    };

    try {
      await updateProject(updatedProject);
      onUpdate(updatedProject);
    } catch (error) {
      console.error(error);
      alert("Lỗi khi lưu dữ liệu.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPNG = async () => {
    const input = document.getElementById('report-container');
    if (!input) return;
    setIsExporting(true);
    
    const originalStyle = {
      overflow: input.style.overflow,
      height: input.style.height,
      maxHeight: input.style.maxHeight
    };
    
    input.style.overflow = 'visible';
    input.style.height = 'auto';
    input.style.maxHeight = 'none';

    const scrollPos = window.scrollY;
    window.scrollTo(0, 0);

    try {
      const canvas = await html2canvas(input, { 
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        windowHeight: input.scrollHeight + 100
      });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `TanPhat_Report_${metadata.chuDauTu || 'Project'}.png`;
      link.click();
    } catch (e) {
      alert("Lỗi xuất ảnh. Vui lòng thử lại.");
    } finally {
       input.style.overflow = originalStyle.overflow;
       input.style.height = originalStyle.height;
       input.style.maxHeight = originalStyle.maxHeight;
       window.scrollTo(0, scrollPos);
       setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    const input = document.getElementById('report-container');
    if (!input) return;
    setIsExporting(true);

    const originalStyle = {
      width: input.style.width,
      overflow: input.style.overflow,
      height: input.style.height,
      maxHeight: input.style.maxHeight
    };
    
    input.style.width = "1200px";
    input.style.height = "auto";
    input.style.maxHeight = "none";
    input.style.overflow = "visible";
    
    window.scrollTo(0, 0);

    try {
      const canvas = await html2canvas(input, { 
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        windowHeight: input.scrollHeight + 50
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`TanPhat_Report_${metadata.chuDauTu || 'Project'}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Lỗi xuất PDF.");
    } finally {
      input.style.width = originalStyle.width;
      input.style.overflow = originalStyle.overflow;
      input.style.height = originalStyle.height;
      input.style.maxHeight = originalStyle.maxHeight;
      setIsExporting(false);
    }
  };

  const renderStageCard = (stage: typeof STAGES[0]) => {
    const data = stageData[stage.id] || { owner: '', checkedItems: [] };
    const completedItems = data.checkedItems.filter(Boolean).length;
    const stagePercent = (completedItems / stage.items.length) * 100;
    const isComplete = stagePercent === 100;

    return (
      <div key={stage.id} className={`border rounded-lg shadow-sm transition-all duration-300 ${isComplete ? 'border-green-200 bg-green-50/20' : 'border-slate-200 bg-white hover:border-red-200'}`}>
        <div className={`flex flex-row items-center justify-between px-4 py-3 gap-4 rounded-t-lg ${isComplete ? 'bg-green-100/50' : 'bg-slate-50 border-b border-slate-100'}`}>
          <div className="flex items-center gap-3 flex-1 overflow-hidden">
             <span className={`text-xs font-black uppercase tracking-wider px-2 py-1 rounded whitespace-nowrap ${isComplete ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
               GĐ {stage.id}
             </span>
             <h4 className={`font-bold text-lg md:text-xl truncate ${isComplete ? 'text-green-800' : 'text-slate-800'}`}>{stage.title.split(':')[1] || stage.title}</h4>
             
             {/* MASTER CHECKBOX */}
             {!isComplete && (
                <button 
                   onClick={() => handleMarkStageComplete(stage.id)}
                   className="ml-2 p-1.5 hover:bg-green-100 text-slate-400 hover:text-green-600 rounded-full transition-colors"
                   title="Hoàn thành toàn bộ giai đoạn này"
                >
                   <CheckCheck size={18} />
                </button>
             )}
          </div>
          
          <div className="flex items-center gap-3">
             <div className="w-40 hidden md:block">
               <select 
                  value={data.owner}
                  onChange={(e) => handleStageOwnerChange(stage.id, e.target.value)}
                  className="w-full text-sm h-8 px-2 bg-white border-0 focus:ring-1 focus:ring-red-500 rounded outline-none font-medium text-slate-700 cursor-pointer shadow-sm"
               >
                 <option value="">-- Chủ trì --</option>
                 {teamMembers.map(member => (
                   <option key={member} value={member}>{member}</option>
                 ))}
               </select>
            </div>
            <div className={`font-black text-2xl w-16 text-right ${isComplete ? 'text-green-600' : 'text-orange-500'}`}>
              {stagePercent.toFixed(0)}%
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-b-lg">
          <div className="grid grid-cols-1 gap-y-3">
            {stage.items.map((item, idx) => {
              const isChecked = data.checkedItems[idx];
              return (
                <div 
                  key={idx}
                  onClick={() => handleItemCheck(stage.id, idx)}
                  className={`flex items-center gap-3 p-2 cursor-pointer group transition-all rounded hover:bg-slate-50`}
                >
                  <div className={`transition-colors ${isChecked ? 'text-green-600' : 'text-red-500'}`}>
                    {isChecked ? <CheckSquare size={24} /> : <Square size={24} />}
                  </div>
                  <span className={`text-base md:text-lg select-none transition-colors leading-tight ${isChecked ? 'text-slate-400 font-medium line-through' : 'text-slate-700 font-bold'}`}>
                    {item}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20 bg-slate-100 min-h-screen">
      {/* Controls Header */}
      <div className="sticky top-0 z-50 bg-white/90 backdrop-blur-md py-3 border-b border-slate-200 shadow-sm px-4 md:px-8 flex flex-col md:flex-row justify-between items-center gap-4 transition-all">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest">
              Dự Án {project.nam}
            </span>
            <h1 className="text-xl font-bold text-slate-800 truncate max-w-4xl" title={`${project.maSoDuAn} - ${metadata.chuDauTu} - ${metadata.diaChi}`}>
               <span className="font-mono text-red-600 mr-2">[{project.maSoDuAn}]</span>
               {metadata.chuDauTu ? `${metadata.chuDauTu} - ${metadata.diaChi}` : project.tenDuAn}
            </h1>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button 
            onClick={() => setActiveView('table')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeView === 'table' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <Layout size={16} /> Bảng Chi Tiết
          </button>
          <button 
            onClick={() => setActiveView('fishbone')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeView === 'fishbone' ? 'bg-white shadow text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
          >
            <GitMerge size={16} /> Sơ Đồ Quy Trình
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Export Buttons Moved to Footer */}
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 font-bold active:scale-95"
          >
            {isSaving ? "Đang lưu..." : <><Save size={18} /> Lưu Lại</>}
          </button>
        </div>
      </div>

      {/* Report Container */}
      <div className="flex justify-center px-4 md:px-8">
        <div id="report-container" className="bg-white shadow-2xl rounded-none w-full max-w-[1400px] min-h-screen">
          
          <div className="bg-slate-900 text-white p-8 flex justify-between items-end">
            <div>
              <h2 className="text-3xl font-black uppercase tracking-widest leading-none">
                <span className="text-red-600">TÂN PHÁT</span> <span className="text-white">TOTE & BUILDING</span>
              </h2>
              <p className="text-slate-400 text-sm mt-2 font-medium tracking-wide">Luôn luôn đồng hành - Luôn luôn chia sẻ</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-400 font-bold uppercase mb-1">Tiến độ tổng thể</div>
              <div className="flex items-center gap-2 justify-end">
                <button 
                  onClick={handleMarkAllComplete}
                  className="text-slate-400 hover:text-green-500 transition-colors mr-2"
                  title="Hoàn thành 100% Dự án"
                >
                   <CheckCircle2 size={24} />
                </button>
                <div className="h-2 w-32 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: `${totalProgress}%` }}></div>
                </div>
                <div className={`text-3xl font-black ${totalProgress >= 100 ? 'text-green-500' : (totalProgress > 50 ? 'text-orange-500' : 'text-red-500')}`}>
                  {totalProgress.toFixed(0)}%
                </div>
              </div>
            </div>
          </div>

          <div className="p-8">
            <div className="bg-slate-50 border border-slate-200 p-6 mb-8 rounded-lg">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4">
                 <div className="flex items-center gap-4">
                   <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                     <div className="w-1 h-6 bg-red-600"></div> THÔNG TIN DỰ ÁN
                   </h3>
                   <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
                     <Clock size={12} />
                     <span>Cập nhật: {lastUpdated ? new Date(lastUpdated).toLocaleString('vi-VN') : 'Chưa cập nhật'}</span>
                   </div>
                 </div>
                 
                 {!isEditingMetadata ? (
                   <button 
                     onClick={() => setIsEditingMetadata(true)}
                     className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm"
                   >
                     <Pencil size={14} /> Chỉnh sửa
                   </button>
                 ) : (
                   <div className="flex gap-2">
                     <button 
                       onClick={handleCancelMetadata}
                       className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-slate-600 bg-slate-200 rounded hover:bg-slate-300 transition-colors"
                     >
                       <X size={14} /> Hủy
                     </button>
                     <button 
                       onClick={handleSaveMetadata}
                       className="flex items-center gap-1 px-3 py-1.5 text-sm font-bold text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors shadow-sm"
                     >
                       <Save size={14} /> Lưu thông tin
                     </button>
                   </div>
                 )}
              </div>

              {!isEditingMetadata ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-4">
                   <CompactMetaView label="Mã Số Dự Án" value={project.maSoDuAn} className="text-red-600 font-mono" />
                   <CompactMetaView label="Chủ Đầu Tư" value={metadata.chuDauTu} />
                   <CompactMetaView label="Địa điểm" value={metadata.diaChi} />
                   <CompactMetaView label="Ngày Thi Công" value={metadata.ngayThiCong} />
                   <CompactMetaView label="Tổng Chi Phí" value={metadata.tongChiPhi} />
                   
                   <CompactMetaView label="DT Sử dụng (m2)" value={metadata.dienTichSuDung || ''} />
                   <CompactMetaView label="DT Sân vườn (m2)" value={metadata.dienTichSanVuon || ''} />
                   <CompactMetaView label="Điểm KPI Dự án" value={metadata.diemKPI || ''} className="text-blue-600" />
                   <CompactMetaView label="Nguồn Khách" value={metadata.nguonKhachHang} />
                   <CompactMetaView label="Tư Vấn" value={metadata.tuVanChamKhach} />
                   
                   <CompactMetaView label="KTS Chủ Trì" value={metadata.ktsChuTri} />
                   <CompactMetaView label="Nội Thất" value={metadata.noiThatChuTri} />
                   <CompactMetaView label="HS Thi Công" value={metadata.hoSoThiCongChuTri} />
                   <div className="col-span-2"></div>
                   
                   {metadata.thongTinKhac && (
                     <div className="col-span-full mt-2">
                       <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ghi chú</label>
                       <p className="text-sm font-bold text-slate-800 italic">{metadata.thongTinKhac}</p>
                     </div>
                   )}
                </div>
              ) : (
                <div className="animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
                    {/* EDITABLE PROJECT CODE */}
                    <MetaInput 
                      label="Mã Số Dự Án" 
                      value={editedMaSoDuAn} 
                      onChange={setEditedMaSoDuAn} 
                      placeholder="VD: TP2025-001" 
                    />

                    <MetaInput label="Chủ Đầu Tư" value={metadata.chuDauTu} onChange={(v) => handleMetadataChange('chuDauTu', v)} placeholder="Nhập tên CĐT..." />
                    <MetaInput label="Địa chỉ thi công" value={metadata.diaChi} onChange={(v) => handleMetadataChange('diaChi', v)} placeholder="Số nhà, đường, quận..." />
                    <MetaInput label="Nguồn Khách Hàng" value={metadata.nguonKhachHang} onChange={(v) => handleMetadataChange('nguonKhachHang', v)} />
                    <MetaInput label="Tổng Chi Phí Dự Kiến" value={metadata.tongChiPhi} onChange={(v) => handleMetadataChange('tongChiPhi', v)} icon={<Coins size={14}/>} />
                    
                    <MetaInput label="Ngày Trao Đổi" type="date" value={metadata.ngayTraoDoi} onChange={(v) => handleMetadataChange('ngayTraoDoi', v)} />
                    <MetaInput label="Ngày Thi Công" type="date" value={metadata.ngayThiCong} onChange={(v) => handleMetadataChange('ngayThiCong', v)} />
                    
                    <MetaSelect label="Tư Vấn Chăm Khách" value={metadata.tuVanChamKhach} onChange={(v) => handleMetadataChange('tuVanChamKhach', v)} options={teamMembers} />

                    <MetaSelect label="KTS Chủ Trì" value={metadata.ktsChuTri} onChange={(v) => handleMetadataChange('ktsChuTri', v)} options={teamMembers} icon={<User size={14} />} />
                    <MetaSelect label="Nội Thất Chủ Trì" value={metadata.noiThatChuTri} onChange={(v) => handleMetadataChange('noiThatChuTri', v)} options={teamMembers} icon={<User size={14} />} />
                    <MetaSelect label="HS Thi Công Chủ Trì" value={metadata.hoSoThiCongChuTri} onChange={(v) => handleMetadataChange('hoSoThiCongChuTri', v)} options={teamMembers} icon={<User size={14} />} />
                    
                    <div className="col-span-full border-t border-slate-200 pt-4 mt-2"></div>
                    
                    {/* NEW FIELDS */}
                    <MetaInput label="Diện tích sử dụng (m2)" value={metadata.dienTichSuDung || ''} onChange={(v) => handleMetadataChange('dienTichSuDung', v)} icon={<Ruler size={14}/>} placeholder="0" />
                    <MetaInput label="Diện tích Sân vườn (m2)" value={metadata.dienTichSanVuon || ''} onChange={(v) => handleMetadataChange('dienTichSanVuon', v)} icon={<Ruler size={14}/>} placeholder="0" />
                    
                    {/* AUTOMATED KPI FIELD */}
                    <div className="relative">
                       <MetaInput 
                          label="Điểm KPI Dự án (Auto)" 
                          value={metadata.diemKPI || ''} 
                          onChange={(v) => handleMetadataChange('diemKPI', v)} 
                          icon={<Trophy size={14}/>} 
                          placeholder="Auto-calculated" 
                          readOnly={true}
                       />
                       <div className="absolute top-0 right-0">
                          {baseDesignCost > 0 ? (
                             <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Auto Active</span>
                          ) : (
                             <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-bold" title="Cần cấu hình chi phí ở Page 07">No Config</span>
                          )}
                       </div>
                    </div>

                  </div>
                  <div className="mt-6">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Ghi chú bổ sung</label>
                    <textarea 
                      value={metadata.thongTinKhac}
                      onChange={(e) => handleMetadataChange('thongTinKhac', e.target.value)}
                      className="w-full p-3 border border-slate-300 bg-white focus:ring-1 focus:ring-red-500 outline-none text-sm min-h-[80px] rounded"
                      placeholder="Nhập các ghi chú quan trọng về dự án..."
                    />
                  </div>
                </div>
              )}
            </div>

            {activeView === 'fishbone' ? (
              <FishboneDiagram project={{...project, stageData}} totalProgress={totalProgress} />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="flex flex-col gap-8">
                   {STAGES.slice(0, 5).map(stage => renderStageCard(stage))}
                </div>

                <div className="flex flex-col gap-8">
                   {STAGES.slice(5).map(stage => renderStageCard(stage))}
                   
                   <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 text-center">
                      <div className="text-slate-400 font-bold uppercase text-sm mb-2">Trạng thái hoàn thành</div>
                      <div className={`text-4xl font-black ${totalProgress >= 100 ? 'text-green-600' : 'text-slate-700'}`}>
                        {totalProgress.toFixed(0)}%
                      </div>
                   </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="bg-slate-50 p-6 border-t border-slate-200 text-center text-slate-400 text-xs mt-8">
            <p className="font-bold uppercase tracking-widest"><span className="text-red-600">TÂN PHÁT</span> <span className="text-slate-900">TOTE & BUILDING</span></p>
            <p>Generated on {new Date().toLocaleDateString('vi-VN')} at {new Date().toLocaleTimeString('vi-VN')}</p>
          </div>

        </div>
      </div>

      <FixedFooter 
        view="DETAIL" 
        onExportPNG={handleExportPNG} 
        onExportPDF={handleExportPDF} 
        isExporting={isExporting} 
      />
    </div>
  );
};

const MetaInput = ({ label, value, onChange, type = "text", icon, placeholder, readOnly = false }: { label: string, value: string, onChange: (v: string) => void, type?: string, icon?: React.ReactNode, placeholder?: string, readOnly?: boolean }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">{label}</label>
    <div className="relative">
      <input 
        type={type}
        value={value}
        onChange={(e) => !readOnly && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={`w-full p-2 h-10 border-b border-slate-300 bg-transparent outline-none text-base font-bold text-slate-800 transition-colors placeholder-slate-300 ${readOnly ? 'cursor-not-allowed bg-slate-50 text-slate-500' : 'focus:border-red-500'}`}
      />
      {icon && <div className="absolute right-0 top-3 text-slate-400 pointer-events-none">{icon}</div>}
    </div>
  </div>
);

const MetaSelect = ({ label, value, onChange, options, icon }: { label: string, value: string, onChange: (v: string) => void, options: string[], icon?: React.ReactNode }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">{label}</label>
    <div className="relative">
      <select 
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 h-10 border-b border-slate-300 bg-transparent focus:border-red-500 outline-none text-base font-bold text-slate-800 transition-colors cursor-pointer appearance-none"
      >
        <option value="">-- Chọn nhân sự --</option>
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {icon && <div className="absolute right-0 top-3 text-slate-400 pointer-events-none">{icon}</div>}
    </div>
  </div>
);

const CompactMetaView = ({ label, value, className = "text-slate-800" }: { label: string, value: string, className?: string }) => (
  <div className="flex flex-col">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-0.5">{label}</label>
    <div className={`text-sm font-bold leading-tight truncate ${className}`} title={value}>
      {value || <span className="text-slate-300 font-normal">--</span>}
    </div>
  </div>
);

export default ProjectDetail;
