
import { StageDefinition, AppLink, Employee, KpiWeightConfig } from './types';

// *** BRANDING ASSETS ***
export const LOGO_URL = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MTIgNTEyIj48cGF0aCBkPSJNMjU2IDMyTDMyIDIyNEg5NlY0NDhIMjA4VjMyMEgzMDRWNDQ4SDQxNlYyMjRINDQ4TDI1NiAzMloiIGZpbGw9IiM5OTFiMWIiIHN0cm9rZT0iIzljNDIyMSIgc3Ryb2tlLXdpZHRoPSIxMCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==";

// *** CRITICAL DATA CONFIGURATION ***
export const API_URL = "https://script.google.com/macros/s/AKfycbyb1P0yXb1P0yXb1P0yXb1P0yXb1P0y/exec"; 

export const STANDARD_TASKS = [
  "Khảo sát hiện trạng",
  "Phác thảo ý tưởng (Concept)",
  "Dựng hình 3D (SketchUp/3DsMax)",
  "Render phối cảnh",
  "Triển khai bản vẽ 2D (CAD)",
  "Kiểm tra hồ sơ (Check)",
  "Trình duyệt cấp trên",
  "Họp khách hàng",
  "Hậu kỳ (Photoshop)",
  "Bóc tách khối lượng",
  "Giám sát tác giả"
];

// MAPPING: Stage Index -> Specific Tasks (STRICT UPDATE)
export const STAGE_TASK_MAPPING: Record<number, string[]> = {
  1: ["Khảo sát hiện trạng", "Check quy hoạch (Pháp lý sơ bộ)", "Mặt bằng bố trí công năng (Layout 2D)", "Chuẩn bị ý tưởng"],
  2: ["View chính diện - view xéo - view cổng ngõ", "Phối cảnh sân vườn", "Phối cảnh sân thượng"],
  3: ["Mặt bằng-đứng-cắt sơ bộ & hầm tự hoại & móng", "Hỗ trợ nộp hồ sơ"],
  4: ["Phòng khách + Bếp + Phòng ngủ Master", "Các Phòng ngủ còn lại + Phòng thờ + Wc + không gian phụ"],
  5: ["Mặt bằng định vị Móng & Chi tiết Móng", "Mặt bằng định vị Cột & Chi tiết Cột", "Mặt bằng Dầm - Sàn các tầng", "Chi tiết kết cấu phụ"],
  6: ["Sơ đồ nguyên lý", "Mặt bằng Ổ cắm", "Hệ thống Điện nhẹ (ELV)", "Mặt bằng Cấp - Thoát nước", "Mặt bằng Điều hòa không khí", "Mặt bằng Chiếu sáng"],
  7: ["Kiểm soát mặt bằng và đồng bộ 3D phối cảnh", "Chi tiết Lát sàn", "Triển khai mặt đứng/mặt cắt thi công", "Chi tiết Thang bộ", "Chi tiết Vệ sinh (WC)", "Chi tiết Cửa (Thống kê cửa)", "Chi tiết Cổng/Tường rào", "Chi tiết Mái che/Giếng trời & Sê-nô", "Chi tiết sân vườn", "Chi tiết tường trang trí", "Chi tiết Trần & Đèn", "Triển khai nội thất kích thước", "Triển khai nội thất chi tiết"],
  8: ["Kiểm tra rà soát thông tin", "Kiểm tra đồng bộ phối cảnh và hồ sơ"],
  9: ["Trình mẫu & Duyệt vật liệu thực tế", "Ký chốt hồ sơ Bàn giao", "Lưu hệ thống file và khóa hồ sơ"]
};

