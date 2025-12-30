
export interface Project {
  id: string;
  maSoDuAn: string; // Project Code (e.g., TP2025-001)
  nam: string; // Year
  tenDuAn: string;
  trangThai: string;
  metadata: ProjectMetadata;
  stageData: StageData;
  lastUpdated: string;
}

export interface ProjectMetadata {
  chuDauTu: string;
  ngayTraoDoi: string;
  ngayThiCong: string;
  nguonKhachHang: string;
  tongChiPhi: string;
  diaChi: string;
  ktsChuTri: string;
  noiThatChuTri: string;
  hoSoThiCongChuTri: string;
  tuVanChamKhach: string;
  thongTinKhac: string;
  // New Status Indicators
  isPriority?: boolean;
  isConstruction?: boolean;
  // New KPI & Area Fields
  dienTichSuDung?: string;
  dienTichSanVuon?: string;
  diemKPI?: string;
}

export interface StageData {
  [stageIndex: string]: {
    owner: string;
    checkedItems: boolean[];
  };
}

export interface StageDefinition {
  id: number;
  title: string;
  percentage: number;
  items: string[];
}

export interface AppLink {
  id: string;
  name: string;
  description: string;
  defaultUrl: string;
  imageUrl: string;
  isFavorite: boolean;
}

export type TaskStatus = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED';

export interface PlanningEntry {
  planId: string;
  assignedTo: string; // One of the team members
  projectId: string;
  maSoDuAn: string;
  stageIndex: number;
  taskType: string; // New field: Standardized task category
  detailedTask: string;
  startTime: string; // ISO 8601 YYYY-MM-DDTHH:mm
  endTime: string;   // ISO 8601 YYYY-MM-DDTHH:mm
  status: TaskStatus;
  managerKpiScore?: number; // 1-5
  managerKpiComment?: string;
}

// --- NEW HR TYPES ---

export interface Employee {
  id: string;
  name: string;
  role: string;
  avatarUrl: string;
  targetKPI: number; // Điểm KPI Mục Tiêu
  attitudeScores: {
    tacPhong: number;   // Tác phong làm việc
    hoatDong: number;   // Hoạt động phong trào
    phanHoiKH: number;  // Phản hồi khách hàng
    thaiDo: number;     // Thái độ với đồng nghiệp
    ungXu: number;      // Ứng xử văn hóa
  };
}

// --- KPI WEIGHT CONFIGURATION ---
export interface KpiWeightConfig {
  stageWeights: Record<number, number>; // Stage ID -> % (Total should be 100)
  taskWeights: Record<number, Record<string, number>>; // Stage ID -> { "Task Name": % } (Total per stage should be 100)
}
