

import { Project, PlanningEntry } from '../types';
import { API_URL, INITIAL_METADATA } from '../constants';

const STORAGE_KEY = 'TANPHAT_OFFLINE_DATA_V1';
const PLANNING_STORAGE_KEY = 'TANPHAT_PLANNING_DATA_V1';

// --- OFFLINE / MOCK HELPERS ---

const getLocalData = (): Project[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.warn("LocalStorage access failed:", e);
    return [];
  }
};

const setLocalData = (data: Project[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn("LocalStorage write failed:", e);
  }
};

const getLocalPlanningData = (): PlanningEntry[] => {
  try {
    const data = localStorage.getItem(PLANNING_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

const setLocalPlanningData = (data: PlanningEntry[]) => {
  localStorage.setItem(PLANNING_STORAGE_KEY, JSON.stringify(data));
};

// Simulate network latency for better UX feel during demo
const mockDelay = () => new Promise(resolve => setTimeout(resolve, 600));

// --- API FUNCTIONS (PROJECTS) ---

export const fetchProjects = async (): Promise<Project[]> => {
  try {
    if (API_URL.includes("AKfycbyb1P0y")) {
      console.info("Using Offline Demo Mode (Placeholder URL detected)");
      throw new Error("DEMO_MODE");
    }

    const response = await fetch(`${API_URL}?action=read`);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];

  } catch (error: any) {
    if (error.message === "DEMO_MODE") {
       const localData = getLocalData();
       return localData;
    }
    console.error("CRITICAL: Data Connection Failed. Refusing to load stale data.", error);
    throw new Error("CONNECTION_FAILED");
  }
};

export const createProject = async (project: Partial<Project>): Promise<any> => {
  try {
    if (API_URL.includes("AKfycbyb1P0y")) throw new Error("DEMO_MODE");

    const payload = { action: 'create', ...project };
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await response.json();

  } catch (error) {
    await mockDelay();
    const projects = getLocalData();
    const newId = `LOCAL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newProject: Project = {
      id: newId,
      maSoDuAn: project.maSoDuAn || `TP${project.nam || new Date().getFullYear()}-000`,
      nam: project.nam || new Date().getFullYear().toString(),
      tenDuAn: project.tenDuAn || 'Dự án mới',
      trangThai: 'Đang thực hiện',
      metadata: project.metadata || INITIAL_METADATA,
      stageData: project.stageData || {},
      lastUpdated: new Date().toISOString()
    };
    projects.push(newProject);
    setLocalData(projects);
    return { status: 'success', id: newId, data: newProject };
  }
};

export const updateProject = async (project: Project): Promise<any> => {
  try {
    if (API_URL.includes("AKfycbyb1P0y")) throw new Error("DEMO_MODE");

    const payload = {
      action: 'update',
      id: project.id,
      maSoDuAn: project.maSoDuAn,
      tenDuAn: project.tenDuAn,
      trangThai: project.trangThai,
      metadata: project.metadata,
      stageData: project.stageData
    };
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await response.json();

  } catch (error) {
    await mockDelay();
    const projects = getLocalData();
    const index = projects.findIndex(p => p.id === project.id);
    if (index !== -1) {
      projects[index] = { ...project, lastUpdated: new Date().toISOString() };
      setLocalData(projects);
      return { status: 'success' };
    }
    return { status: 'error', message: 'Project not found locally' };
  }
};

export const deleteProject = async (id: string, securityKey: string): Promise<any> => {
  try {
    if (API_URL.includes("AKfycbyb1P0y")) throw new Error("DEMO_MODE");

    const payload = { action: 'delete', id, securityKey };
    const response = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await response.json();

  } catch (error) {
    await mockDelay();
    if (securityKey !== "TANPHAT") {
      return { status: 'error', message: 'Invalid Security Key' };
    }
    
    const projects = getLocalData();
    const filtered = projects.filter(p => p.id !== id);
    setLocalData(filtered);
    return { status: 'success' };
  }
};

// --- API FUNCTIONS (PLANNING / SCHEDULE) ---

export const fetchPlanning = async (): Promise<PlanningEntry[]> => {
  try {
    if (API_URL.includes("AKfycbyb1P0y")) throw new Error("DEMO_MODE");
    
    // Assumes backend handles ?action=readPlanning
    const response = await fetch(`${API_URL}?action=readPlanning`);
    if (!response.ok) throw new Error("Planning Fetch Failed");
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    // Fallback for Planning Data
    return getLocalPlanningData();
  }
};

export const createPlanningEntry = async (entry: PlanningEntry): Promise<any> => {
  try {
    if (API_URL.includes("AKfycbyb1P0y")) throw new Error("DEMO_MODE");

    // UPDATED: Use 'create_plan' as requested by the user's backend spec
    const payload = { action: 'create_plan', ...entry };
    const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    return await response.json();
  } catch (error) {
    await mockDelay();
    const plans = getLocalPlanningData();
    plans.push(entry);
    setLocalPlanningData(plans);
    return { status: 'success', data: entry };
  }
};

export const updatePlanningEntry = async (entry: PlanningEntry): Promise<any> => {
  try {
    if (API_URL.includes("AKfycbyb1P0y")) throw new Error("DEMO_MODE");

    const payload = { action: 'update_plan', ...entry };
    const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    return await response.json();
  } catch (error) {
    await mockDelay();
    const plans = getLocalPlanningData();
    const index = plans.findIndex(p => p.planId === entry.planId);
    if (index !== -1) {
      plans[index] = entry;
      setLocalPlanningData(plans);
      return { status: 'success', data: entry };
    }
    // If not found, create it (fallback behavior)
    plans.push(entry);
    setLocalPlanningData(plans);
    return { status: 'success', data: entry };
  }
};

export const deletePlanningEntry = async (planId: string): Promise<any> => {
  try {
    if (API_URL.includes("AKfycbyb1P0y")) throw new Error("DEMO_MODE");

    const payload = { action: 'delete_plan', planId };
    const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    return await response.json();
  } catch (error) {
    await mockDelay();
    const plans = getLocalPlanningData();
    const filtered = plans.filter(p => p.planId !== planId);
    setLocalPlanningData(filtered);
    return { status: 'success' };
  }
};

export const updatePlanningKPI = async (planId: string, score: number, comment: string): Promise<any> => {
  try {
    if (API_URL.includes("AKfycbyb1P0y")) throw new Error("DEMO_MODE");

    const payload = { action: 'updateKPI', planId, score, comment };
    const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
    return await response.json();
  } catch (error) {
    await mockDelay();
    const plans = getLocalPlanningData();
    const index = plans.findIndex(p => p.planId === planId);
    if (index !== -1) {
      plans[index].managerKpiScore = score;
      plans[index].managerKpiComment = comment;
      plans[index].status = 'COMPLETED'; // Auto-complete on review
      setLocalPlanningData(plans);
      return { status: 'success' };
    }
    return { status: 'error', message: 'Plan not found' };
  }
};