// UPDATED STAGES WITH NEW WEIGHTS
export const STAGES: StageDefinition[] = [
  {
    id: 1,
    title: "Giai đoạn 1: Chuẩn bị & Chốt phương án (Concept)",
    percentage: 11,
    items: STAGE_TASK_MAPPING[1]
  },
  {
    id: 2,
    title: "Giai đoạn 2: 3D Mặt tiền",
    percentage: 20.5,
    items: STAGE_TASK_MAPPING[2]
  },
  {
    id: 3,
    title: "Giai đoạn 3: Hồ sơ Xin phép xây dựng",
    percentage: 1.5,
    items: STAGE_TASK_MAPPING[3]
  },
  {
    id: 4,
    title: "Giai đoạn 4: 3D Nội thất",
    percentage: 31.5,
    items: STAGE_TASK_MAPPING[4]
  },
  {
    id: 5,
    title: "Giai đoạn 5: Phần Kết Cấu",
    percentage: 9,
    items: STAGE_TASK_MAPPING[5]
  },
  {
    id: 6,
    title: "Giai đoạn 6: Phần Điện - Nước (M.E.P)",
    percentage: 7.5,
    items: STAGE_TASK_MAPPING[6]
  },
  {
    id: 7,
    title: "Giai đoạn 7: Phần Kiến Trúc (Bổ chi tiết)",
    percentage: 14,
    items: STAGE_TASK_MAPPING[7]
  },
  {
    id: 8,
    title: "Giai đoạn 8: Kiểm soát hồ sơ thi công",
    percentage: 3,
    items: STAGE_TASK_MAPPING[8]
  },
  {
    id: 9,
    title: "Giai đoạn 9: Ký chốt hồ sơ và lựa chọn vật liệu",
    percentage: 2.5,
    items: STAGE_TASK_MAPPING[9]
  }
];

// Generates default weights based on strict client requirements
export const DEFAULT_KPI_WEIGHTS: KpiWeightConfig = {
  stageWeights: {
    1: 11, 
    2: 20.5, 
    3: 1.5, 
    4: 31.5, 
    5: 9, 
    6: 7.5, 
    7: 14, 
    8: 3, 
    9: 2.5
  },
  taskWeights: {
    1: {
      "Khảo sát hiện trạng": 9,
      "Check quy hoạch (Pháp lý sơ bộ)": 2,
      "Mặt bằng bố trí công năng (Layout 2D)": 80,
      "Chuẩn bị ý tưởng": 9
    },
    2: {
      "View chính diện - view xéo - view cổng ngõ": 82,
      "Phối cảnh sân vườn": 9,
      "Phối cảnh sân thượng": 9
    },
    3: {
      "Mặt bằng-đứng-cắt sơ bộ & hầm tự hoại & móng": 65,
      "Hỗ trợ nộp hồ sơ": 35
    },
    4: {
      "Phòng khách + Bếp + Phòng ngủ Master": 40,
      "Các Phòng ngủ còn lại + Phòng thờ + Wc + không gian phụ": 60
    },
    5: {
      "Mặt bằng định vị Móng & Chi tiết Móng": 25,
      "Mặt bằng định vị Cột & Chi tiết Cột": 25,
      "Mặt bằng Dầm - Sàn các tầng": 25,
      "Chi tiết kết cấu phụ": 25
    },
    6: {
      "Sơ đồ nguyên lý": 16.6,
      "Mặt bằng Ổ cắm": 16.6,
      "Hệ thống Điện nhẹ (ELV)": 16.6,
      "Mặt bằng Cấp - Thoát nước": 16.6,
      "Mặt bằng Điều hòa không khí": 16.6,
      "Mặt bằng Chiếu sáng": 17
    },
    7: {
      "Kiểm soát mặt bằng và đồng bộ 3D phối cảnh": 7.6,
      "Chi tiết Lát sàn": 7.7,
      "Triển khai mặt đứng/mặt cắt thi công": 7.7,
      "Chi tiết Thang bộ": 7.7,
      "Chi tiết Vệ sinh (WC)": 7.7,
      "Chi tiết Cửa (Thống kê cửa)": 7.7,
      "Chi tiết Cổng/Tường rào": 7.7,
      "Chi tiết Mái che/Giếng trời & Sê-nô": 7.7,
      "Chi tiết sân vườn": 7.7,
      "Chi tiết tường trang trí": 7.7,
      "Chi tiết Trần & Đèn": 7.7,
      "Triển khai nội thất kích thước": 7.7,
      "Triển khai nội thất chi tiết": 7.7
    },
    8: {
      "Kiểm tra rà soát thông tin": 50,
      "Kiểm tra đồng bộ phối cảnh và hồ sơ": 50
    },
    9: {
      "Trình mẫu & Duyệt vật liệu thực tế": 33.3,
      "Ký chốt hồ sơ Bàn giao": 33.3,
      "Lưu hệ thống file và khóa hồ sơ": 33.4
    }
  }
};

