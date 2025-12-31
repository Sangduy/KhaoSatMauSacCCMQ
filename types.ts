export interface UserProfile {
  sequenceNumber: number; // Số thứ tự đếm
  patientCode: string; // Mã bệnh nhân (Viết tắt + STT)
  fullName: string;
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

// Dữ liệu chỉ số lâm sàng (Admin nhập)
export interface ClinicalData {
  pre: { file: string };
  postImmediate: { file: string };
  post10Min: { file: string };
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