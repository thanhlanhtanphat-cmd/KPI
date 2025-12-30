import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Calendar, Plus, LayoutList, BarChart3, X, Save, Star, Search, ChevronDown, CheckCircle2, Circle, Clock, Download, FileText, PenSquare, Layers, Briefcase, CalendarDays, Pen, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import FixedFooter from './FixedFooter';
import { Project, PlanningEntry, StageDefinition } from '../types';
import { fetchPlanning, createPlanningEntry, updatePlanningEntry, updatePlanningKPI, updateProject, deletePlanningEntry } from '../services/api';
import { STAGES } from '../constants';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface PlanningProps {
  onBack: () => void;
  projects: Project[];
  teamMembers: string[];
  onUpdateProject: (project: Project) => void;
  onNavigateToMonthly: () => void;
}

// --- REUSABLE SEARCHABLE SELECT COMPONENT ---
interface Option {
  label: string;
  value: string;
  subLabel?: string;
}

const SearchableSelect: React.FC<{
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}> = ({ options, value, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (opt.subLabel && opt.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={wrapperRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 border border-slate-300 rounded-lg bg-white flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-blue-500"
      >
        <div className="truncate text-sm font-bold text-slate-700">
          {selectedOption ? (
            <span className="flex flex-col leading-tight">
              <span>{selectedOption.label}</span>
              {selectedOption.subLabel && <span className="text-[10px] text-slate-400 font-normal">{selectedOption.subLabel}</span>}
            </span>
          ) : (
            <span className="text-slate-400 font-normal">{placeholder}</span>
          )}
        </div>
        <ChevronDown size={16} className="text-slate-400" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-fade-in">
          <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
             <div className="relative">
               <Search size={14} className="absolute left-2 top-2.5 text-slate-400" />
               <input 
                 type="text" 
                 autoFocus
                 placeholder="Tìm kiếm..." 
                 className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
          </div>
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <div 
                key={opt.value} 
                onClick={() => { onChange(opt.value); setIsOpen(false); setSearchTerm(''); }}
                className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
              >
                 <div className="text-sm font-bold text-slate-700">{opt.label}</div>
                 {opt.subLabel && <div className="text-xs text-slate-400">{opt.subLabel}</div>}
              </div>
            ))
          ) : (
            <div className="p-3 text-xs text-slate-400 text-center">Không tìm thấy kết quả</div>
          )}
        </div>
      )}
    </div>
  );
};

// --- DATE HELPERS ---
const getWeekNumber = (d: Date) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return weekNo;
};

const getStartDateFromWeek = (year: number, week: number) => {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const day = simple.getDay();
  const diff = simple.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(simple.setDate(diff));
};