export const YEARS = ["2025", "2026", "2027", "2028", "2029", "2030"];

export const INITIAL_METADATA = {
  chuDauTu: "",
  ngayTraoDoi: "",
  ngayThiCong: "",
  nguonKhachHang: "",
  tongChiPhi: "",
  diaChi: "",
  ktsChuTri: "",
  noiThatChuTri: "",
  hoSoThiCongChuTri: "",
  tuVanChamKhach: "",
  thongTinKhac: "",
  isPriority: false,
  isConstruction: false,
  // New defaults
  dienTichSuDung: "",
  dienTichSanVuon: "",
  diemKPI: ""
};

// HR CONFIGURATION
export const EMPLOYEE_ROLES = [
  "CEO",
  "GIÁM ĐỐC",
  "PHÓ GIÁM ĐỐC",
  "TRƯỞNG PHÒNG",
  "PHÓ PHÒNG",
  "KIẾN TRÚC SƯ",
  "TK NỘI THẤT",
  "THIẾT KẾ",
  "KỸ SƯ",
  "KẾT CẤU",
  "HỌA VIÊN",
  "TK TRIỂN KHAI"
];

// Avatar Visual Config
const AVATAR_SEEDS: Record<string, string> = {
  "THỦY": "Sophie",     // Female
  "HUY": "Midnight",    // Male with Long Hair
  "SƠN": "Felix",       // Male
  "HOÀNG": "Ryan",      // Male
  "HIẾU": "Mason",      // Male
  "VINH": "Caleb",      // Male
  "DÂN": "Nolan",       // Male
  "VIỆT": "Chase"       // Male
};

