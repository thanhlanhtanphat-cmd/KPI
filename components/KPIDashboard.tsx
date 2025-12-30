
import React, { useState, useEffect } from 'react';
import { Project, PlanningEntry, Employee, KpiWeightConfig } from '../types';
import { fetchPlanning } from '../services/api';
import { ArrowLeft, TrendingUp, Target, BarChart4, ChevronRight, Briefcase, Star, Zap, UserCheck, ShieldCheck, HeartHandshake, MessageCircle, Settings, Plus, Edit, Trash2, User, X, Sliders, PieChart, AlertCircle, Save, CalendarDays, Trophy, Heart } from 'lucide-react';
import FixedFooter from './FixedFooter';
import { EMPLOYEE_ROLES, STAGES, getAvatarUrl } from '../constants';

interface KPIDashboardProps {
  projects: Project[];
  teamMembers: Employee[];
  onUpdateTeamMembers: (newMembers: Employee[]) => void;
  kpiWeightConfig: KpiWeightConfig;
  onUpdateKpiWeightConfig: (newConfig: KpiWeightConfig) => void;
  onBack: () => void;
}

const KPIDashboard: React.FC<KPIDashboardProps> = ({ projects, teamMembers, onUpdateTeamMembers, kpiWeightConfig, onUpdateKpiWeightConfig, onBack }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee>(teamMembers[0] || null);
  const [planningData, setPlanningData] = useState<PlanningEntry[]>([]);
  
  // Time Filter State
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Team Management State
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee>>({});

  // KPI Config Modal State
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [tempWeights, setTempWeights] = useState<KpiWeightConfig>(JSON.parse(JSON.stringify(kpiWeightConfig)));
  const [activeConfigStageId, setActiveConfigStageId] = useState<number>(1);
  
  // Load Planning Data
  useEffect(() => {
    const loadPlanning = async () => {
      const data = await fetchPlanning();
      setPlanningData(data);
    };
    loadPlanning();
  }, []);

  // Update selected employee if teamMembers list changes (e.g. after score update)
  useEffect(() => {
    if (selectedEmployee) {
       const updated = teamMembers.find(e => e.id === selectedEmployee.id);
       if (updated) setSelectedEmployee(updated);
    } else if (teamMembers.length > 0) {
       setSelectedEmployee(teamMembers[0]);
    }
  }, [teamMembers]);

  // Sync temp weights when modal opens
  useEffect(() => {
    if (isWeightModalOpen) {
      setTempWeights(JSON.parse(JSON.stringify(kpiWeightConfig)));
    }
  }, [isWeightModalOpen, kpiWeightConfig]);

  const handleAttitudeChange = (field: keyof Employee['attitudeScores'], value: number) => {
    if (!selectedEmployee) return;

    const updatedEmployee = {
      ...selectedEmployee,
      attitudeScores: {
        ...selectedEmployee.attitudeScores,
        [field]: value
      }
    };

    // Update in Global State (App.tsx will persist to LocalStorage)
    const newTeamList = teamMembers.map(e => e.id === selectedEmployee.id ? updatedEmployee : e);
    onUpdateTeamMembers(newTeamList);
  };

  // --- TEAM MANAGEMENT HANDLERS ---
  const openEditEmployee = (emp?: Employee) => {
     if (emp) {
        setEditingEmployee({...emp});
     } else {
        setEditingEmployee({
           name: '',
           role: 'KIẾN TRÚC SƯ',
           targetKPI: 300,
           attitudeScores: { tacPhong: 8, hoatDong: 8, phanHoiKH: 8, thaiDo: 8, ungXu: 8 }
        });
     }
     setIsTeamModalOpen(true);
  };

  const handleSaveEmployee = () => {
     if (!editingEmployee.name || !editingEmployee.role) {
        alert("Vui lòng nhập tên và chức vụ!");
        return;
     }

     let updatedList = [...teamMembers];
     if (editingEmployee.id) {
        // Edit existing
        updatedList = updatedList.map(e => e.id === editingEmployee.id ? (editingEmployee as Employee) : e);
     } else {
        // Create new
        const newEmp: Employee = {
           ...(editingEmployee as Employee),
           id: `EMP-${Date.now()}`,
           // Automatically generate strict avatar based on name
           avatarUrl: getAvatarUrl(editingEmployee.name || '')
        };
        updatedList.push(newEmp);
     }
     onUpdateTeamMembers(updatedList);
     setEditingEmployee({}); // Reset form
     // Don't close modal, allow user to continue managing
  };

  const handleRemoveMember = (id: string) => {
    if (window.confirm(`Xóa nhân sự này khỏi danh sách?`)) {
      onUpdateTeamMembers(teamMembers.filter(m => m.id !== id));
    }
  };

  // --- WEIGHT CONFIG HANDLERS ---
  const handleStageWeightChange = (stageId: number, value: string) => {
    const num = parseFloat(value);
    setTempWeights(prev => ({
      ...prev,
      stageWeights: { ...prev.stageWeights, [stageId]: isNaN(num) ? 0 : num }
    }));
  };

  const handleTaskWeightChange = (stageId: number, taskName: string, value: string) => {
    const num = parseFloat(value);
    setTempWeights(prev => ({
      ...prev,
      taskWeights: {
        ...prev.taskWeights,
        [stageId]: {
          ...(prev.taskWeights[stageId] || {}),
          [taskName]: isNaN(num) ? 0 : num
        }
      }
    }));
  };

  const saveWeights = () => {
    // Optional: Validation check
    const totalStage = Object.values(tempWeights.stageWeights).reduce((a, b) => a + b, 0);
    if (Math.abs(totalStage - 100) > 1) {
      if (!confirm(`Tổng tỷ trọng các giai đoạn là ${totalStage.toFixed(1)}% (không phải 100%). Bạn có chắc chắn muốn lưu?`)) return;
    }
    
    onUpdateKpiWeightConfig(tempWeights);
    setIsWeightModalOpen(false);
  };

  // --- ADVANCED KPI CALCULATION LOGIC ---

  // 1. Calculate Single Task Value
  const calculateTaskEarnedPoint = (plan: PlanningEntry): number => {
    // A. Find Project
    const project = projects.find(p => p.id === plan.projectId);
    if (!project) return 0;

    // B. Get Project KPI Score
    const projectKPI = parseFloat(project.metadata.diemKPI || '0');
    if (isNaN(projectKPI) || projectKPI === 0) return 0;

    // C. Get Weights
    const stageWeight = kpiWeightConfig.stageWeights[plan.stageIndex] || 0;
    const taskWeight = kpiWeightConfig.taskWeights[plan.stageIndex]?.[plan.taskType] || 0;

    // D. Formula: ProjectKPI * Stage% * Task%
    // Note: Weights are stored as integers (e.g., 11 for 11%), so we divide by 100 twice.
    return projectKPI * (stageWeight / 100) * (taskWeight / 100);
  };

  // 2. Aggregate Monthly Earned KPI
  const calculateMonthlyEarnedKPI = (empName: string) => {
    // A. Filter Planning Data
    const completedTasks = planningData.filter(p => {
      if (p.assignedTo !== empName) return false;
      if (p.status !== 'COMPLETED') return false;
      
      const pDate = new Date(p.endTime);
      // Check if task EndTime is within selected Month/Year
      return (pDate.getMonth() + 1 === selectedMonth) && (pDate.getFullYear() === selectedYear);
    });

    // B. Sum Points
    let totalPoints = 0;
    completedTasks.forEach(task => {
      totalPoints += calculateTaskEarnedPoint(task);
    });

    return { totalPoints, taskCount: completedTasks.length };
  };

  const calculateEfficiency = (empName: string) => {
    // Filter tasks for selected month
    const tasks = planningData.filter(p => {
       const pDate = new Date(p.endTime);
       return p.assignedTo === empName && (pDate.getMonth() + 1 === selectedMonth) && (pDate.getFullYear() === selectedYear);
    });
    
    const completed = tasks.filter(p => p.status === 'COMPLETED');
    const rate = tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0;
    return { rate: rate.toFixed(0), completed: completed.length, total: tasks.length };
  };

  // Safe checks if no employee exists
  if (!selectedEmployee && teamMembers.length === 0) return <div className="p-10 text-center">Chưa có dữ liệu nhân sự. Vui lòng thêm trong phần Cài Đặt.</div>;

  const currentKPI = calculateMonthlyEarnedKPI(selectedEmployee?.name || "");
  const currentEff = calculateEfficiency(selectedEmployee?.name || "");
  const scores = selectedEmployee?.attitudeScores || { tacPhong: 0, hoatDong: 0, phanHoiKH: 0, thaiDo: 0, ungXu: 0 };
  const avgAttitudeScore = ((scores.tacPhong + scores.hoatDong + scores.phanHoiKH + scores.thaiDo + scores.ungXu) / 5).toFixed(1);

  // --- DUAL LEADERBOARD LOGIC ---
  
  // 1. KPI Leaderboard (Sort by Total Points Descending)
  const kpiLeaderboard = teamMembers.map(emp => {
    const { totalPoints } = calculateMonthlyEarnedKPI(emp.name);
    return { ...emp, score: totalPoints };
  }).sort((a, b) => b.score - a.score);

  // 2. Attitude Leaderboard (Sort by Avg Attitude Descending)
  const attitudeLeaderboard = teamMembers.map(emp => {
    const s = emp.attitudeScores;
    const avg = (s.tacPhong + s.hoatDong + s.phanHoiKH + s.thaiDo + s.ungXu) / 5;
    return { ...emp, score: avg };
  }).sort((a, b) => b.score - a.score);

  // Progress to Target
  const kpiProgress = selectedEmployee ? Math.min(100, (currentKPI.totalPoints / selectedEmployee.targetKPI) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative pb-20">
      {/* Header */}
      <div className="bg-indigo-900 text-white px-6 py-4 flex flex-col md:flex-row items-center justify-between shadow-md sticky top-0 z-50 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <TrendingUp className="text-indigo-300" /> Trung Tâm Quản Lý Nhân Sự
            </h1>
            <p className="text-xs text-indigo-200 font-medium">Đánh giá hiệu suất & Thái độ</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
           
           {/* TIME FILTER */}
           <div className="flex items-center bg-indigo-800 rounded-lg p-1 border border-indigo-700">
              <CalendarDays size={16} className="text-indigo-300 ml-2 mr-1" />
              <select 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="bg-transparent text-xs font-bold text-white outline-none py-1 px-1 cursor-pointer"
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m} className="text-slate-800">Tháng {m}</option>
                ))}
              </select>
              <div className="w-[1px] h-3 bg-indigo-600 mx-1"></div>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="bg-transparent text-xs font-bold text-white outline-none py-1 px-1 cursor-pointer"
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y} className="text-slate-800">{y}</option>
                ))}
              </select>
           </div>

           {/* WEIGHT CONFIG BUTTON */}
           <button 
              onClick={() => setIsWeightModalOpen(true)}
              className="flex items-center gap-2 bg-transparent hover:bg-indigo-800 text-indigo-100 border border-indigo-400 px-4 py-2 rounded-lg font-bold transition-all shadow-sm text-xs"
           >
              <Sliders size={16} /> CẤU HÌNH %
           </button>

           {/* MANAGE TEAM BUTTON */}
           <button 
              onClick={() => setIsTeamModalOpen(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-indigo-900/50 transition-all border border-indigo-400 text-xs"
           >
              <Settings size={16} /> QUẢN LÝ NS
           </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-80px)] overflow-hidden">
        
        {/* Sidebar: Employee List */}
        <div className="w-full lg:w-80 bg-white border-r border-slate-200 overflow-y-auto z-10">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách nhân sự ({teamMembers.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {teamMembers.map((emp) => (
              <div 
                key={emp.id}
                onClick={() => setSelectedEmployee(emp)}
                className={`p-4 flex items-center gap-3 cursor-pointer transition-all hover:bg-indigo-50 ${selectedEmployee?.id === emp.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : 'border-l-4 border-transparent'}`}
              >
                <div className="relative">
                  <img src={emp.avatarUrl} alt={emp.name} className="w-12 h-12 rounded-full object-cover border border-slate-200 bg-slate-100" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className={`text-sm font-bold truncate ${selectedEmployee?.id === emp.id ? 'text-indigo-900' : 'text-slate-700'}`}>{emp.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate">{emp.role}</p>
                </div>
                <ChevronRight size={16} className={`flex-shrink-0 ${selectedEmployee?.id === emp.id ? 'text-indigo-600' : 'text-slate-300'}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-slate-100 scroll-smooth">
          
          {selectedEmployee ? (
            <>
              {/* Profile & Main Stats */}
              <div className="flex flex-col md:flex-row gap-6 mb-8">
                 {/* Profile Card */}
                 <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-6">
                    <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500 flex-shrink-0 shadow-lg">
                       <img src={selectedEmployee.avatarUrl} className="w-full h-full rounded-full object-cover border-2 border-white bg-white" />
                    </div>
                    <div>
                       <h2 className="text-3xl font-black text-slate-900">{selectedEmployee.name}</h2>
                       <div className="flex flex-wrap gap-2 text-sm text-slate-500 mt-2 mb-3">
                          <span className="flex items-center gap-1 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
                             <Briefcase size={12}/> {selectedEmployee.role}
                          </span>
                          <span className="flex items-center gap-1 bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-bold border border-slate-200">
                             Tháng {selectedMonth}/{selectedYear}
                          </span>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="flex-1 h-3 w-32 bg-slate-100 rounded-full overflow-hidden">
                             <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${kpiProgress}%` }}></div>
                          </div>
                          <span className="text-xs font-bold text-slate-600">{currentKPI.totalPoints.toLocaleString('en-US', {maximumFractionDigits: 0})} / {selectedEmployee.targetKPI} KPI</span>
                       </div>
                    </div>
                 </div>

                 {/* Efficiency Card */}
                 <div className="w-full md:w-64 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
                     <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 mb-3">
                        <Zap size={32} />
                     </div>
                     <div className="text-3xl font-black text-slate-800">{currentEff.rate}%</div>
                     <p className="text-xs text-slate-500 font-bold uppercase mt-1">Hiệu suất tháng {selectedMonth}</p>
                     <span className="text-[10px] text-slate-400 mt-2 bg-slate-50 px-2 py-1 rounded">
                        {currentEff.completed}/{currentEff.total} Tasks
                     </span>
                 </div>
              </div>

              {/* ATTITUDE SCORING SECTION */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
                 
                 {/* LEFT: 5-POINT EVALUATION FORM */}
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-6">
                       <div className="flex items-center gap-2">
                          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Star size={20}/></div>
                          <h3 className="font-bold text-slate-800 text-sm uppercase">Đánh Giá Thái Độ & Kỹ Năng Mềm</h3>
                       </div>
                       <div className="text-3xl font-black text-purple-600">{avgAttitudeScore}<span className="text-sm text-slate-400 font-bold">/10</span></div>
                    </div>

                    <div className="space-y-6">
                       <SkillSlider 
                          icon={<UserCheck size={16}/>} 
                          label="Tác phong làm việc" 
                          desc="Đúng giờ, trang phục, tuân thủ nội quy" 
                          value={scores.tacPhong} 
                          onChange={(v) => handleAttitudeChange('tacPhong', v)} 
                       />
                       <SkillSlider 
                          icon={<Flag size={16}/>} 
                          label="Hoạt động phong trào" 
                          desc="Tham gia sự kiện công ty, team building" 
                          value={scores.hoatDong} 
                          onChange={(v) => handleAttitudeChange('hoatDong', v)} 
                       />
                       <SkillSlider 
                          icon={<MessageCircle size={16}/>} 
                          label="Phản hồi khách hàng" 
                          desc="Giao tiếp, giải quyết vấn đề với CĐT" 
                          value={scores.phanHoiKH} 
                          onChange={(v) => handleAttitudeChange('phanHoiKH', v)} 
                       />
                       <SkillSlider 
                          icon={<HeartHandshake size={16}/>} 
                          label="Thái độ đồng nghiệp" 
                          desc="Hòa đồng, hỗ trợ, teamwork" 
                          value={scores.thaiDo} 
                          onChange={(v) => handleAttitudeChange('thaiDo', v)} 
                       />
                       <SkillSlider 
                          icon={<ShieldCheck size={16}/>} 
                          label="Ứng xử văn hóa" 
                          desc="Lịch sự, tôn trọng cấp trên" 
                          value={scores.ungXu} 
                          onChange={(v) => handleAttitudeChange('ungXu', v)} 
                       />
                    </div>
                 </div>

                 {/* RIGHT: HARD KPI BREAKDOWN & DUAL LEADERBOARD */}
                 <div className="flex flex-col gap-6">
                    
                    {/* HARD KPI CARD (UPDATED TO SHOW REAL EARNED VALUE) */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Target size={120}/></div>
                       <div className="flex items-center gap-2 mb-4">
                          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Target size={20}/></div>
                          <h3 className="font-bold text-slate-800 text-sm uppercase">SẢN LƯỢNG KPI THỰC TẾ</h3>
                       </div>
                       
                       <div className="flex items-end gap-2 mb-2">
                          <span className="text-5xl font-black text-blue-600 tracking-tighter">
                             {currentKPI.totalPoints.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                          </span>
                          <span className="text-sm font-bold text-slate-400 mb-2">Điểm</span>
                       </div>
                       
                       <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mb-2">
                          <div className="h-full bg-blue-500" style={{ width: `${kpiProgress}%` }}></div>
                       </div>
                       
                       <div className="flex justify-between text-xs font-bold text-slate-500">
                          <span>0</span>
                          <span>Mục tiêu: {selectedEmployee.targetKPI}</span>
                       </div>

                       <div className="mt-6 pt-4 border-t border-slate-100">
                          <div className="flex justify-between items-center">
                             <div className="text-xs text-slate-500 font-bold">
                                Tổng điểm từ <span className="text-blue-600">{currentKPI.taskCount}</span> công tác hoàn thành trong tháng {selectedMonth}.
                             </div>
                             {currentKPI.taskCount > 0 && (
                                <div className="text-xl font-bold text-slate-800">
                                   ~{(currentKPI.totalPoints / currentKPI.taskCount).toFixed(1)} <span className="text-[10px] text-slate-400 font-normal">điểm/task</span>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>

                    {/* DUAL LEADERBOARD SECTION */}
                    <div className="flex-1 grid grid-cols-2 gap-4">
                       
                       {/* LEFT: KPI WARRIORS */}
                       <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-200">
                          <div className="flex items-center gap-2 mb-4 border-b border-blue-100 pb-2">
                             <BarChart4 size={20} className="text-blue-600"/>
                             <h3 className="font-black text-blue-800 text-xs uppercase">TOP CHIẾN BINH KPI</h3>
                          </div>
                          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                             {kpiLeaderboard.map((emp, index) => (
                                <div key={emp.id} className={`flex items-center gap-2 p-2 rounded-lg ${index === 0 ? 'bg-yellow-50 border border-yellow-200' : 'bg-slate-50'}`}>
                                   <div className={`w-6 h-6 flex items-center justify-center font-bold text-xs rounded ${index === 0 ? 'text-yellow-600' : 'text-slate-400'}`}>
                                      {index === 0 ? <Trophy size={16} className="fill-yellow-400"/> : `#${index + 1}`}
                                   </div>
                                   <img src={emp.avatarUrl} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200" />
                                   <div className="flex-1 min-w-0">
                                      <div className="font-bold text-slate-800 text-xs truncate">{emp.name}</div>
                                   </div>
                                   <div className="font-black text-blue-600 text-xs">
                                      {emp.score.toLocaleString('en-US', {maximumFractionDigits: 0})}
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>

                       {/* RIGHT: ATTITUDE STARS */}
                       <div className="bg-white p-4 rounded-2xl shadow-sm border border-purple-200">
                          <div className="flex items-center gap-2 mb-4 border-b border-purple-100 pb-2">
                             <HeartHandshake size={20} className="text-purple-600"/>
                             <h3 className="font-black text-purple-800 text-xs uppercase">TOP THÁI ĐỘ & TÁC PHONG</h3>
                          </div>
                          <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                             {attitudeLeaderboard.map((emp, index) => (
                                <div key={emp.id} className={`flex items-center gap-2 p-2 rounded-lg ${index === 0 ? 'bg-pink-50 border border-pink-200' : 'bg-slate-50'}`}>
                                   <div className={`w-6 h-6 flex items-center justify-center font-bold text-xs rounded ${index === 0 ? 'text-pink-600' : 'text-slate-400'}`}>
                                      {index === 0 ? <Heart size={16} className="fill-pink-400"/> : `#${index + 1}`}
                                   </div>
                                   <img src={emp.avatarUrl} className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200" />
                                   <div className="flex-1 min-w-0">
                                      <div className="font-bold text-slate-800 text-xs truncate">{emp.name}</div>
                                   </div>
                                   <div className="font-black text-purple-600 text-xs">
                                      {emp.score.toFixed(1)}/10
                                   </div>
                                </div>
                             ))}
                          </div>
                       </div>

                    </div>

                 </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
               <User size={64} className="mb-4 opacity-20" />
               <p className="font-bold">Chọn nhân sự để xem chi tiết</p>
            </div>
          )}
        </div>
      </div>

      {/* TEAM MANAGEMENT MODAL */}
      {isTeamModalOpen && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-scale-in flex flex-col max-h-[90vh]">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                  <div>
                     <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2">
                        <User size={24} className="text-indigo-600" /> Danh Sách & Cài Đặt Thành Viên
                     </h3>
                     <p className="text-sm text-slate-500">Quản lý hồ sơ nhân sự, chức vụ và KPI mục tiêu</p>
                  </div>
                  <button onClick={() => setIsTeamModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                     <X size={24} />
                  </button>
               </div>

               <div className="flex flex-1 overflow-hidden">
                  {/* Left: List */}
                  <div className="w-1/2 border-r border-slate-200 overflow-y-auto p-4 bg-slate-50">
                     <div className="space-y-3">
                        {teamMembers.map(member => (
                           <div key={member.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center group hover:border-indigo-300 transition-all">
                              <div className="flex items-center gap-3">
                                 <img src={member.avatarUrl} className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200" />
                                 <div>
                                    <div className="font-bold text-slate-800">{member.name}</div>
                                    <div className="text-xs text-slate-500">{member.role}</div>
                                 </div>
                              </div>
                              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button onClick={() => openEditEmployee(member)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors">
                                    <Edit size={16} />
                                 </button>
                                 <button onClick={() => handleRemoveMember(member.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                                    <Trash2 size={16} />
                                 </button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  {/* Right: Form */}
                  <div className="w-1/2 p-6 overflow-y-auto">
                     <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                        <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                           {editingEmployee.id ? <Edit size={18} className="text-indigo-600"/> : <Plus size={18} className="text-green-600"/>}
                           {editingEmployee.id ? 'Cập Nhật Hồ Sơ' : 'Thêm Nhân Sự Mới'}
                        </h4>
                        
                        <div className="space-y-4">
                           <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Họ và Tên</label>
                              <input 
                                 type="text" 
                                 value={editingEmployee.name || ''} 
                                 onChange={e => setEditingEmployee({...editingEmployee, name: e.target.value.toUpperCase()})}
                                 className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold outline-none"
                                 placeholder="VD: NGUYỄN VĂN A"
                              />
                           </div>
                           <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Chức Vụ</label>
                              <select 
                                 value={editingEmployee.role || ''}
                                 onChange={e => setEditingEmployee({...editingEmployee, role: e.target.value})}
                                 className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium bg-white outline-none"
                              >
                                 <option value="">-- Chọn chức vụ --</option>
                                 {EMPLOYEE_ROLES.map(role => (
                                    <option key={role} value={role}>{role}</option>
                                 ))}
                              </select>
                           </div>
                           <div>
                              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block flex justify-between">
                                 <span>KPI Mục Tiêu (Điểm)</span>
                                 <Target size={14} />
                              </label>
                              <input 
                                 type="number" 
                                 value={editingEmployee.targetKPI || ''} 
                                 onChange={e => setEditingEmployee({...editingEmployee, targetKPI: parseInt(e.target.value) || 0})}
                                 className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-600 outline-none"
                                 placeholder="VD: 300"
                              />
                           </div>
                        </div>

                        <div className="mt-6 flex gap-2">
                           <button 
                              onClick={() => setEditingEmployee({})} 
                              className="flex-1 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg text-sm"
                           >
                              Reset Form
                           </button>
                           <button 
                              onClick={handleSaveEmployee} 
                              className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-700 transition-colors text-sm"
                           >
                              {editingEmployee.id ? 'Cập Nhật' : 'Lưu Hồ Sơ'}
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* KPI WEIGHT CONFIG MODAL */}
      {isWeightModalOpen && (
         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl animate-scale-in flex flex-col h-[90vh]">
               {/* Modal Header */}
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                  <div>
                     <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2">
                        <PieChart size={24} className="text-indigo-600" /> Điều Chỉnh Tỷ Trọng KPI Hệ Thống
                     </h3>
                     <p className="text-sm text-slate-500">Cấu hình % điểm số cho từng giai đoạn và công tác chi tiết.</p>
                  </div>
                  <button onClick={() => setIsWeightModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                     <X size={24} />
                  </button>
               </div>

               {/* Modal Body */}
               <div className="flex flex-1 overflow-hidden">
                  
                  {/* Left: Stage Weights */}
                  <div className="w-1/3 border-r border-slate-200 overflow-y-auto bg-slate-50 p-4">
                     <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-slate-700 uppercase text-xs">Tỷ trọng Giai đoạn</h4>
                        <span className={`text-xs font-black px-2 py-1 rounded ${Math.abs(Object.values(tempWeights.stageWeights).reduce((a,b)=>a+b,0) - 100) < 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                           Total: {Object.values(tempWeights.stageWeights).reduce((a,b)=>a+b,0).toFixed(1)}%
                        </span>
                     </div>
                     
                     <div className="space-y-3">
                        {STAGES.map(stage => {
                           const weight = tempWeights.stageWeights[stage.id] || 0;
                           const isActive = activeConfigStageId === stage.id;
                           return (
                              <div 
                                 key={stage.id}
                                 onClick={() => setActiveConfigStageId(stage.id)}
                                 className={`p-3 rounded-xl border cursor-pointer transition-all ${isActive ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-300'}`}
                              >
                                 <div className="flex justify-between items-start mb-2">
                                    <span className={`font-bold text-sm ${isActive ? 'text-indigo-700' : 'text-slate-700'}`}>
                                       {stage.title.split(':')[0]}
                                    </span>
                                    <div className="flex items-center gap-1 bg-slate-100 rounded px-1.5 py-0.5">
                                       <input 
                                          type="number" 
                                          value={weight}
                                          onChange={(e) => handleStageWeightChange(stage.id, e.target.value)}
                                          className="w-12 text-right bg-transparent outline-none font-bold text-sm"
                                          step="0.5"
                                       />
                                       <span className="text-xs font-bold text-slate-500">%</span>
                                    </div>
                                 </div>
                                 <p className="text-xs text-slate-500 line-clamp-1">{stage.title.split(':')[1]}</p>
                              </div>
                           )
                        })}
                     </div>
                  </div>

                  {/* Right: Task Weights */}
                  <div className="flex-1 p-6 overflow-y-auto bg-white">
                     <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
                        <div>
                           <h4 className="font-bold text-slate-800 text-lg">
                              Chi tiết: {STAGES.find(s=>s.id === activeConfigStageId)?.title}
                           </h4>
                           <p className="text-xs text-slate-500">Tổng % các công tác trong giai đoạn này phải bằng 100% (Tính theo tỷ trọng nội bộ của GĐ)</p>
                        </div>
                        <span className={`text-sm font-black px-3 py-1.5 rounded-lg ${Math.abs(Object.values(tempWeights.taskWeights[activeConfigStageId] || {}).reduce((a,b)=>a+b,0) - 100) < 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                           Sub-Total: {Object.values(tempWeights.taskWeights[activeConfigStageId] || {}).reduce((a,b)=>a+b,0).toFixed(1)}%
                        </span>
                     </div>

                     <div className="space-y-4">
                        {STAGES.find(s => s.id === activeConfigStageId)?.items.map((taskName, idx) => {
                           const weight = tempWeights.taskWeights[activeConfigStageId]?.[taskName] || 0;
                           return (
                              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-200 transition-colors">
                                 <span className="font-bold text-slate-700 text-sm flex-1 mr-4">{taskName}</span>
                                 
                                 <div className="flex items-center gap-3">
                                    <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
                                       <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, weight)}%` }}></div>
                                    </div>
                                    <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-lg px-2 py-1.5 shadow-sm">
                                       <input 
                                          type="number" 
                                          value={weight}
                                          onChange={(e) => handleTaskWeightChange(activeConfigStageId, taskName, e.target.value)}
                                          className="w-14 text-right outline-none font-bold text-indigo-700"
                                          step="0.5"
                                       />
                                       <span className="text-xs font-bold text-slate-400">%</span>
                                    </div>
                                 </div>
                              </div>
                           )
                        })}
                     </div>
                  </div>
               </div>

               {/* Modal Footer */}
               <div className="p-5 border-t border-slate-100 bg-white rounded-b-2xl flex justify-between items-center">
                  <div className="flex items-center gap-2 text-xs text-orange-500 font-medium">
                     <AlertCircle size={16} />
                     <span>Lưu ý: Thay đổi này sẽ ảnh hưởng đến cách tính điểm KPI toàn hệ thống.</span>
                  </div>
                  <div className="flex gap-3">
                     <button 
                        onClick={() => setIsWeightModalOpen(false)}
                        className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors"
                     >
                        Hủy Bỏ
                     </button>
                     <button 
                        onClick={saveWeights}
                        className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                     >
                        <Save size={18} /> Lưu Cấu Hình
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

      <FixedFooter view="KPI_DASHBOARD" />
    </div>
  );
};

// Sub-component for Sliders
const SkillSlider: React.FC<{ icon: React.ReactNode; label: string; desc: string; value: number; onChange: (val: number) => void }> = ({ icon, label, desc, value, onChange }) => (
  <div className="flex items-center gap-4">
     <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500">
        {icon}
     </div>
     <div className="flex-1">
        <div className="flex justify-between items-end mb-1">
           <div>
              <div className="text-sm font-bold text-slate-700">{label}</div>
              <div className="text-[10px] text-slate-400">{desc}</div>
           </div>
           <div className={`text-lg font-black ${value >= 8 ? 'text-green-600' : (value >= 5 ? 'text-orange-500' : 'text-red-500')}`}>
              {value}
           </div>
        </div>
        <input 
          type="range" 
          min="1" max="10" step="0.5"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600 hover:accent-purple-500 transition-all"
        />
     </div>
  </div>
);

// Lucide icon helper for 'Flag' since it wasn't imported in main list
const Flag = ({ size, className }: { size: number, className?: string }) => (
   <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
);

export default KPIDashboard;
