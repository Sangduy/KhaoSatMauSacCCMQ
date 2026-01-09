import { UserProfile, SurveyData, ClinicalData, SurveyRecord, ASScores, ConsentRecord } from '../types';
import { CCMQ_QUESTIONS } from '../constants';

const SEQUENCE_KEY = 'ccmq_sequence_counter';
const RECORDS_KEY = 'ccmq_records_db';
const CONSENTS_KEY = 'ccmq_consents_db';
const SCRIPT_URL_KEY = 'ccmq_google_script_url';

// --- QUAN TRỌNG: URL WEB APP MỚI ĐÃ ĐƯỢC CẬP NHẬT ---
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw5t8YpzNx7Qiii_YnZpistJiMhyqpleBwZpAZlyWTQ7tnYQ1fkkPJmCI1UXDDlHlMjEg/exec'; 

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
  return localStorage.getItem(SCRIPT_URL_KEY) || DEFAULT_SCRIPT_URL;
};

export const setGoogleScriptUrl = (url: string) => {
  localStorage.setItem(SCRIPT_URL_KEY, url);
};

// --- CLOUD SYNC LOGIC ---

// Hàm lấy dữ liệu từ Cloud (Dành cho Admin)
export const fetchRecordsFromCloud = async (scriptUrl: string): Promise<{ success: boolean; data?: SurveyRecord[]; message?: string }> => {
  try {
    const payload = {
      action: 'get_all' // Yêu cầu script trả về toàn bộ dữ liệu
    };

    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const resText = await response.text();
    const resJson = JSON.parse(resText);

    if (resJson.status === 'success' && Array.isArray(resJson.data)) {
      // Map lại dữ liệu để đảm bảo đúng format SurveyRecord
      // Vì script trả về mảng các JSON object đã được parse từ cột FULL_JSON_DATA
      const records: SurveyRecord[] = resJson.data.map((item: any) => ({
        id: item.profile?.patientCode || Date.now().toString(), // Fallback ID
        timestamp: item.timestamp,
        profile: item.profile,
        clinicalData: item.clinicalData,
        asScores: item.asScores,
        surveyData: item.surveyData
      }));
      
      return { success: true, data: records };
    } else {
      return { success: false, message: resJson.message || "Invalid Data Format" };
    }

  } catch (error: any) {
    console.error("Fetch Cloud Error:", error);
    return { success: false, message: error.message || "Network Error" };
  }
};

export const syncRecordToCloud = async (record: SurveyRecord | Omit<SurveyRecord, 'id'>, scriptUrl: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const payload = {
      action: 'save', // Mặc định là save/update
      profile: record.profile,
      clinicalData: record.clinicalData,
      asScores: record.asScores,
      surveyData: record.surveyData,
      timestamp: record.timestamp
    };

    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const resText = await response.text();
    
    try {
        const resJson = JSON.parse(resText);
        if (resJson.status === 'success') {
          return { success: true };
        } else {
          return { success: false, message: resJson.message || "Script Error" };
        }
    } catch (e) {
        if (response.ok) {
           return { success: true };
        } else {
           return { success: false, message: "Response Parse Error" };
        }
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Network Error" };
  }
};