// Helper to generate strict avatar
export const getAvatarUrl = (name: string) => {
  const cleanName = name.trim().toUpperCase();
  const seed = AVATAR_SEEDS[cleanName] || cleanName;
  // Using 'adventurer' style for distinct characters as requested
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed}&backgroundColor=b6e3f4`;
};

// Initial Data Seed (Only used if localStorage is empty)
export const INITIAL_EMPLOYEES: Employee[] = [
  { 
    id: "EMP-001", 
    name: "HUY", 
    role: "TRƯỞNG PHÒNG", 
    targetKPI: 24000, 
    avatarUrl: getAvatarUrl("HUY"), 
    attitudeScores: { tacPhong: 9, hoatDong: 8, phanHoiKH: 9, thaiDo: 9, ungXu: 9 } 
  },
  { 
    id: "EMP-002", 
    name: "THỦY", 
    role: "TK NỘI THẤT", 
    targetKPI: 19500, 
    avatarUrl: getAvatarUrl("THỦY"), 
    attitudeScores: { tacPhong: 8, hoatDong: 9, phanHoiKH: 9, thaiDo: 8, ungXu: 9 } 
  },
  { 
    id: "EMP-003", 
    name: "VIỆT", 
    role: "TK TRIỂN KHAI", 
    targetKPI: 16500, 
    avatarUrl: getAvatarUrl("VIỆT"), 
    attitudeScores: { tacPhong: 8, hoatDong: 8, phanHoiKH: 8, thaiDo: 8, ungXu: 8 } 
  },
  { 
    id: "EMP-004", 
    name: "SƠN", 
    role: "TRƯỞNG PHÒNG", 
    targetKPI: 12000, 
    avatarUrl: getAvatarUrl("SƠN"), 
    attitudeScores: { tacPhong: 9, hoatDong: 8, phanHoiKH: 9, thaiDo: 9, ungXu: 9 } 
  },
  { 
    id: "EMP-005", 
    name: "DÂN", 
    role: "HỌA VIÊN", 
    targetKPI: 12000, 
    avatarUrl: getAvatarUrl("DÂN"), 
    attitudeScores: { tacPhong: 8, hoatDong: 8, phanHoiKH: 8, thaiDo: 8, ungXu: 8 } 
  },
  { 
    id: "EMP-006", 
    name: "HIẾU", 
    role: "KẾT CẤU", 
    targetKPI: 11250, 
    avatarUrl: getAvatarUrl("HIẾU"), 
    attitudeScores: { tacPhong: 8, hoatDong: 8, phanHoiKH: 8, thaiDo: 8, ungXu: 8 } 
  },
  { 
    id: "EMP-007", 
    name: "HOÀNG", 
    role: "KIẾN TRÚC SƯ", 
    targetKPI: 10500, 
    avatarUrl: getAvatarUrl("HOÀNG"), 
    attitudeScores: { tacPhong: 8, hoatDong: 7, phanHoiKH: 8, thaiDo: 8, ungXu: 8 } 
  },
  { 
    id: "EMP-008", 
    name: "VINH", 
    role: "KIẾN TRÚC SƯ", 
    targetKPI: 9000, 
    avatarUrl: getAvatarUrl("VINH"), 
    attitudeScores: { tacPhong: 8, hoatDong: 8, phanHoiKH: 8, thaiDo: 8, ungXu: 8 } 
  }
];

export const DEFAULT_APP_LINKS: AppLink[] = [
  {
    id: 'app-1',
    name: 'Thiết Kế Ngoại thất (Tạo siêu nhanh)',
    description: 'Công cụ tạo hình ảnh nhanh, thân thiện với điện thoại.',
    defaultUrl: 'https://aistudio.google.com/app/apps/drive/1-wJQICz7Ro8Kx-EG0PGeTwffAWu9VUMZ?showPreview=true&showAssistant=true&fullscreenApplet=true',
    imageUrl: 'https://images.unsplash.com/photo-1517581177697-a06a595e3be2?q=80&w=800&auto=format&fit=crop',
    isFavorite: true
  },
  {
    id: 'app-2',
    name: 'Thiết kế Ngoại thất (Bản cao cấp)',
    description: 'Tạo phối cảnh chuyên nghiệp, dành cho nội bộ Tân Phát.',
    defaultUrl: 'https://aistudio.google.com/apps/drive/1DhViEaAYwL7-PCMb9ziNxghMMby-o0f3?showPreview=true&showAssistant=true&fullscreenApplet=true',
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=800&auto=format&fit=crop',
    isFavorite: true
  },
  {
    id: 'app-3',
    name: 'Thiết kế Nội thất (bản cao cấp)',
    description: 'Tạo và điều chỉnh ảnh nội thất.',
    defaultUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=800&auto=format&fit=crop',
    isFavorite: false
  },
  {
    id: 'app-4',
    name: 'Thiết kế poster chuyên nghiệp',
    description: 'Tạo ấn phẩm truyền thông, quảng cáo.',
    defaultUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=800&auto=format&fit=crop',
    isFavorite: false
  },
  {
    id: 'app-5',
    name: 'Ứng dụng tạo video chuyên nghiệp',
    description: 'Công cụ dựng video, motion graphics.',
    defaultUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?q=80&w=800&auto=format&fit=crop',
    isFavorite: false
  },
  {
    id: 'app-6',
    name: 'Triển khai hồ sơ cơ sở',
    description: 'Triển khai bản vẽ từ hình ảnh (Ngoại thất, Nội thất).',
    defaultUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?q=80&w=800&auto=format&fit=crop',
    isFavorite: false
  },
  {
    id: 'app-7',
    name: 'Tạo phối cảnh tổng thể từ mặt bằng',
    description: 'Chuyển bản vẽ 2D thành phối cảnh 3D tổng thể.',
    defaultUrl: '#',
    imageUrl: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?q=80&w=800&auto=format&fit=crop',
    isFavorite: false
  }
];
