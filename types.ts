
export interface UserProfile {
  sequenceNumber: number; // Số thứ tự đếm
  patientCode: string; // Mã bệnh nhân (Viết tắt + STT)
  fullName: string;
  studentId: string;
  class: string; // Lớp
  phoneNumber?: string; // Số điện thoại (Optional)
  yearOfBirth: string;
  gender: 'Nam' | 'Nữ' | '';
  weight: string;
  height: string;
}

export interface Question {
  id: number;
  text: string;
  subText?: string;
}

export type AnswerValue = 1 | 2 | 3 | 4 | 5;

export interface SurveyData {
  [questionId: number]: AnswerValue;
}

export enum AppStep {
  CONSENT = 'CONSENT', // Bước 1: Đồng thuận
  INTRO = 'INTRO',     // Bước 2: Nhập thông tin chi tiết
  SURVEY = 'SURVEY',   // Bước 3: Khảo sát
  RESULTS = 'RESULTS'  // Bước 4: Kết quả
}

// Cấu trúc dữ liệu cho một giai đoạn lâm sàng
export interface ClinicalPhaseData {
  file: string;
  // 1. Huyệt Thận Du (BL23) - Bên Trái (Left)
  green_bl23_l: string; 
  red_bl23_l: string;
  ei_bl23_l: string;    
  mi_bl23_l: string;

  // 2. Huyệt Thận Du (BL23) - Bên Phải (Right)
  green_bl23_r: string; 
  red_bl23_r: string;
  ei_bl23_r: string;    
  mi_bl23_r: string;

  // 3. Huyệt Đại Trường Du (BL25) - Bên Trái (Left)
  green_bl25_l: string; 
  red_bl25_l: string;
  ei_bl25_l: string;    
  mi_bl25_l: string;

  // 4. Huyệt Đại Trường Du (BL25) - Bên Phải (Right)
  green_bl25_r: string; 
  red_bl25_r: string;
  ei_bl25_r: string;    
  mi_bl25_r: string;
}

// Dữ liệu chỉ số lâm sàng (Admin nhập)
export interface ClinicalData {
  pre: ClinicalPhaseData;
  postImmediate: ClinicalPhaseData;
  post10Min: ClinicalPhaseData;
  cuppingMarkTime: string; // Thời gian mất vết giác
}

export interface ASScores {
  binhHoa: number;      // Thể bình hòa
  duongHu: number;      // Thể dương hư
  amHu: number;         // Thể âm hư
  khiHu: number;        // Thể khí hư
  damThap: number;      // Thể đàm thấp
  thapNhiet: number;    // Thể thấp nhiệt
  huyetU: number;       // Thể huyết ứ
  khiTre: number;       // Thể khí trệ
  dacBiet: number;      // Thể đặc biệt
}

// Cấu trúc bản ghi khảo sát
export interface SurveyRecord {
  id: string; // unique timestamp id
  timestamp: string; // ISO date
  profile: UserProfile;
  surveyData: SurveyData;
  clinicalData: ClinicalData;
  asScores?: ASScores; 
}

// Cấu trúc bản ghi đồng thuận (Lưu riêng)
export interface ConsentRecord {
  id: string;
  fullName: string;
  timestamp: string;
  agreed: boolean;
}
