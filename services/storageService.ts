import { UserProfile, SurveyData, ClinicalData, SurveyRecord, ASScores, ConsentRecord } from '../types';
import { CCMQ_QUESTIONS } from '../constants';
// Note: We avoid importing calculateASScores here to prevent circular dependency if scoreService imports storage.
// Instead, we will mock simple scores or let the UI recalculate.

const SEQUENCE_KEY = 'ccmq_sequence_counter';
const RECORDS_KEY = 'ccmq_records_db';
const CONSENTS_KEY = 'ccmq_consents_db'; // New key for independent consents
const SCRIPT_URL_KEY = 'ccmq_google_script_url';

// --- HELPER FUNCTIONS ---
export const getAbbreviation = (name: string): string => {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .trim()
    .split(/\s+/)
    .map(word => word[0])
    .join('')
    .toUpperCase();
};

// --- GOOGLE SCRIPT URL CONFIG ---
export const getGoogleScriptUrl = (): string => {
  return localStorage.getItem(SCRIPT_URL_KEY) || '';
};

export const setGoogleScriptUrl = (url: string) => {
  localStorage.setItem(SCRIPT_URL_KEY, url);
};

// --- SEQUENCE COUNTER LOGIC ---

export const getNextSequenceNumber = (): number => {
  try {
    const current = parseInt(localStorage.getItem(SEQUENCE_KEY) || '0', 10);
    const next = current + 1;
    localStorage.setItem(SEQUENCE_KEY, next.toString());
    return next;
  } catch (e) {
    console.error("Error accessing localStorage", e);
    return 1;
  }
};

export const getCurrentSequenceCounter = (): number => {
  try {
    return parseInt(localStorage.getItem(SEQUENCE_KEY) || '0', 10);
  } catch {
    return 0;
  }
};

export const setSequenceCounter = (value: number) => {
  try {
    localStorage.setItem(SEQUENCE_KEY, value.toString());
  } catch (e) {
    console.error("Error setting localStorage", e);
  }
};

// --- CONSENT RECORDS LOGIC (SEPARATE FILE) ---