export const backupDataToCloud = async (scriptUrl: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const csvContent = getAllRecordsCSVContent();
    if (!csvContent) {
      return { success: false, message: "Không có dữ liệu để sao lưu" };
    }

    const filename = `Backup_CCMQ_Full_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}_${Date.now()}.csv`;
    
    const payload = {
      action: 'backup_csv', 
      filename: filename,
      content: csvContent,
      mimeType: 'text/csv'
    };

    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const resText = await response.text();
    
    try {
        const resJson = JSON.parse(resText);
        if (resJson.status === 'success') {
          return { success: true };
        } else {
          return { success: false, message: resJson.message || "Script Error" };
        }
    } catch (e) {
        if (response.ok) return { success: true };
        return { success: false, message: "Response Parse Error" };
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Network Error" };
  }
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

// --- CONSENT RECORDS LOGIC ---

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
      records[existingIndex] = newRecord;
    } else {
      records.push(newRecord);
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
  localStorage.removeItem(CONSENTS_KEY);
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

    const surveyData: SurveyData = {};
    const type = index % 3; 
    
    CCMQ_QUESTIONS.forEach(q => {
      if (type === 0) {
        surveyData[q.id] = (Math.floor(Math.random() * 2) + 1) as 1|2; 
      } else if (type === 1) {
        surveyData[q.id] = (Math.floor(Math.random() * 2) + 4) as 4|5; 
      } else {
        surveyData[q.id] = (Math.floor(Math.random() * 5) + 1) as 1|2|3|4|5; 
      }
    });

    const scores: ASScores = {
      binhHoa: type === 0 ? 75 : 40,
      duongHu: type === 1 ? 65 : 20,
      amHu: type === 2 ? 55 : 25,
      khiHu: type === 1 ? 60 : 22,
      damThap: 30, thapNhiet: 25, huyetU: 20, khiTre: 35, dacBiet: 15
    };
    
    const clinicalData: ClinicalData = {
      pre: { 
        file: `img_pre_${seq}.jpg`,
        ei: (300 + Math.floor(Math.random() * 100)).toString(),
        mi: (150 + Math.floor(Math.random() * 50)).toString()
      },
      postImmediate: { 
        file: `img_post_${seq}.jpg`,
        ei: (400 + Math.floor(Math.random() * 100)).toString(),
        mi: (160 + Math.floor(Math.random() * 50)).toString()
      },
      post10Min: { 
        file: `img_10m_${seq}.jpg`,
        ei: (350 + Math.floor(Math.random() * 100)).toString(),
        mi: (155 + Math.floor(Math.random() * 50)).toString()
      },
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

// Tách logic tạo nội dung CSV để dùng chung cho Download và Upload
export const getAllRecordsCSVContent = (): string => {
  const records = getRecords();
  if (!records.length) {
    return "";
  }

  const headers = [
    "ID", "Thời gian", "Mã BN", "Họ Tên", "Lớp", "MSSV", "SĐT", "Năm Sinh", "Giới Tính", "Cân nặng", "Chiều cao",
    "AS Bình Hòa", "AS Dương Hư", "AS Âm Hư", "AS Khí Hư", "AS Đàm Thấp", "AS Thấp Nhiệt", "AS Huyết Ứ", "AS Khí Trệ", "AS Đặc Biệt",
    ...Array.from({length: 60}, (_, i) => `Q${i+1}`),
    "Pre_File", "Pre_EI", "Pre_MI",
    "PostImm_File", "PostImm_EI", "PostImm_MI",
    "Post10_File", "Post10_EI", "Post10_MI",
    "TG Mất Vết Giác"
  ];

  const csvRows = [headers.join(',')];

  records.forEach(rec => {
    const p = rec.profile;
    const s = rec.asScores || { binhHoa: 0, duongHu: 0, amHu: 0, khiHu: 0, damThap: 0, thapNhiet: 0, huyetU: 0, khiTre: 0, dacBiet: 0 };
    const c = rec.clinicalData;
    const q = rec.surveyData;

    const row = [
      rec.id, rec.timestamp, p.patientCode, `"${p.fullName}"`, p.class, `"${p.studentId || ''}"`, `"${p.phoneNumber || ''}"`, p.yearOfBirth, p.gender, p.weight, p.height,
      s.binhHoa, s.duongHu, s.amHu, s.khiHu, s.damThap, s.thapNhiet, s.huyetU, s.khiTre, s.dacBiet,
      ...Array.from({length: 60}, (_, i) => q[i+1] || ''),
      `"${c.pre?.file || ''}"`, `"${c.pre?.ei || ''}"`, `"${c.pre?.mi || ''}"`,
      `"${c.postImmediate?.file || ''}"`, `"${c.postImmediate?.ei || ''}"`, `"${c.postImmediate?.mi || ''}"`,
      `"${c.post10Min?.file || ''}"`, `"${c.post10Min?.ei || ''}"`, `"${c.post10Min?.mi || ''}"`,
      `"${c.cuppingMarkTime || ''}"`
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

export const exportAllRecordsToCSV = () => {
  const content = getAllRecordsCSVContent();
  if (!content) {
    alert("Chưa có dữ liệu để tải về!");
    return;
  }
  downloadCSV(`CCMQ_TongHop_DuLieu_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`, content);
};

export const exportToCSVs = (profile: UserProfile, surveyData: SurveyData, asScores: ASScores, clinicalData?: ClinicalData) => {
  const cData = clinicalData || {
    pre: { file: '', ei: '', mi: '' },
    postImmediate: { file: '', ei: '', mi: '' },
    post10Min: { file: '', ei: '', mi: '' },
    cuppingMarkTime: ''
  };
  
  saveRecord(profile, surveyData, cData, asScores);

  const currentDate = new Date().toLocaleDateString('vi-VN');
  const fileId = profile.patientCode || profile.sequenceNumber;
  const sanitizedName = profile.fullName.trim().replace(/\s+/g, '_').replace(/\./g, '');
  const baseFilename = `CCMQ_${fileId}_${sanitizedName}`;

  const commonHeaders = ['Mã BN', 'Ngày', 'Họ Tên', 'Lớp', 'MSSV', 'SĐT', 'Năm Sinh', 'Giới Tính'];
  const commonRow = [
    `"${profile.patientCode}"`, 
    `"${currentDate}"`, 
    `"${profile.fullName}"`,
    `"${profile.class}"`,
    `"${profile.studentId || ''}"`, 
    `"${profile.phoneNumber || ''}"`,
    profile.yearOfBirth, 
    profile.gender
  ];

  const answersHeader = [...commonHeaders, ...CCMQ_QUESTIONS.map(q => `Câu ${q.id}`)];
  const answersRow = [...commonRow, ...CCMQ_QUESTIONS.map(q => surveyData[q.id] || '')];
  const answersContent = [answersHeader.join(','), answersRow.join(',')].join('\n');
  downloadCSV(`${baseFilename}_CauHoi.csv`, answersContent);

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
  }, 200);

  setTimeout(() => {
    const clinicalHeader = [
      ...commonHeaders,
      'Pre_File', 'Pre_EI', 'Pre_MI',
      'PostImm_File', 'PostImm_EI', 'PostImm_MI',
      'Post10_File', 'Post10_EI', 'Post10_MI',
      'TG Mất Vết Giác'
    ];
    const clinicalRow = [
      ...commonRow,
      `"${cData.pre?.file || ''}"`, `"${cData.pre?.ei || ''}"`, `"${cData.pre?.mi || ''}"`,
      `"${cData.postImmediate?.file || ''}"`, `"${cData.postImmediate?.ei || ''}"`, `"${cData.postImmediate?.mi || ''}"`,
      `"${cData.post10Min?.file || ''}"`, `"${cData.post10Min?.ei || ''}"`, `"${cData.post10Min?.mi || ''}"`,
      `"${cData.cuppingMarkTime || ''}"`
    ];
    const clinicalContent = [clinicalHeader.join(','), clinicalRow.join(',')].join('\n');
    downloadCSV(`${baseFilename}_LamSang.csv`, clinicalContent);
  }, 400);
};
// Thêm hàm này vào services/storageService.ts

export const syncConsentToCloud = async (fullName: string, scriptUrl: string) => {
  try {
    const payload = {
      action: 'save_consent', // Báo cho Script biết đây là lưu đồng thuận
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      fullName: fullName
    };

    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const resJson = await response.json();
    return resJson.status === 'success';
  } catch (error) {
    console.error("Lỗi gửi đồng thuận:", error);
    return false;
  }
};
// xóa bản ghi
// Thêm vào cuối file storageService.ts

export const deleteRecordFromCloud = async (patientCode: string, scriptUrl: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const payload = {
      action: 'delete',
      id: patientCode // Với Cloud mode, ID chính là Mã BN
    };

    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });

    const resText = await response.text();
    const resJson = JSON.parse(resText);

    if (resJson.status === 'success') {
      return { success: true };
    } else {
      return { success: false, message: resJson.message || "Lỗi từ Script" };
    }
  } catch (error: any) {
    return { success: false, message: error.message || "Lỗi kết nối mạng" };
  }
};
