

import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { STAGES } from '../constants';
import { ArrowLeft, Save, CalendarDays, Search, CheckCircle2, Tag, Filter } from 'lucide-react';
import FixedFooter from './FixedFooter';

interface MonthlyPlanListProps {
  projects: Project[];
  onBack: () => void;
  onSaveScope: () => void; // Callback to signal App to refresh or navigate
}

const MonthlyPlanList: React.FC<MonthlyPlanListProps> = ({ projects, onBack, onSaveScope }) => {
  // Store selected task keys: "projectId::stageId::itemIndex"
  const [selectedTaskKeys, setSelectedTaskKeys] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Time Filtering State
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Generate Year Options based on available projects + future
  const currentYearNum = new Date().getFullYear();
  const yearOptions = Array.from({length: 5}, (_, i) => (currentYearNum - 1 + i).toString());

  useEffect(() => {
    // Load previously selected tasks from LocalStorage
    const savedKeys = localStorage.getItem('TANPHAT_MONTHLY_TASK_KEYS');
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys);
        if (Array.isArray(parsed)) {
           setSelectedTaskKeys(new Set(parsed));
        }
      } catch (e) {
        console.error("Failed to load monthly tasks", e);
      }
    }
  }, []);

  const calculateProgress = (project: Project) => {
    let progress = 0;
    if (!project.stageData) return 0;
    STAGES.forEach(stage => {
      const data = project.stageData[stage.id];
      if (data && data.checkedItems) {
        const checkedCount = data.checkedItems.filter(Boolean).length;
        const totalItems = stage.items.length;
        if (totalItems > 0) progress += (checkedCount / totalItems) * stage.percentage;
      }
    });
    return Math.min(100, progress);
  };

  const toggleTask = (key: string) => {
    const newSet = new Set(selectedTaskKeys);
    if (newSet.has(key)) {
       newSet.delete(key);
    } else {
       newSet.add(key);
    }
    setSelectedTaskKeys(newSet);
  };

  const handleSave = () => {
    setIsSaving(true);
    // Persist to LocalStorage
    localStorage.setItem('TANPHAT_MONTHLY_TASK_KEYS', JSON.stringify(Array.from(selectedTaskKeys)));
    
    setTimeout(() => {
      setIsSaving(false);
      onSaveScope(); // Signal completion
    }, 500);
  };

  // Filter Projects: Only show Incomplete ones (<100%) that match search AND Selected Year
  const incompleteProjects = projects.filter(p => {
    const progress = calculateProgress(p);
    const matchesSearch = (p.metadata?.chuDauTu || p.tenDuAn).toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.maSoDuAn || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = p.nam === selectedYear;
    return progress < 100 && matchesSearch && matchesYear;
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col relative pb-20 overflow-x-hidden">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-col xl:flex-row items-center justify-between gap-4 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-3 w-full xl:w-auto">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800">
             <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
             <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                <CalendarDays className="text-purple-600" size={20} /> DANH SÁCH CÔNG VIỆC THÁNG {selectedMonth}
             </h1>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-3 w-full xl:w-auto">
          
          {/* Time Controls */}
          <div className="flex items-center bg-slate-50 p-1 rounded-lg border border-slate-200 gap-1">
             <div className="flex items-center px-1">
                <select 
                  value={selectedYear} 
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                >
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
             </div>
             <div className="w-[1px] h-3 bg-slate-300"></div>
             <div className="flex items-center px-1">
                <select 
                  value={selectedMonth} 
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-transparent text-xs font-bold text-purple-600 outline-none cursor-pointer"
                >
                  {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>T{m}</option>
                  ))}
                </select>
             </div>
          </div>

          <div className="relative flex-1 md:w-48 w-full">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm dự án..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50 active:scale-95 whitespace-nowrap w-full md:w-auto justify-center text-xs"
          >
            {isSaving ? "Đang lưu..." : <><Save size={14} /> Lưu & Lên Kế Hoạch</>}
          </button>
        </div>
      </div>

      {/* MATRIX VIEW CONTENT */}
      {/* CRITICAL UPDATE: Table Layout Fixed for 1 Screen Fit */}
      <div className="flex-1 overflow-hidden p-2 bg-slate-100 flex flex-col">
        <div className="flex-1 border border-slate-300 rounded-lg bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1">
              <table className="w-full table-fixed divide-y divide-slate-300">
                 <thead className="bg-slate-50 sticky top-0 z-20">
                    <tr>
                       {/* Project Column: 15% Width */}
                       <th scope="col" className="w-[15%] py-2 pl-2 pr-1 text-left text-[10px] font-bold uppercase text-slate-500 bg-slate-50 border-r border-slate-200 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] truncate">
                          Dự Án ({selectedYear})
                       </th>
                       {/* 9 Stages: ~9.4% Width each */}
                       {STAGES.map(stage => (
                          <th key={stage.id} scope="col" className="w-[9.4%] px-1 py-2 text-center text-[9px] font-bold uppercase text-slate-500 bg-slate-50 border-r border-slate-200 leading-tight">
                             GĐ {stage.id}
                             <div className="text-[8px] font-normal opacity-70 truncate hidden xl:block">
                               {stage.title.split(':')[1]?.trim() || stage.title}
                             </div>
                          </th>
                       ))}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-200 bg-white">
                    {incompleteProjects.length === 0 ? (
                       <tr>
                          <td colSpan={10} className="p-10 text-center text-slate-400 font-medium">
                             <div className="flex flex-col items-center gap-2">
                                <Filter size={32} className="opacity-20" />
                                <span>Không tìm thấy dự án nào trong năm {selectedYear} phù hợp với bộ lọc.</span>
                             </div>
                          </td>
                       </tr>
                    ) : (
                       incompleteProjects.map(project => (
                          <tr key={project.id} className="hover:bg-slate-50/50 transition-colors">
                             {/* Project Column */}
                             <td className="py-2 pl-2 pr-1 border-r border-slate-200 bg-white group-hover:bg-slate-50 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] align-top overflow-hidden">
                                <div className="font-mono text-[9px] font-bold text-slate-500 mb-0.5">
                                   {project.maSoDuAn || '---'}
                                </div>
                                <div className="font-bold text-slate-900 mb-0.5 text-[10px] leading-tight truncate" title={project.metadata?.chuDauTu || project.tenDuAn}>
                                   {project.metadata?.chuDauTu || project.tenDuAn}
                                </div>
                                <div className="text-[9px] text-slate-500 leading-tight truncate" title={project.metadata?.diaChi}>
                                   {project.metadata?.diaChi}
                                </div>
                                <div className="mt-1 text-[8px] font-medium text-purple-600 bg-purple-50 inline-block px-1 rounded">
                                   {calculateProgress(project).toFixed(0)}%
                                </div>
                             </td>

                             {/* Stage Columns */}
                             {STAGES.map(stage => {
                                const stageData = project.stageData?.[stage.id];
                                if (!stageData) return <td key={stage.id} className="border-r border-slate-100 bg-slate-50/30"></td>;

                                // Filter incomplete tasks
                                const incompleteTasks = stage.items.map((item, idx) => ({ item, idx }))
                                   .filter(({ idx }) => !stageData.checkedItems[idx]);

                                // Queue Logic: Show max 3 for compact view
                                const visibleTasks = incompleteTasks.slice(0, 3);
                                const isStageComplete = incompleteTasks.length === 0;

                                return (
                                   <td key={stage.id} className={`px-1 py-1 border-r border-slate-100 align-top ${isStageComplete ? 'bg-green-50/10' : ''}`}>
                                      {isStageComplete ? (
                                         <div className="flex justify-center items-center h-full opacity-20 py-2">
                                            <CheckCircle2 size={16} className="text-green-500" />
                                         </div>
                                      ) : (
                                         <div className="flex flex-col gap-1">
                                            {visibleTasks.map(({ item, idx }) => {
                                               const key = `${project.id}::${stage.id}::${idx}`;
                                               const isSelected = selectedTaskKeys.has(key);
                                               
                                               return (
                                                  <button
                                                     key={key}
                                                     onClick={() => toggleTask(key)}
                                                     title={item}
                                                     className={`text-left text-[9px] p-1 rounded border transition-all shadow-sm leading-tight flex items-start gap-1 w-full overflow-hidden ${
                                                        isSelected 
                                                           ? 'bg-blue-600 text-white border-blue-700 shadow-md ring-1 ring-blue-500' 
                                                           : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                                                     }`}
                                                  >
                                                     <Tag size={8} className={`mt-0.5 flex-shrink-0 ${isSelected ? 'text-blue-200' : 'text-slate-300'}`} />
                                                     <span className="truncate">{item}</span>
                                                  </button>
                                               );
                                            })}
                                            
                                            {incompleteTasks.length > 3 && (
                                               <div className="text-[8px] font-bold text-slate-400 text-center italic">
                                                  +{incompleteTasks.length - 3} more...
                                               </div>
                                            )}
                                         </div>
                                      )}
                                   </td>
                                );
                             })}
                          </tr>
                       ))
                    )}
                 </tbody>
              </table>
          </div>
        </div>
      </div>
      
      <FixedFooter view="MONTHLY_PLAN" />
    </div>
  );
};

export default MonthlyPlanList;