export const getConsents = (): ConsentRecord[] => {
  try {
    const data = localStorage.getItem(CONSENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading consents", error);
    return [];
  }
};

export const saveConsent = (fullName: string) => {
  try {
    const consents = getConsents();
    const newConsent: ConsentRecord = {
      id: Date.now().toString(),
      fullName,
      timestamp: new Date().toISOString(),
      agreed: true
    };
    consents.push(newConsent);
    localStorage.setItem(CONSENTS_KEY, JSON.stringify(consents));
  } catch (error) {
    console.error("Error saving consent", error);
  }
};

// --- SURVEY RECORDS LOGIC ---

export const getRecords = (): SurveyRecord[] => {
  try {
    const data = localStorage.getItem(RECORDS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Error reading records", error);
    return [];
  }
};

export const saveRecord = (profile: UserProfile, surveyData: SurveyData, clinicalData: ClinicalData, asScores?: ASScores) => {
  try {
    const records = getRecords();
    
    // Check if record with this sequence number already exists to update it
    const existingIndex = records.findIndex(r => r.profile.sequenceNumber === profile.sequenceNumber);
    
    const newRecord: SurveyRecord = {
      id: existingIndex >= 0 ? records[existingIndex].id : Date.now().toString(),
      timestamp: new Date().toISOString(),
      profile,
      surveyData,
      clinicalData,
      asScores
    };

    if (existingIndex >= 0) {
      records[existingIndex] = newRecord; // Update
    } else {
      records.push(newRecord); // Insert
    }

    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Error saving record", error);
  }
};

export const deleteRecord = (id: string) => {
  try {
    const records = getRecords().filter(r => r.id !== id);
    localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Error deleting record", error);
  }
};

export const clearAllRecords = () => {
  localStorage.removeItem(RECORDS_KEY);
  localStorage.removeItem(CONSENTS_KEY); // Also clear consents when clearing all
};

// --- MOCK DATA GENERATOR ---
export const generateTestData = () => {
  const dummyNames = [
    "Nguyễn Văn An", "Trần Thị Bình", "Lê Văn Cường", "Phạm Thị Dung", "Hoàng Văn Em",
    "Vũ Thị Giang", "Đặng Văn Hùng", "Bùi Thị Hương", "Ngô Văn Khang", "Dương Thị Lan"
  ];
  
  const dummyClasses = ["YHCT20", "YHCT21", "YK20", "DUOC21"];
  
  const records: SurveyRecord[] = [];
  const consents: ConsentRecord[] = [];
  
  dummyNames.forEach((name, index) => {
    const seq = index + 1;
    const abbr = getAbbreviation(name);
    
    // Mock Profile
    const profile: UserProfile = {
      sequenceNumber: seq,
      patientCode: `${abbr}${seq}`,
      fullName: name,
      class: dummyClasses[index % dummyClasses.length],
      phoneNumber: `09${Math.floor(Math.random()*100000000)}`,
      yearOfBirth: (2000 + (index % 5)).toString(),
      gender: index % 2 === 0 ? 'Nam' : 'Nữ',
      weight: (50 + Math.random() * 30).toFixed(0),
      height: (155 + Math.random() * 25).toFixed(0)
    };

    // Mock Survey Data & Scores (Simulated)
    const surveyData: SurveyData = {};
    const type = index % 3; // 0: Healthy, 1: Sick 1, 2: Sick 2
    
    // Fill random data
    CCMQ_QUESTIONS.forEach(q => {
      // Logic giả lập: 
      // index 0,3,6,9 (Healthy): Trả lời 1-2 (Tốt)
      // index 1,4,7 (Sick): Trả lời 4-5 (Xấu)
      // index 2,5,8 (Random): 
      if (type === 0) {
        surveyData[q.id] = (Math.floor(Math.random() * 2) + 1) as 1|2; // 1 or 2
      } else if (type === 1) {
        surveyData[q.id] = (Math.floor(Math.random() * 2) + 4) as 4|5; // 4 or 5
      } else {
        surveyData[q.id] = (Math.floor(Math.random() * 5) + 1) as 1|2|3|4|5; // Random
      }
    });

    // Mock Scores based on survey data logic roughly
    const scores: ASScores = {
      binhHoa: type === 0 ? 75 : 40,
      duongHu: type === 1 ? 65 : 20,
      amHu: type === 2 ? 55 : 25,
      khiHu: type === 1 ? 60 : 22,
      damThap: 30, thapNhiet: 25, huyetU: 20, khiTre: 35, dacBiet: 15
    };
    
    // Mock Clinical Data
    const clinicalData: ClinicalData = {
      pre: { file: `img_pre_${seq}.jpg` },
      postImmediate: { file: `img_post_${seq}.jpg` },
      post10Min: { file: `img_10m_${seq}.jpg` },
      cuppingMarkTime: `${3 + Math.floor(Math.random() * 7)} ngày`
    };

    records.push({
      id: (Date.now() - index * 10000).toString(),
      timestamp: new Date(Date.now() - index * 86400000).toISOString(),
      profile,
      surveyData,
      clinicalData,
      asScores: scores
    });

    consents.push({
        id: (Date.now() - index * 10000).toString(),
        fullName: name,
        timestamp: new Date(Date.now() - index * 86400000).toISOString(),
        agreed: true
    });
  });

  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
  localStorage.setItem(CONSENTS_KEY, JSON.stringify(consents));
  localStorage.setItem(SEQUENCE_KEY, "10");
};

// --- CSV EXPORT LOGIC ---

const downloadCSV = (filename: string, content: string) => {
  const blob = new Blob(["\uFEFF" + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportConsentsToCSV = () => {
  const consents = getConsents();
  const header = ['ID', 'Thời gian đồng thuận', 'Họ và tên', 'Trạng thái'];
  const rows = consents.map(c => [
    c.id,
    new Date(c.timestamp).toLocaleString('vi-VN'),
    `"${c.fullName}"`,
    'Đã đồng thuận'
  ]);
  
  const content = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadCSV(`CCMQ_DanhSachDongThuan_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`, content);
};

export const exportAllRecordsToCSV = () => {
  const records = getRecords();
  if (!records.length) {
    alert("Chưa có dữ liệu để tải về!");
    return;
  }

  // Headers construction
  const headers = [
    "ID", "Thời gian", "Mã BN", "Họ Tên", "Lớp", "SĐT", "Năm Sinh", "Giới Tính", "Cân nặng", "Chiều cao",
    // Scores
    "AS Bình Hòa", "AS Dương Hư", "AS Âm Hư", "AS Khí Hư", "AS Đàm Thấp", "AS Thấp Nhiệt", "AS Huyết Ứ", "AS Khí Trệ", "AS Đặc Biệt",
    // Questions 1-60
    ...Array.from({length: 60}, (_, i) => `Q${i+1}`),
    // Clinical
    "File Trước", "File Ngay Sau", "File Sau 10p", "TG Mất Vết Giác"
  ];

  const csvRows = [headers.join(',')];

  records.forEach(rec => {
    const p = rec.profile;
    // Default 0 if score missing
    const s = rec.asScores || { binhHoa: 0, duongHu: 0, amHu: 0, khiHu: 0, damThap: 0, thapNhiet: 0, huyetU: 0, khiTre: 0, dacBiet: 0 };
    const c = rec.clinicalData;
    const q = rec.surveyData;

    const row = [
      rec.id, rec.timestamp, p.patientCode, `"${p.fullName}"`, p.class, `"${p.phoneNumber || ''}"`, p.yearOfBirth, p.gender, p.weight, p.height,
      s.binhHoa, s.duongHu, s.amHu, s.khiHu, s.damThap, s.thapNhiet, s.huyetU, s.khiTre, s.dacBiet,
      ...Array.from({length: 60}, (_, i) => q[i+1] || ''),
      `"${c.pre?.file || ''}"`,
      `"${c.postImmediate?.file || ''}"`,
      `"${c.post10Min?.file || ''}"`,
      `"${c.cuppingMarkTime || ''}"`
    ];
    csvRows.push(row.join(','));
  });

  downloadCSV(`CCMQ_TongHop_DuLieu_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`, csvRows.join('\n'));
};

export const exportToCSVs = (profile: UserProfile, surveyData: SurveyData, asScores: ASScores, clinicalData?: ClinicalData) => {
  // Safe default if clinicalData is missing
  const cData = clinicalData || {
    pre: { file: '' },
    postImmediate: { file: '' },
    post10Min: { file: '' },
    cuppingMarkTime: ''
  };
  
  // Also save to "Database" when exporting
  saveRecord(profile, surveyData, cData, asScores);

  const currentDate = new Date().toLocaleDateString('vi-VN');
  // Use patientCode for filename if available, fallback to sequenceNumber
  const fileId = profile.patientCode || profile.sequenceNumber;
  const sanitizedName = profile.fullName.trim().replace(/\s+/g, '_').replace(/\./g, '');
  const baseFilename = `CCMQ_${fileId}_${sanitizedName}`;

  // Common Info Headers
  // Replace plain STT with Mã BN
  const commonHeaders = ['Mã BN', 'Ngày', 'Họ Tên', 'Lớp', 'SĐT', 'Năm Sinh', 'Giới Tính'];
  const commonRow = [
    `"${profile.patientCode}"`, 
    `"${currentDate}"`, 
    `"${profile.fullName}"`,
    `"${profile.class}"`,
    `"${profile.phoneNumber || ''}"`,
    profile.yearOfBirth, 
    profile.gender
  ];

  // 1. FILE CÂU TRẢ LỜI (ANSWERS)
  const answersHeader = [...commonHeaders, ...CCMQ_QUESTIONS.map(q => `Câu ${q.id}`)];
  const answersRow = [...commonRow, ...CCMQ_QUESTIONS.map(q => surveyData[q.id] || '')];
  const answersContent = [answersHeader.join(','), answersRow.join(',')].join('\n');
  downloadCSV(`${baseFilename}_CauHoi.csv`, answersContent);

  // 2. FILE ĐIỂM SỐ (SCORES)
  setTimeout(() => {
    const scoresHeader = [
      ...commonHeaders, 
      'AS Bình Hòa', 'AS Dương Hư', 'AS Âm Hư', 'AS Khí Hư', 
      'AS Đàm Thấp', 'AS Thấp Nhiệt', 'AS Huyết Ứ', 'AS Khí Trệ', 'AS Đặc Biệt'
    ];
    const scoresRow = [
      ...commonRow,
      asScores.binhHoa, asScores.duongHu, asScores.amHu, asScores.khiHu,
      asScores.damThap, asScores.thapNhiet, asScores.huyetU, asScores.khiTre, asScores.dacBiet
    ];
    const scoresContent = [scoresHeader.join(','), scoresRow.join(',')].join('\n');
    downloadCSV(`${baseFilename}_DiemAS.csv`, scoresContent);
  }, 200); // Small delay to prevent browser blocking multiple downloads

  // 3. FILE LÂM SÀNG (CLINICAL)
  setTimeout(() => {
    const clinicalHeader = [
      ...commonHeaders,
      'File Trước',
      'File Ngay Sau',
      'File Sau 10p',
      'TG Mất Vết Giác'
    ];
    const clinicalRow = [
      ...commonRow,
      `"${cData.pre?.file || ''}"`,
      `"${cData.postImmediate?.file || ''}"`,
      `"${cData.post10Min?.file || ''}"`,
      `"${cData.cuppingMarkTime || ''}"`
    ];
    const clinicalContent = [clinicalHeader.join(','), clinicalRow.join(',')].join('\n');
    downloadCSV(`${baseFilename}_LamSang.csv`, clinicalContent);
  }, 400);
};