const Planning: React.FC<PlanningProps> = ({ onBack, projects, teamMembers, onUpdateProject, onNavigateToMonthly }) => {
  const [plans, setPlans] = useState<PlanningEntry[]>([]);
  
  // MULTI-USER SELECTION STATE
  const [selectedMembers, setSelectedMembers] = useState<string[]>(teamMembers);
  
  // MONTHLY SCOPE STATE
  const [selectedTaskKeys, setSelectedTaskKeys] = useState<Set<string>>(new Set());

  // TIME FILTER STATE
  const now = new Date();
  const [currentYear, setCurrentYear] = useState<number>(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(now.getMonth() + 1);
  const [currentWeek, setCurrentWeek] = useState<number>(getWeekNumber(now));
  
  // VIEW MODE: Updated to include CALENDAR
  const [viewMode, setViewMode] = useState<'LIST' | 'GANTT' | 'CALENDAR'>('GANTT');
  const [viewGrouping, setViewGrouping] = useState<'STAFF' | 'PROJECT'>('STAFF');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Editing State
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);

  // Derived Date Range based on Week/Year
  const startOfWeek = getStartDateFromWeek(currentYear, currentWeek);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  // Reset time for comparisons
  startOfWeek.setHours(0,0,0,0);
  endOfWeek.setHours(23,59,59,999);

  // Plan Form State
  const [planForm, setPlanForm] = useState<Partial<PlanningEntry>>({
    assignedTo: "",
    startTime: new Date().toISOString().slice(0, 10),
    endTime: new Date().toISOString().slice(0, 10),
    status: 'PLANNED',
    stageIndex: 1,
    taskType: "",
    detailedTask: "" 
  });

  // KPI Review State
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [kpiScore, setKpiScore] = useState<number>(5);
  const [kpiComment, setKpiComment] = useState('');

  useEffect(() => {
    loadPlanningData();
    const savedKeys = localStorage.getItem('TANPHAT_MONTHLY_TASK_KEYS');
    if (savedKeys) {
      try {
        const parsed = JSON.parse(savedKeys);
        if (Array.isArray(parsed)) setSelectedTaskKeys(new Set(parsed));
      } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    if (selectedMembers.length !== 1 && viewMode === 'CALENDAR') {
      setViewMode('GANTT');
    }
  }, [selectedMembers, viewMode]);


  // --- HELPER: GET SCHEDULED TASKS (STRICT) ---
  const getScheduledSignatures = (excludePlanId: string | null = null) => {
    const signatures = new Set<string>();
    plans.forEach(p => {
      if (excludePlanId && p.planId === excludePlanId) return;
      signatures.add(`${p.projectId}::${p.stageIndex}::${p.taskType}`);
    });
    return signatures;
  };

  const loadPlanningData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchPlanning();
      setPlans(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMember = (member: string) => {
    if (selectedMembers.includes(member)) {
      if (selectedMembers.length > 1) {
         setSelectedMembers(prev => prev.filter(m => m !== member));
      }
    } else {
      setSelectedMembers(prev => [...prev, member]);
    }
  };

  const handleYearChange = (y: number) => { 
      setCurrentYear(y); 
  };

  const handleMonthChange = (m: number) => { 
      setCurrentMonth(m); 
      const firstDay = new Date(currentYear, m - 1, 1);
      const week = getWeekNumber(firstDay);
      setCurrentWeek(week);
  };

  const handleWeekChange = (w: number) => {
      setCurrentWeek(w);
      const d = getStartDateFromWeek(currentYear, w);
      setCurrentMonth(d.getMonth() + 1);
  };

  // --- CALENDAR GENERATOR (WEEK-ROW BASED) ---
  const getCalendarWeeks = (year: number, month: number) => {
      const firstDayOfMonth = new Date(year, month - 1, 1);
      let startDay = firstDayOfMonth.getDay(); 
      if (startDay === 0) startDay = 7; 

      const startDate = new Date(firstDayOfMonth);
      startDate.setDate(startDate.getDate() - (startDay - 1));

      const weeks = [];
      for (let i = 0; i < 6; i++) {
          const weekDays = [];
          for(let j=0; j<7; j++) {
             const d = new Date(startDate);
             d.setDate(startDate.getDate() + (i * 7) + j);
             d.setHours(0,0,0,0);
             weekDays.push({
               date: d,
               isCurrentMonth: d.getMonth() === (month - 1)
             });
          }
          weeks.push(weekDays);
      }
      return weeks;
  };

  // --- STRICT AVAILABILITY CHECK ---
  const isTaskAvailable = (projectId: string, stageId: number, item: string, itemIdx: number) => {
      // 1. Is it completed in Project Data?
      const project = projects.find(p => p.id === projectId);
      const isCompleted = project?.stageData?.[stageId]?.checkedItems?.[itemIdx] === true;
      if (isCompleted) return false;

      // 2. Is it scheduled?
      const scheduledSigs = getScheduledSignatures(editingPlanId);
      const sig = `${projectId}::${stageId}::${item}`;
      if (scheduledSigs.has(sig)) return false;

      return true;
  };

  const getStageRedCount = (projectId: string, stageId: number) => {
      const project = projects.find(p => p.id === projectId);
      if (!project || !project.stageData || !project.stageData[stageId]) return 0;

      const stageDef = STAGES.find(s => s.id === stageId);
      if (!stageDef) return 0;

      let count = 0;
      stageDef.items.forEach((item, idx) => {
           // Tag Check
           const tagKey = `${projectId}::${stageId}::${idx}`;
           if (!selectedTaskKeys.has(tagKey)) return;

           // Availability Check (Not done & Not scheduled)
           if (isTaskAvailable(projectId, stageId, item, idx)) {
              count++;
           }
      });
      return count;
  };

  const getProjectUnscheduledCount = (project: Project) => {
      let total = 0;
      STAGES.forEach(stage => {
          total += getStageRedCount(project.id, stage.id) || 0;
      });
      return total;
  };

  const handleOpenCreateModal = (specificDate?: Date) => {
    setEditingPlanId(null);
    const dateStr = specificDate ? specificDate.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    
    setPlanForm({
      assignedTo: selectedMembers.length === 1 ? selectedMembers[0] : "",
      startTime: dateStr, 
      endTime: dateStr,   
      status: 'PLANNED',
      stageIndex: 1,
      taskType: "",
      detailedTask: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: PlanningEntry) => {
    setEditingPlanId(plan.planId);
    setPlanForm({
      ...plan,
      startTime: plan.startTime.slice(0, 10),
      endTime: plan.endTime.slice(0, 10)
    });
    setIsModalOpen(true);
  };

  const handleProjectSelect = (projectId: string) => {
     const p = projects.find(proj => proj.id === projectId);
     let defaultStage = 1;
     for (const s of STAGES) {
        if (getStageRedCount(projectId, s.id) > 0) {
           defaultStage = s.id;
           break;
        }
     }
     setPlanForm({
        ...planForm, 
        projectId, 
        maSoDuAn: p?.maSoDuAn,
        stageIndex: defaultStage,
        taskType: "" 
     });
  };

  const handleStageChange = (newStageIndex: number) => {
    setPlanForm({
      ...planForm,
      stageIndex: newStageIndex,
      taskType: ""
    });
  };

  // --- GET FILTERED OPTIONS FOR DROPDOWN ---
  const getTaskOptionsForStage = (projectId: string | undefined, stageIndex: number | undefined) => {
    if (!projectId || !stageIndex) return [];
    const p = projects.find(proj => proj.id === projectId);
    if (!p) return [];

    const stageDef = STAGES.find(s => s.id === stageIndex);
    if (!stageDef) return [];

    // STRICT FILTER: Only return available items + currently selected item (if editing)
    return stageDef.items.map((item, idx) => {
       const key = `${projectId}::${stageIndex}::${idx}`;
       const isTagged = selectedTaskKeys.has(key);
       const isAvailable = isTaskAvailable(projectId, stageIndex, item, idx);
       
       // If it's the current value in form, always allow it
       if (item === planForm.taskType) {
          return { item, isDisabled: false, className: "font-bold text-slate-800" };
       }

       if (!isAvailable) return null; // HIDE UNAVAILABLE

       let className = "text-slate-700";
       if (isTagged) className = "text-red-600 font-bold bg-white";

       return { item, isDisabled: false, className };
    }).filter(opt => opt !== null) as { item: string, isDisabled: boolean, className: string }[];
  };

  const syncProjectCompletion = async (projId: string, stgIdx: number, taskName: string) => {
     const project = projects.find(p => p.id === projId);
     if (!project) return;

     const stageDef = STAGES.find(s => s.id === stgIdx);
     if (!stageDef) return;
     const taskIdx = stageDef.items.indexOf(taskName);
     if (taskIdx === -1) return;

     const currentStageData = project.stageData[stgIdx] || { owner: '', checkedItems: new Array(stageDef.items.length).fill(false) };
     if (currentStageData.checkedItems[taskIdx]) return; 

     const newCheckedItems = [...currentStageData.checkedItems];
     newCheckedItems[taskIdx] = true;

     const updatedProject = {
       ...project,
       stageData: {
         ...project.stageData,
         [stgIdx]: {
           ...currentStageData,
           checkedItems: newCheckedItems
         }
       },
       lastUpdated: new Date().toISOString()
     };

     await updateProject(updatedProject);
     onUpdateProject(updatedProject);
  };

  const handleSavePlan = async () => {
    if (!planForm.projectId || !planForm.assignedTo || !planForm.endTime || !planForm.taskType) {
      alert("Vui lòng nhập đầy đủ thông tin bắt buộc!");
      return;
    }

    const selectedProject = projects.find(p => p.id === planForm.projectId);
    const code = selectedProject?.maSoDuAn || '???';

    setIsLoading(true);

    if (editingPlanId) {
      const updatedEntry: PlanningEntry = {
        ...planForm as PlanningEntry,
        planId: editingPlanId,
        maSoDuAn: code,
        startTime: planForm.startTime!.includes('T') ? planForm.startTime! : `${planForm.startTime}T08:00`,
        endTime: planForm.endTime!.includes('T') ? planForm.endTime! : `${planForm.endTime}T17:00`,
      };
      await updatePlanningEntry(updatedEntry);
    } else {
      const newEntry: PlanningEntry = {
        planId: `PLAN-${Date.now()}`,
        assignedTo: planForm.assignedTo!,
        projectId: planForm.projectId!,
        maSoDuAn: code,
        stageIndex: planForm.stageIndex || 1,
        taskType: planForm.taskType || "Khác",
        detailedTask: planForm.detailedTask || "",
        startTime: planForm.startTime!.includes('T') ? planForm.startTime! : `${planForm.startTime}T08:00`,
        endTime: planForm.endTime!.includes('T') ? planForm.endTime! : `${planForm.endTime}T17:00`,
        status: planForm.status || 'PLANNED'
      };
      await createPlanningEntry(newEntry);
    }

    if (planForm.status === 'COMPLETED') {
       await syncProjectCompletion(planForm.projectId, planForm.stageIndex!, planForm.taskType);
    }

    await loadPlanningData();
    setIsModalOpen(false);
    setIsLoading(false);
  };

  const handleDeletePlan = async () => {
     if (!editingPlanId) return;
     if (!confirm("Bạn có chắc chắn muốn xóa kế hoạch này?")) return;
     
     setIsLoading(true);
     await deletePlanningEntry(editingPlanId);
     await loadPlanningData();
     setIsModalOpen(false);
     setIsLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewId) return;
    setIsLoading(true);
    await updatePlanningKPI(reviewId, kpiScore, kpiComment);
    const plan = plans.find(p => p.planId === reviewId);
    if (plan) {
       await syncProjectCompletion(plan.projectId, plan.stageIndex, plan.taskType);
    }
    await loadPlanningData();
    setReviewId(null);
    setKpiComment('');
    setIsLoading(false);
  };

  // --- EXPORT FUNCTIONS ---
  const handleExportPNG = async () => {
    const input = document.getElementById('planning-container');
    if (!input) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `TanPhat_Planning_W${currentWeek}_${currentYear}.png`;
      link.click();
    } catch (e) {
      alert("Lỗi xuất ảnh.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    const input = document.getElementById('planning-container');
    if (!input) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(input, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`TanPhat_Planning_W${currentWeek}_${currentYear}.pdf`);
    } catch (e) {
      alert("Lỗi xuất PDF.");
    } finally {
      setIsExporting(false);
    }
  };

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
       const d = new Date(startOfWeek);
       d.setDate(startOfWeek.getDate() + i);
       days.push(d);
    }
    return days;
  };
  const weekDays = getWeekDays();

  const getFilteredPlans = () => {
    return plans.filter(p => {
      if (!selectedMembers.includes(p.assignedTo)) return false;
      // In Gantt mode (Weekly), filter by week
      if (viewMode === 'GANTT') {
         const pStart = new Date(p.startTime);
         const pEnd = new Date(p.endTime);
         return pStart <= endOfWeek && pEnd >= startOfWeek;
      }
      return true; // List & Calendar handle their own filters
    });
  };

  const filteredPlans = getFilteredPlans();

  const getDayColumn = (dateStr: string) => {
    const d = new Date(dateStr);
    const diff = d.getDate() - startOfWeek.getDate();
    const oneDay = 24 * 60 * 60 * 1000;
    const dayIndex = Math.round((d.getTime() - startOfWeek.getTime()) / oneDay);
    return Math.max(0, Math.min(6, dayIndex));
  };

  const getHeatmapColor = (trackIndex: number, isDone: boolean) => {
     if (isDone) return "bg-green-600 text-white border-green-700";
     if (trackIndex === 0) return "bg-blue-200 text-blue-900 border-blue-300 hover:bg-blue-300";
     if (trackIndex === 1) return "bg-orange-300 text-orange-900 border-orange-400 hover:bg-orange-400";
     return "bg-red-600 text-white border-red-700 animate-pulse hover:bg-red-700";
  };

  const calculateTracks = (memberPlans: PlanningEntry[]) => {
      const sorted = [...memberPlans].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      const tracks: PlanningEntry[][] = [];
      const results: { plan: PlanningEntry, trackIndex: number }[] = [];

      sorted.forEach(plan => {
         let placed = false;
         for(let i=0; i<tracks.length; i++) {
            const lastPlanInTrack = tracks[i][tracks[i].length - 1];
            const lastEnd = new Date(lastPlanInTrack.endTime);
            const thisStart = new Date(plan.startTime);
            if (thisStart >= lastEnd) {
               tracks[i].push(plan);
               results.push({ plan, trackIndex: i });
               placed = true;
               break;
            }
         }
         if (!placed) {
            tracks.push([plan]);
            results.push({ plan, trackIndex: tracks.length - 1 });
         }
      });
      return { results, totalTracks: Math.max(1, tracks.length) };
  };

  // Filter project options
  const projectOptions = projects
    .map(p => {
       const pendingCount = getProjectUnscheduledCount(p);
       return {
          label: `[${p.maSoDuAn}] ${p.metadata?.chuDauTu || p.tenDuAn}`,
          subLabel: pendingCount > 0 ? `Còn ${pendingCount} việc đã tag chưa xếp` : 'Đã xếp xong',
          value: p.id,
          pendingCount
       };
    })
    .filter(opt => opt.pendingCount > 0 || (planForm.projectId && opt.value === planForm.projectId));

  const staffOptions = teamMembers.map(m => ({ label: m, value: m }));

  // --- CALENDAR GANTT CALCULATIONS ---
  const calculateCalendarGantt = (weekStart: Date, weekEnd: Date) => {
      // 1. Find plans visible in this week
      const visiblePlans = filteredPlans.filter(p => {
          const pStart = new Date(p.startTime);
          const pEnd = new Date(p.endTime);
          pStart.setHours(0,0,0,0);
          pEnd.setHours(23,59,59,999);
          // Standard Intersection
          return pStart <= weekEnd && pEnd >= weekStart;
      });

      // 2. Sort: Longest items first, then start date
      visiblePlans.sort((a,b) => {
          const startA = new Date(a.startTime).getTime();
          const startB = new Date(b.startTime).getTime();
          if (startA === startB) {
              const durA = new Date(a.endTime).getTime() - startA;
              const durB = new Date(b.endTime).getTime() - startB;
              return durB - durA;
          }
          return startA - startB;
      });

      // 3. Assign Visual Tracks (Gantt Packing)
      const tracks: PlanningEntry[][] = [];
      const placedPlans: { plan: PlanningEntry, trackIndex: number, left: number, width: number, isStart: boolean, isEnd: boolean }[] = [];

      visiblePlans.forEach(plan => {
          // Normalize to week bounds
          const pStart = new Date(plan.startTime);
          pStart.setHours(0,0,0,0);
          const pEnd = new Date(plan.endTime);
          pEnd.setHours(23,59,59,999);

          // Visual Start/End relative to Week (0-6)
          let visualStart = Math.floor((Math.max(pStart.getTime(), weekStart.getTime()) - weekStart.getTime()) / (86400000));
          let visualEnd = Math.floor((Math.min(pEnd.getTime(), weekEnd.getTime()) - weekStart.getTime()) / (86400000));
          
          visualStart = Math.max(0, visualStart);
          visualEnd = Math.min(6, visualEnd);
          const span = visualEnd - visualStart + 1;

          // Find Track
          let trackIndex = 0;
          let placed = false;
          
          // Simple greedy placement
          while(!placed) {
              const isOccupied = tracks[trackIndex]?.some(existing => {
                  const eStart = new Date(existing.startTime); eStart.setHours(0,0,0,0);
                  const eEnd = new Date(existing.endTime); eEnd.setHours(23,59,59,999);
                  
                  // Intersection logic
                  return eStart <= pEnd && eEnd >= pStart;
              });

              if (!isOccupied) {
                  if(!tracks[trackIndex]) tracks[trackIndex] = [];
                  tracks[trackIndex].push(plan);
                  placed = true;
              } else {
                  trackIndex++;
              }
          }

          placedPlans.push({
              plan,
              trackIndex,
              left: (visualStart * 14.28), // %
              width: (span * 14.28), // %
              isStart: pStart.getTime() >= weekStart.getTime(),
              isEnd: pEnd.getTime() <= weekEnd.getTime()
          });
      });

      return placedPlans;
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col relative pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col xl:flex-row items-center justify-between gap-4 shadow-sm sticky top-0 z-30">
        <div className="flex items-center gap-4 w-full xl:w-auto">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-800">
             <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
             <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">Kế Hoạch Chi Tiết Phòng Thiết Kế</h1>
             <p className="text-xs text-slate-500 font-medium">Quản lý nhân sự và tiến độ chi tiết</p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto items-center">
          
          <button 
             onClick={onNavigateToMonthly}
             className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 text-xs font-bold transition-all whitespace-nowrap"
          >
             <Briefcase size={14} /> D.Sách C.Việc Tháng
          </button>

          <div className="h-6 w-[1px] bg-slate-200 mx-2 hidden md:block"></div>

          {/* MULTI-USER FILTER BADGES */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 overflow-x-auto max-w-[200px] md:max-w-[300px] scrollbar-hide">
             {teamMembers.map(member => {
               const isActive = selectedMembers.includes(member);
               return (
                 <button
                   key={member}
                   onClick={() => handleToggleMember(member)}
                   className={`text-[10px] font-bold px-2 py-1 rounded mx-0.5 transition-all whitespace-nowrap border ${isActive ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-200 text-slate-500 border-transparent hover:bg-slate-300'}`}
                 >
                   {member}
                 </button>
               );
             })}
          </div>

          {/* TIME CONTROLS */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-1">
             <select 
               value={currentYear} 
               onChange={(e) => handleYearChange(parseInt(e.target.value))}
               className="bg-transparent text-xs font-bold text-slate-500 outline-none px-2 py-1 cursor-pointer border-r border-slate-200"
             >
               {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                 <option key={y} value={y}>{y}</option>
               ))}
             </select>

             <select 
               value={currentMonth} 
               onChange={(e) => handleMonthChange(parseInt(e.target.value))}
               className="bg-transparent text-xs font-bold text-slate-500 outline-none px-2 py-1 cursor-pointer border-r border-slate-200"
             >
               {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                 <option key={m} value={m}>Tháng {m}</option>
               ))}
             </select>

             <select 
               value={currentWeek} 
               onChange={(e) => handleWeekChange(parseInt(e.target.value))}
               className="bg-transparent text-xs font-bold text-slate-800 outline-none px-2 py-1 cursor-pointer min-w-[80px]"
             >
               {Array.from({length: 52}, (_, i) => i + 1).map(w => (
                 <option key={w} value={w}>Tuần {w}</option>
               ))}
             </select>
          </div>

          <button 
            onClick={() => handleOpenCreateModal()}
            className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg active:scale-95 text-sm whitespace-nowrap"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Tạo Mới</span>
          </button>
        </div>
      </div>

      {/* VIEW TOGGLES */}
      <div className="px-6 pt-6 pb-2 flex justify-between items-center">
         <div className="flex bg-white p-1 rounded-xl w-fit shadow-sm border border-slate-200">
            <button 
              onClick={() => setViewMode('LIST')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'LIST' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutList size={16} /> Danh Sách
            </button>
            <button 
              onClick={() => setViewMode('GANTT')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'GANTT' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <BarChart3 size={16} /> Biểu Đồ Gantt
            </button>
            {/* SINGLE MEMBER: CALENDAR VIEW TOGGLE */}
            {selectedMembers.length === 1 && (
               <button 
                  onClick={() => setViewMode('CALENDAR')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'CALENDAR' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
               >
                  <CalendarDays size={16} /> Xem Tháng (Lịch)
               </button>
            )}
         </div>

         {viewMode === 'LIST' && (
           <div className="flex bg-white p-1 rounded-xl w-fit shadow-sm border border-slate-200">
              <button 
                onClick={() => setViewGrouping('STAFF')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewGrouping === 'STAFF' ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Theo Nhân sự
              </button>
              <button 
                onClick={() => setViewGrouping('PROJECT')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${viewGrouping === 'PROJECT' ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Layers size={14} /> Theo Dự án
              </button>
           </div>
         )}
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 p-6 overflow-hidden flex flex-col bg-slate-100">
         
         {/* FULL WIDTH PLANNING AREA */}
         <div id="planning-container" className="flex-1 flex flex-col">
            {filteredPlans.length === 0 && viewMode !== 'CALENDAR' ? (
               <div className="flex-1 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-2xl bg-white/50 min-h-[300px]">
                  <Calendar size={48} className="mb-4 opacity-50" />
                  <p className="font-bold">Chưa có kế hoạch cho nhân sự đã chọn trong tuần {currentWeek}/{currentYear}.</p>
                  <button onClick={() => handleOpenCreateModal()} className="mt-2 text-blue-600 hover:underline font-bold text-sm">Tạo ngay +</button>
               </div>
            ) : viewMode === 'LIST' ? (
               // LIST VIEW
               <div className="flex flex-col gap-4">
                  {viewGrouping === 'STAFF' ? (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-min">
                        {filteredPlans.map(plan => {
                           const project = projects.find(p => p.id === plan.projectId);
                           const projectName = project?.metadata?.chuDauTu || project?.tenDuAn || 'Unknown Project';
                           const isDone = plan.status === 'COMPLETED';
                           const hasReview = plan.managerKpiScore !== undefined;

                           return (
                             <div 
                               key={plan.planId} 
                               onClick={() => handleOpenEditModal(plan)}
                               className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative cursor-pointer hover:border-blue-300"
                             >
                                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <PenSquare size={14} className="text-blue-500" />
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                   <span className="text-[10px] font-black uppercase bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                     {plan.assignedTo}
                                   </span>
                                </div>

                                <div className="flex flex-col gap-1 mb-3">
                                   <div className="text-base leading-tight">
                                     <span className="font-black text-slate-900">{plan.taskType}</span>
                                     <span className="text-slate-400 mx-2 font-light">|</span>
                                     <span className="font-medium text-slate-600">{projectName}</span>
                                   </div>
                                   
                                   <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                      <Clock size={10} />
                                      {plan.startTime.slice(0, 10)} {'->'} {plan.endTime.slice(0, 10)}
                                   </div>
                                </div>
                                
                                {plan.detailedTask && (
                                  <div className="text-xs text-slate-500 italic mb-4 border-l-2 border-slate-200 pl-2">
                                    "{plan.detailedTask}"
                                  </div>
                                )}

                                <div className="flex items-center gap-2 mb-4">
                                   <div className={`h-1.5 flex-1 rounded-full ${isDone ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                                   <span className={`text-[10px] font-bold uppercase ${isDone ? 'text-green-600' : 'text-blue-500'}`}>
                                      {isDone ? 'Đã xong' : 'Đang làm'}
                                   </span>
                                </div>

                                <div className="pt-2 border-t border-slate-100" onClick={e => e.stopPropagation()}>
                                   {hasReview ? (
                                      <div className="flex items-center justify-between">
                                         <div className="flex items-center gap-0.5">
                                            {[...Array(5)].map((_, i) => (
                                               <Star key={i} size={12} className={i < (plan.managerKpiScore || 0) ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} />
                                            ))}
                                         </div>
                                         <span className="text-[10px] font-bold text-slate-400">Đã đánh giá</span>
                                      </div>
                                   ) : (
                                      <button 
                                        onClick={() => setReviewId(plan.planId)}
                                        className="w-full py-1.5 text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded transition-colors"
                                      >
                                         Đánh giá KPI
                                      </button>
                                   )}
                                </div>
                             </div>
                           );
                        })}
                     </div>
                  ) : (
                     // PROJECT CENTRIC VIEW
                     <div className="space-y-6">
                        {Array.from(new Set(filteredPlans.map(p => p.projectId))).map(projId => {
                           const project = projects.find(p => p.id === projId);
                           const projectPlans = filteredPlans.filter(p => p.projectId === projId);
                           
                           return (
                             <div key={projId} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                                   <div className="flex items-center gap-3">
                                      <div className="bg-red-600 text-white font-mono font-bold text-xs px-2 py-0.5 rounded">
                                        {project?.maSoDuAn || 'NO-CODE'}
                                      </div>
                                      <h3 className="font-bold text-slate-800 text-sm">
                                        {project?.metadata?.chuDauTu || project?.tenDuAn}
                                      </h3>
                                   </div>
                                   <div className="text-xs font-bold text-slate-500">{projectPlans.length} tasks</div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                   {projectPlans.map(plan => (
                                      <div key={plan.planId} onClick={() => handleOpenEditModal(plan)} className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center group">
                                         <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 uppercase border border-slate-200">
                                               {plan.assignedTo.substring(0,2)}
                                            </div>
                                            <div>
                                               <div className="text-sm font-bold text-slate-700">{plan.taskType}</div>
                                               {plan.detailedTask && <div className="text-xs text-slate-400 italic line-clamp-1">{plan.detailedTask}</div>}
                                            </div>
                                         </div>
                                         <div className="text-right">
                                            <div className={`text-[10px] font-bold uppercase ${plan.status === 'COMPLETED' ? 'text-green-600' : 'text-orange-500'}`}>
                                               {plan.status === 'COMPLETED' ? 'Xong' : 'Đang làm'}
                                            </div>
                                            <div className="text-[10px] text-slate-400">{plan.endTime.slice(0, 10)}</div>
                                         </div>
                                      </div>
                                   ))}
                                </div>
                             </div>
                           )
                        })}
                     </div>
                  )}
               </div>
            ) : viewMode === 'CALENDAR' ? (
               // IMPROVED MONTHLY CALENDAR GRID (GANTT STYLE)
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full animate-fade-in">
                  <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                     <div>
                        <h2 className="text-lg font-black text-slate-800 uppercase">LỊCH LÀM VIỆC - {selectedMembers[0]}</h2>
                        <p className="text-xs text-slate-500 font-bold">Tháng {currentMonth} / {currentYear}</p>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => handleMonthChange(currentMonth - 1 < 1 ? 12 : currentMonth - 1)} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-300"><ChevronLeft size={20}/></button>
                        <button onClick={() => handleMonthChange(currentMonth + 1 > 12 ? 1 : currentMonth + 1)} className="p-1 hover:bg-white rounded border border-transparent hover:border-slate-300"><ChevronRight size={20}/></button>
                     </div>
                  </div>
                  
                  {/* Grid Header */}
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                     {['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'].map(day => (
                        <div key={day} className="py-2 text-center text-xs font-bold text-slate-500 uppercase border-r border-slate-200 last:border-0">{day}</div>
                     ))}
                  </div>
                  
                  {/* Week Rows */}
                  <div className="flex-1 overflow-y-auto bg-slate-100">
                     {getCalendarWeeks(currentYear, currentMonth).map((weekDays, weekIndex) => {
                         const weekStart = weekDays[0].date;
                         const weekEnd = weekDays[6].date;
                         // Calculate overlaps and positioning for this week
                         const placedPlans = calculateCalendarGantt(weekStart, weekEnd);
                         
                         // Determine row height based on max track
                         const maxTrack = placedPlans.length > 0 ? Math.max(...placedPlans.map(p => p.trackIndex)) : -1;
                         const rowHeight = Math.max(120, (maxTrack + 1) * 28 + 30); // Base height + track space

                         return (
                            <div key={weekIndex} className="relative border-b border-slate-200 bg-white" style={{ height: rowHeight }}>
                               {/* 1. Render Background Grid Cells */}
                               <div className="absolute inset-0 grid grid-cols-7 h-full">
                                   {weekDays.map((dayObj, idx) => (
                                      <div 
                                         key={idx} 
                                         className={`border-r border-slate-100 p-1 flex flex-col items-end hover:bg-slate-50 transition-colors cursor-pointer group/cell ${!dayObj.isCurrentMonth ? 'bg-slate-50/60' : ''}`}
                                         onClick={() => handleOpenCreateModal(dayObj.date)}
                                      >
                                          <span className={`text-[10px] font-bold p-1 rounded-full w-6 h-6 flex items-center justify-center ${
                                             dayObj.date.toDateString() === new Date().toDateString() ? 'bg-red-600 text-white' : 'text-slate-400'
                                          }`}>
                                             {dayObj.date.getDate()}
                                          </span>
                                          {/* Add Button on Hover */}
                                          <div className="mt-auto mr-auto opacity-0 group-hover/cell:opacity-100 transition-opacity p-1">
                                             <div className="bg-blue-100 text-blue-600 rounded-full p-0.5">
                                                <Plus size={12} />
                                             </div>
                                          </div>
                                      </div>
                                   ))}
                               </div>

                               {/* 2. Render Plans as Absolute Bars */}
                               {placedPlans.map((item, idx) => {
                                   const project = projects.find(p => p.id === item.plan.projectId);
                                   const isDone = item.plan.status === 'COMPLETED';
                                   
                                   let colorClasses = "bg-blue-500 text-white border-blue-600";
                                   if (isDone) colorClasses = "bg-green-600 text-white border-green-700";
                                   else if (item.trackIndex % 2 !== 0) colorClasses = "bg-orange-400 text-white border-orange-500";

                                   return (
                                       <div
                                           key={item.plan.planId + "_" + weekIndex}
                                           onClick={(e) => { e.stopPropagation(); handleOpenEditModal(item.plan); }}
                                           className={`absolute h-6 text-[9px] font-bold flex items-center px-2 cursor-pointer shadow-sm hover:brightness-110 transition-all border-y border-l border-r ${colorClasses} ${item.isStart ? 'rounded-l-md ml-1' : 'border-l-0'} ${item.isEnd ? 'rounded-r-md mr-1' : 'border-r-0'}`}
                                           style={{
                                               top: (item.trackIndex * 28) + 32, // Offset for date header
                                               left: `${item.left}%`,
                                               width: `${item.width}%`,
                                               zIndex: 10
                                           }}
                                           title={`${project?.tenDuAn} - ${item.plan.taskType}`}
                                       >
                                           <span className="truncate w-full drop-shadow-md">
                                               {item.isStart && <span className="mr-1 opacity-75">[{project?.maSoDuAn?.split('-')[1]}]</span>}
                                               {item.plan.taskType}
                                           </span>
                                       </div>
                                   );
                               })}
                            </div>
                         );
                     })}
                  </div>
               </div>
            ) : (
               // GROUPED GANTT VIEW
               <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                  {/* Dynamic Header */}
                  <div className="bg-slate-50 border-b border-slate-200 p-3 text-center">
                     <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">
                       KẾ HOẠCH TUẦN {currentWeek} THÁNG {currentMonth}
                     </h2>
                     <div className="text-[10px] font-bold text-slate-400 mt-1">
                        {startOfWeek.toLocaleDateString('vi-VN')} - {endOfWeek.toLocaleDateString('vi-VN')}
                     </div>
                  </div>

                  {/* Gantt Columns Header - DATE SPECIFIC */}
                  <div className="grid grid-cols-[120px_1fr] bg-slate-50 border-b border-slate-200 h-10">
                     <div className="flex items-center justify-center text-xs font-bold text-slate-400 border-r border-slate-200">
                       Nhân Sự
                     </div>
                     <div className="grid grid-cols-7 h-full">
                       {["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "CN"].map((day, idx) => {
                          const date = weekDays[idx];
                          const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
                          return (
                            <div key={idx} className="flex flex-col items-center justify-center text-[10px] border-r border-slate-200 last:border-0 leading-tight py-1">
                               <span className="font-bold text-slate-600">{day}</span>
                               <span className="font-medium text-slate-400">{dateStr}</span>
                            </div>
                          );
                       })}
                     </div>
                  </div>
                  
                  {/* Scrollable Timeline Area */}
                  <div className="flex-1 overflow-y-auto">
                      {selectedMembers.map((member) => {
                         const memberPlans = filteredPlans.filter(p => p.assignedTo === member);
                         const { results: stackedPlans, totalTracks } = calculateTracks(memberPlans);
                         const rowHeight = Math.max(60, totalTracks * 40 + 20);

                         return (
                           <div key={member} className="grid grid-cols-[120px_1fr] border-b border-slate-100 group hover:bg-slate-50/50" style={{ height: `${rowHeight}px` }}>
                              {/* Row Header (Member Name) */}
                              <div className="flex flex-col items-center justify-center p-2 border-r border-slate-100 bg-white">
                                 <span className="text-xs font-black text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg mb-1">
                                   {member}
                                 </span>
                                 <span className="text-[10px] font-bold text-slate-400">{memberPlans.length} tasks</span>
                              </div>

                              {/* Timeline Row */}
                              <div className="relative h-full grid grid-cols-7 items-start">
                                 {/* Background Grid */}
                                 <div className="absolute inset-0 grid grid-cols-7 pointer-events-none">
                                     {[...Array(7)].map((_, i) => (
                                        <div key={i} className="border-r border-slate-100 h-full last:border-0"></div>
                                     ))}
                                 </div>

                                 {/* Task Bars */}
                                 <div className="contents relative z-10">
                                   {stackedPlans.map(({ plan, trackIndex }) => {
                                      const startCol = getDayColumn(plan.startTime);
                                      const endCol = getDayColumn(plan.endTime);
                                      const span = Math.max(1, (endCol - startCol) + 1);
                                      const isDone = plan.status === 'COMPLETED';
                                      
                                      const project = projects.find(p => p.id === plan.projectId);
                                      const clientName = project?.metadata?.chuDauTu || project?.tenDuAn || '...';
                                      const barColorClass = getHeatmapColor(trackIndex, isDone);

                                      return (
                                         <div 
                                           key={plan.planId}
                                           className="relative z-10 px-1 cursor-pointer"
                                           onClick={() => handleOpenEditModal(plan)} // Clicking bar opens modal
                                           style={{ 
                                             gridColumn: `${startCol + 1} / span ${span}`, 
                                             gridRow: 1,
                                             marginTop: `${trackIndex * 36 + 10}px` 
                                           }}
                                         >
                                            <div 
                                              className={`${barColorClass} h-8 rounded shadow-sm hover:shadow-md flex items-center px-2 text-[10px] font-bold truncate transition-all group/item border relative`}
                                            >
                                               <span className="truncate w-full cursor-pointer" title={`${clientName} - ${plan.taskType}`}>
                                                  {clientName} - {plan.taskType}
                                               </span>
                                            </div>
                                         </div>
                                      );
                                   })}
                                 </div>
                              </div>
                           </div>
                         );
                      })}
                  </div>
               </div>
            )}
         </div>

      </div>

      {/* FLOATING EXPORT CONTROLS (BOTTOM-RIGHT) */}
      <div className="absolute bottom-6 right-6 z-40 flex flex-col gap-2">
         <button 
           onClick={handleExportPNG}
           disabled={isExporting}
           className="w-10 h-10 bg-white border border-slate-200 text-blue-600 rounded-full shadow-lg flex items-center justify-center hover:bg-blue-50 transition-all hover:scale-110"
           title="Xuất ảnh PNG"
         >
           <Download size={18} />
         </button>
         <button 
           onClick={handleExportPDF}
           disabled={isExporting}
           className="w-10 h-10 bg-white border border-slate-200 text-red-600 rounded-full shadow-lg flex items-center justify-center hover:bg-red-50 transition-all hover:scale-110"
           title="Xuất PDF"
         >
           <FileText size={18} />
         </button>
      </div>

      {/* CREATE/EDIT MODAL - SMART FORM */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-lg font-black text-slate-800 uppercase">
                    {editingPlanId ? 'Cập Nhật Kế Hoạch' : 'Tạo Kế Hoạch Mới'}
                 </h3>
                 <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500">
                    <X size={24} />
                 </button>
              </div>
              
              <div className="p-6 space-y-5 overflow-y-auto">
                 
                 {/* FIELD 1: STAFF (SEARCHABLE) */}
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">1. Chọn Nhân sự</label>
                    <SearchableSelect 
                       options={staffOptions}
                       value={planForm.assignedTo || ''}
                       onChange={(val) => setPlanForm({...planForm, assignedTo: val})}
                       placeholder="-- Tìm kiếm nhân sự --"
                    />
                 </div>

                 {/* FIELD 2: PROJECT (SMART FILTER - TAGGED TASKS) */}
                 <div>
                    <div className="flex justify-between items-center mb-1">
                       <label className="text-xs font-bold text-slate-500 uppercase block">2. Chọn Dự án (Đã Tag)</label>
                       {planForm.projectId && (
                         <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                           Công tác còn {projectOptions.find(o => o.value === planForm.projectId)?.pendingCount} việc chưa xếp
                         </span>
                       )}
                    </div>
                    <SearchableSelect 
                       options={projectOptions}
                       value={planForm.projectId || ''}
                       onChange={handleProjectSelect}
                       placeholder="-- Chọn dự án cần xử lý --"
                    />
                    {projectOptions.length === 0 && (
                       <p className="text-[10px] text-red-500 mt-1 italic">
                         Hết việc! Tất cả các dự án đã tag đều được lên lịch. Vui lòng vào Danh Sách Công Việc Tháng để tag thêm.
                       </p>
                    )}
                 </div>

                 {planForm.projectId && (
                    <div className="grid grid-cols-2 gap-4">
                       {/* FIELD 3: STAGE (FILTERED BY TAGGED AND UNSCHEDULED) */}
                       <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">3. Giai đoạn</label>
                          {(() => {
                            const stageOptions = STAGES.map(s => {
                                const redCount = planForm.projectId ? getStageRedCount(planForm.projectId, s.id) : 0;
                                return {
                                    ...s,
                                    redCount,
                                    className: redCount > 0 ? "text-red-600 font-bold bg-white" : "text-gray-400 bg-gray-50",
                                    label: `${s.id}. ${s.title.split(':')[1] || s.title}`
                                };
                            }).sort((a, b) => {
                                if (a.redCount > 0 && b.redCount === 0) return -1;
                                if (a.redCount === 0 && b.redCount > 0) return 1;
                                return a.id - b.id;
                            });
                            
                            // Determine current selection style
                            const currentOpt = stageOptions.find(o => o.id === planForm.stageIndex);
                            const selectClass = currentOpt?.redCount ? 'text-red-600 font-bold' : 'text-slate-800';

                            return (
                              <select 
                                 className={`w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${selectClass}`}
                                 value={planForm.stageIndex}
                                 onChange={e => handleStageChange(parseInt(e.target.value))}
                              >
                                 {stageOptions.map(s => (
                                    <option key={s.id} value={s.id} className={s.className}>
                                       {s.label} {s.redCount > 0 ? `(${s.redCount} việc gấp)` : ''}
                                    </option>
                                 ))}
                              </select>
                            );
                        })()}
                       </div>

                       {/* FIELD 4: TASK TYPE (3-TIER VISUAL FILTER) */}
                       <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">4. Công tác (Đã Tag)</label>
                          <select 
                             className="w-full p-2.5 border border-slate-300 rounded-lg text-slate-800 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                             value={planForm.taskType}
                             onChange={e => setPlanForm({...planForm, taskType: e.target.value})}
                          >
                             <option value="">-- Chọn việc --</option>
                             {getTaskOptionsForStage(planForm.projectId, planForm.stageIndex).map(opt => (
                                <option 
                                  key={opt.item} 
                                  value={opt.item} 
                                  disabled={opt.isDisabled}
                                  className={opt.className}
                                >
                                  {opt.item}
                                </option>
                             ))}
                          </select>
                       </div>
                    </div>
                 )}

                 {/* FIELD 5: DETAILS (OPTIONAL) */}
                 <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-xs font-bold text-slate-500 uppercase">5. Chi tiết (Tùy chọn)</label>
                      <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded">Không bắt buộc</span>
                    </div>
                    <textarea 
                       className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                       rows={2}
                       placeholder="Ghi chú thêm..."
                       value={planForm.detailedTask || ''}
                       onChange={e => setPlanForm({...planForm, detailedTask: e.target.value})}
                    />
                 </div>

                 {/* FIELD 6 & 7: DATE ONLY & STATUS */}
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ngày Bắt Đầu</label>
                       <input 
                          type="date" 
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold"
                          value={planForm.startTime} 
                          onChange={e => setPlanForm({...planForm, startTime: e.target.value})}
                       />
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Ngày Kết Thúc</label>
                       <input 
                          type="date" 
                          className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold"
                          value={planForm.endTime} 
                          onChange={e => setPlanForm({...planForm, endTime: e.target.value})}
                          required
                       />
                    </div>
                 </div>
                 
                 <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Trạng thái hoàn thành</label>
                    <div 
                      onClick={() => setPlanForm({ ...planForm, status: planForm.status === 'COMPLETED' ? 'PLANNED' : 'COMPLETED' })}
                      className={`w-full p-2 border rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${planForm.status === 'COMPLETED' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'}`}
                    >
                       {planForm.status === 'COMPLETED' ? (
                         <CheckCircle2 size={20} className="text-green-600" />
                       ) : (
                         <Circle size={20} className="text-slate-400" />
                       )}
                       <span className={`text-sm font-bold ${planForm.status === 'COMPLETED' ? 'text-green-700' : 'text-slate-500'}`}>
                          {planForm.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                       </span>
                    </div>
                 </div>

              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between gap-3">
                 {/* DELETE BUTTON - Only if editing */}
                 <div>
                    {editingPlanId && (
                       <button 
                         onClick={handleDeletePlan}
                         className="px-4 py-2 text-red-500 font-bold hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 flex items-center gap-2 transition-colors"
                         disabled={isLoading}
                       >
                         <Trash2 size={16} /> <span className="hidden sm:inline">Xóa</span>
                       </button>
                    )}
                 </div>

                 <div className="flex gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg">Hủy</button>
                    <button 
                      onClick={handleSavePlan}
                      disabled={isLoading} 
                      className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {isLoading ? 'Đang xử lý...' : <><Save size={18}/> {editingPlanId ? 'Cập Nhật' : 'Lưu Kế Hoạch'}</>}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* KPI MODAL */}
      {reviewId && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in p-6">
               <h3 className="text-center font-black text-slate-800 uppercase mb-4 text-lg">Đánh Giá Hiệu Suất</h3>
               
               <div className="flex justify-center gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map(star => (
                     <button key={star} onClick={() => setKpiScore(star)} className="p-1 hover:scale-110 transition-transform">
                        <Star size={32} className={star <= kpiScore ? "fill-yellow-400 text-yellow-400" : "text-slate-200"} />
                     </button>
                  ))}
               </div>
               
               <div className="mb-6">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nhận xét của trưởng phòng</label>
                  <textarea 
                     className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
                     rows={3}
                     placeholder="Nhập đánh giá chi tiết..."
                     value={kpiComment}
                     onChange={e => setKpiComment(e.target.value)}
                  />
               </div>

               <div className="flex gap-3">
                  <button onClick={() => setReviewId(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Đóng</button>
                  <button onClick={handleSubmitReview} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800">Xác nhận</button>
               </div>
            </div>
         </div>
      )}

      <FixedFooter view="PLANNING" />
    </div>
  );
};

export default Planning;