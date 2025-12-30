
import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import ProjectDetail from './components/ProjectDetail';
import Hub from './components/Hub';
import Planning from './components/Planning';
import AIAgent from './components/AIAgent';
import AppSettings from './components/AppSettings';
import MonthlyPlanList from './components/MonthlyPlanList';
import KPIDashboard from './components/KPIDashboard';
import { Project, AppLink, Employee, KpiWeightConfig } from './types';
import { fetchProjects, createProject } from './services/api';
import { DEFAULT_APP_LINKS, INITIAL_EMPLOYEES, DEFAULT_KPI_WEIGHTS, getAvatarUrl } from './constants';
import { WifiOff, RefreshCw } from 'lucide-react';

type ViewState = 'LOGIN' | 'HUB' | 'PROJECT_DASHBOARD' | 'DETAIL' | 'PLANNING' | 'AI_AGENT' | 'APP_SETTINGS' | 'MONTHLY_PLAN' | 'KPI_DASHBOARD';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('LOGIN');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('2025');
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  // --- 1. GLOBAL TEAM STATE (REFACTORED to Employee[]) ---
  const [teamMembers, setTeamMembers] = useState<Employee[]>([]);

  // --- 2. GLOBAL APP LINKS STATE ---
  const [appLinks, setAppLinks] = useState<AppLink[]>(DEFAULT_APP_LINKS);

  // --- 3. GLOBAL KPI WEIGHT CONFIG ---
  const [kpiWeightConfig, setKpiWeightConfig] = useState<KpiWeightConfig>(DEFAULT_KPI_WEIGHTS);

  useEffect(() => {
    // --- MIGRATION LOGIC: STRING[] -> EMPLOYEE[] ---
    // Updated to V3 to enforce new KPI targets
    const savedMembersV3 = localStorage.getItem('tanphat_team_members_v3');
    
    if (savedMembersV3) {
      // Load New Format
      try {
        setTeamMembers(JSON.parse(savedMembersV3));
      } catch (e) {
        setTeamMembers(INITIAL_EMPLOYEES);
      }
    } else {
      // V3 doesn't exist, ignore V2 and V1 to enforce fresh defaults with correct targets
      setTeamMembers(INITIAL_EMPLOYEES);
      localStorage.setItem('tanphat_team_members_v3', JSON.stringify(INITIAL_EMPLOYEES));
    }

    // Load App Links
    const savedAppLinks = localStorage.getItem('tanphat_app_links');
    if (savedAppLinks) {
      setAppLinks(JSON.parse(savedAppLinks));
    }

    // Load KPI Weights (Using V2 key to enforce new defaults)
    const savedWeights = localStorage.getItem('TANPHAT_KPI_WEIGHTS_V2');
    if (savedWeights) {
      try {
        setKpiWeightConfig(JSON.parse(savedWeights));
      } catch (e) {
        setKpiWeightConfig(DEFAULT_KPI_WEIGHTS);
      }
    } else {
      // If V2 doesn't exist, use defaults immediately (ignores old V1 if exists to enforce new rules)
      setKpiWeightConfig(DEFAULT_KPI_WEIGHTS);
    }
  }, []);

  // Persist Team Changes (V3)
  useEffect(() => {
    if (teamMembers.length > 0) {
      localStorage.setItem('tanphat_team_members_v3', JSON.stringify(teamMembers));
      // Keep legacy sync for safety (names only)
      localStorage.setItem('tanphat_team_members', JSON.stringify(teamMembers.map(e => e.name)));
    }
  }, [teamMembers]);

  // Persist App Link Changes
  useEffect(() => {
    if (appLinks.length > 0) {
      localStorage.setItem('tanphat_app_links', JSON.stringify(appLinks));
    }
  }, [appLinks]);

  // Persist KPI Weights (V2)
  useEffect(() => {
    localStorage.setItem('TANPHAT_KPI_WEIGHTS_V2', JSON.stringify(kpiWeightConfig));
  }, [kpiWeightConfig]);

  // Initial Data Load
  const loadData = async () => {
    setIsLoading(true);
    setDataError(null);
    try {
      const data = await fetchProjects();
      setProjects(data);
    } catch (error: any) {
      console.error("Data Load Error:", error);
      if (error.message === 'CONNECTION_FAILED') {
        setDataError("Lỗi kết nối dữ liệu. Vui lòng kiểm tra đường truyền hoặc cấu hình API.");
      } else {
        setDataError("Có lỗi xảy ra khi tải dữ liệu.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (view === 'PROJECT_DASHBOARD' || view === 'AI_AGENT' || view === 'PLANNING' || view === 'MONTHLY_PLAN' || view === 'KPI_DASHBOARD') {
      loadData();
    }
  }, [view]);

  // Handle Login -> Go to HUB
  const handleLogin = () => {
    setView('HUB');
  };

  // Create Project in Dashboard
  const handleCreateProject = async () => {
    const tempName = `Dự án mới ${selectedYear}`;
    const res = await createProject({
      nam: selectedYear,
      tenDuAn: tempName
    });
    
    if (res.status === 'success') {
      await loadData();
    } else {
      alert("Lỗi tạo dự án: " + res.message);
    }
  };

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
    setView('DETAIL');
  };

  const handleUpdateProjectInList = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    setCurrentProject(updatedProject);
  };

  const handleToggleFavoriteApp = (id: string) => {
    setAppLinks(prev => prev.map(app => 
      app.id === id ? { ...app, isFavorite: !app.isFavorite } : app
    ));
  };

  // --- DATA CONNECTION ERROR SCREEN ---
  if (dataError) {
    return (
      <div className="fixed inset-0 bg-slate-900 z-[999] flex flex-col items-center justify-center p-6 text-center">
         <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <WifiOff size={48} className="text-red-600" />
         </div>
         <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-wide">
           Lỗi Kết Nối Dữ Liệu
         </h2>
         <p className="text-slate-400 max-w-md mb-8">
           {dataError}
           <br/>
           Hệ thống không thể đồng bộ dữ liệu từ máy chủ. Vui lòng liên hệ quản trị viên để kiểm tra API URL.
         </p>
         <button 
           onClick={loadData}
           className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-red-500/30"
         >
           <RefreshCw size={20} /> Thử lại
         </button>
      </div>
    );
  }

  // Helper to get simple name list for legacy components
  const simpleTeamList = teamMembers.map(e => e.name);

  return (
    <>
      {view === 'LOGIN' && (
        <Login 
          onLogin={handleLogin} 
          appLinks={appLinks}
          onToggleFavorite={handleToggleFavoriteApp}
        />
      )}
      
      {view === 'HUB' && (
        <Hub 
          onSelectModule={(module) => setView(module)}
          onLogout={() => setView('LOGIN')}
          appLinks={appLinks}
        />
      )}

      {view === 'PLANNING' && (
        <Planning 
          projects={projects}
          teamMembers={simpleTeamList}
          onBack={() => setView('HUB')}
          onUpdateProject={handleUpdateProjectInList}
          onNavigateToMonthly={() => setView('MONTHLY_PLAN')} 
        />
      )}

      {view === 'MONTHLY_PLAN' && (
        <MonthlyPlanList 
          projects={projects}
          onBack={() => setView('HUB')}
          onSaveScope={() => setView('PLANNING')}
        />
      )}

      {view === 'AI_AGENT' && (
        <AIAgent 
          projects={projects}
          onBack={() => setView('HUB')}
        />
      )}

      {view === 'APP_SETTINGS' && (
        <AppSettings 
          appLinks={appLinks}
          onUpdateAppLinks={setAppLinks}
          onBack={() => setView('HUB')}
        />
      )}

      {view === 'KPI_DASHBOARD' && (
        <KPIDashboard 
          projects={projects}
          teamMembers={teamMembers}
          onUpdateTeamMembers={setTeamMembers}
          kpiWeightConfig={kpiWeightConfig}
          onUpdateKpiWeightConfig={setKpiWeightConfig}
          onBack={() => setView('HUB')}
        />
      )}
      
      {view === 'PROJECT_DASHBOARD' && (
        <Dashboard 
          projects={projects}
          selectedYear={selectedYear}
          onYearChange={setSelectedYear}
          onCreate={handleCreateProject}
          onSelectProject={handleSelectProject}
          onRefresh={loadData}
          onBackToHub={() => setView('HUB')}
          teamMembers={simpleTeamList}
        />
      )}

      {view === 'DETAIL' && currentProject && (
        <ProjectDetail 
          project={currentProject}
          onBack={() => setView('PROJECT_DASHBOARD')}
          onUpdate={handleUpdateProjectInList}
          teamMembers={simpleTeamList}
        />
      )}

      {isLoading && view !== 'LOGIN' && (
        <div className="fixed inset-0 bg-white/50 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </>
  );
};

export default App;
