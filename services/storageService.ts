import { UserProfile, SurveyData, ClinicalData, SurveyRecord, ASScores, ConsentRecord } from '../types';
import { CCMQ_QUESTIONS } from '../constants';

const SEQUENCE_KEY = 'ccmq_sequence_counter';
const RECORDS_KEY = 'ccmq_records_db';
const CONSENTS_KEY = 'ccmq_consents_db';
const SCRIPT_URL_KEY = 'ccmq_google_script_url';

// URL mặc định
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

export const getGoogleScriptUrl = (): string => {
  return localStorage.getItem(SCRIPT_URL_KEY) || DEFAULT_SCRIPT_URL;
};

export const setGoogleScriptUrl = (url: string) => {
  localStorage.setItem(SCRIPT_URL_KEY, url);
};

// --- HÀM TÍNH TOÁN EI / MI (TÍCH HỢP TRỰC TIẾP) ---
export const calculateClinicalIndices = (red: string | number, green: string | number): { ei: string, mi: string } => {
  const rVal = typeof red === 'string' ? parseFloat(red) : red;
  const gVal = typeof green === 'string' ? parseFloat(green) : green;

  // Kiểm tra dữ liệu hợp lệ (không phải NaN và Green khác 0)
  if (isNaN(rVal) || isNaN(gVal) || gVal === 0) {
    return { ei: '', mi: '' };
  }

  const ei = Math.log10(rVal / gVal).toFixed(4);
  const mi = Math.log10(1 / gVal).toFixed(4);

  return { ei, mi };
};

// --- CLOUD SYNC LOGIC ---

export const fetchRecordsFromCloud = async (scriptUrl: string): Promise<{ success: boolean; data?: SurveyRecord[]; message?: string }> => {
  try {
    const payload = { action: 'get_all' };
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const resText = await response.text();
    const resJson = JSON.parse(resText);

    if (resJson.status === 'success' && Array.isArray(resJson.data)) {
      const records: SurveyRecord[] = resJson.data.map((item: any) => ({
        id: item.profile?.patientCode || Date.now().toString(),
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
      action: 'save',
      profile: record.profile,
      clinicalData: record.clinicalData,
      asScores: record.asScores,
      surveyData: record.surveyData,
      timestamp: record.timestamp
    };
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const resJson = JSON.parse(await response.text());
    return resJson.status === 'success' ? { success: true } : { success: false, message: resJson.message || "Script Error" };
  } catch (error: any) {
    return { success: false, message: error.message || "Network Error" };
  }
};

export const backupDataToCloud = async (scriptUrl: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const csvContent = getAllRecordsCSVContent();
    if (!csvContent) return { success: false, message: "Không có dữ liệu để sao lưu" };

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
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const resJson = JSON.parse(await response.text());
    return resJson.status === 'success' ? { success: true } : { success: false, message: resJson.message || "Script Error" };
  } catch (error: any) {
    return { success: false, message: error.message || "Network Error" };
  }
};

export const syncConsentToCloud = async (fullName: string, scriptUrl: string) => {
  try {
    const payload = {
      action: 'save_consent',
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

export const deleteRecordFromCloud = async (patientCode: string, scriptUrl: string): Promise<{ success: boolean; message?: string }> => {
  try {
    const payload = { action: 'delete', id: patientCode };
    const response = await fetch(scriptUrl, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    const resJson = JSON.parse(await response.text());
    return resJson.status === 'success' ? { success: true } : { success: false, message: resJson.message || "Lỗi từ Script" };
  } catch (error: any) {
    return { success: false, message: error.message || "Lỗi kết nối mạng" };
  }
};

// --- LOCAL STORAGE HELPERS ---

export const getNextSequenceNumber = (): number => {
  try {
    const current = parseInt(localStorage.getItem(SEQUENCE_KEY) || '0', 10);
    const next = current + 1;
    localStorage.setItem(SEQUENCE_KEY, next.toString());
    return next;
  } catch { return 1; }
};

export const getCurrentSequenceCounter = (): number => {
  try { return parseInt(localStorage.getItem(SEQUENCE_KEY) || '0', 10); } catch { return 0; }
};

export const setSequenceCounter = (value: number) => {
  localStorage.setItem(SEQUENCE_KEY, value.toString());
};

export const getConsents = (): ConsentRecord[] => {
  try { return JSON.parse(localStorage.getItem(CONSENTS_KEY) || '[]'); } catch { return []; }
};

export const saveConsent = (fullName: string) => {
  const consents = getConsents();
  consents.push({ id: Date.now().toString(), fullName, timestamp: new Date().toISOString(), agreed: true });
  localStorage.setItem(CONSENTS_KEY, JSON.stringify(consents));
};

export const getRecords = (): SurveyRecord[] => {
  try { return JSON.parse(localStorage.getItem(RECORDS_KEY) || '[]'); } catch { return []; }
};

export const saveRecord = (profile: UserProfile, surveyData: SurveyData, clinicalData: ClinicalData, asScores?: ASScores) => {
  const records = getRecords();
  const existingIndex = records.findIndex(r => r.profile.sequenceNumber === profile.sequenceNumber);
  const newRecord: SurveyRecord = {
    id: existingIndex >= 0 ? records[existingIndex].id : Date.now().toString(),
    timestamp: new Date().toISOString(),
    profile, surveyData, clinicalData, asScores
  };
  if (existingIndex >= 0) records[existingIndex] = newRecord;
  else records.push(newRecord);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
};

export const deleteRecord = (id: string) => {
  const records = getRecords().filter(r => r.id !== id);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
};

export const clearAllRecords = () => {
  localStorage.removeItem(RECORDS_KEY);
  localStorage.removeItem(CONSENTS_KEY);
};

// --- MOCK DATA GENERATOR ---
export const generateTestData = () => {
  const dummyNames = ["Nguyễn Văn A", "Trần Thị Bình", "Lê Văn Cường", "Phạm Thị Dung"];
  const dummyClasses = ["YHCT20", "YHCT21", "YK20", "DUOC21"];
  const records: SurveyRecord[] = [];
  const consents: ConsentRecord[] = [];
  
  dummyNames.forEach((name, index) => {
    const seq = index + 1;
    const abbr = getAbbreviation(name);
    const mockMSSV = `205${Math.floor(100000 + Math.random() * 900000)}`;
    const patientCode = `${abbr}${mockMSSV.slice(-3)}`;
    
    const profile: UserProfile = {
      sequenceNumber: seq,
      patientCode: patientCode,
      fullName: name,
      studentId: mockMSSV,
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
      if (type === 0) surveyData[q.id] = (Math.floor(Math.random() * 2) + 1) as 1|2; 
      else if (type === 1) surveyData[q.id] = (Math.floor(Math.random() * 2) + 4) as 4|5; 
      else surveyData[q.id] = (Math.floor(Math.random() * 5) + 1) as 1|2|3|4|5; 
    });

    const scores: ASScores = {
      binhHoa: type === 0 ? 75 : 40, duongHu: type === 1 ? 65 : 20, amHu: type === 2 ? 55 : 25,
      khiHu: type === 1 ? 60 : 22, damThap: 30, thapNhiet: 25, huyetU: 20, khiTre: 35, dacBiet: 15
    };
    
    // Tạo data lâm sàng giả (đủ 4 huyệt x 3 thời điểm)
    const mockPhase = (prefix: string) => {
      const data: any = { file: `${prefix}_${seq}.jpg` };
      ['bl23_l', 'bl23_r', 'bl25_l', 'bl25_r'].forEach(point => {
        // Random Green/Red (50 - 150)
        const G = 50 + Math.floor(Math.random() * 100);
        const R = 50 + Math.floor(Math.random() * 100);
        
        data[`green_${point}`] = G.toString();
        data[`red_${point}`] = R.toString();
        
        // Tự tính EI/MI giả
        const { ei, mi } = calculateClinicalIndices(R, G);
        data[`ei_${point}`] = ei;
        data[`mi_${point}`] = mi;
      });
      return data;
    };

    const clinicalData: ClinicalData = {
      pre: mockPhase('pre'),
      postImmediate: mockPhase('post'),
      post10Min: mockPhase('10m'),
      cuppingMarkTime: `${3 + Math.floor(Math.random() * 7)} ngày`
    };

    records.push({
      id: (Date.now() - index * 10000).toString(),
      timestamp: new Date(Date.now() - index * 86400000).toISOString(),
      profile, surveyData, clinicalData, asScores: scores
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
    c.id, new Date(c.timestamp).toLocaleString('vi-VN'), `"${c.fullName}"`, 'Đã đồng thuận'
  ]);
  downloadCSV(`CCMQ_DS_DongThuan.csv`, [header.join(','), ...rows.map(r => r.join(','))].join('\n'));
};

// --- HÀM XUẤT CSV TỔNG HỢP (ĐẦY ĐỦ CỘT) ---
export const getAllRecordsCSVContent = (): string => {
  const records = getRecords();
  if (!records.length) return "";

  // 1. Header cơ bản
  const headers = [
    "ID", "Thời gian", "Mã BN", "Họ Tên", "Lớp", "MSSV", "SĐT", "Năm Sinh", "Giới Tính", "Cân nặng", "Chiều cao",
    "AS Bình Hòa", "AS Dương Hư", "AS Âm Hư", "AS Khí Hư", "AS Đàm Thấp", "AS Thấp Nhiệt", "AS Huyết Ứ", "AS Khí Trệ", "AS Đặc Biệt",
    ...Array.from({length: 60}, (_, i) => `Q${i+1}`),
  ];

  // 2. Thêm header cho 3 thời điểm (Mỗi thời điểm 17 cột)
  ['Pre', 'PostImm', 'Post10m'].forEach(p => {
    headers.push(`File_${p}`);
    ['BL23_L', 'BL23_R', 'BL25_L', 'BL25_R'].forEach(pt => {
       headers.push(`G_${pt}_${p}`, `R_${pt}_${p}`, `EI_${pt}_${p}`, `MI_${pt}_${p}`, `RI_${pt}_${p}`);
    });
  });
  headers.push("TG Mất Vết Giác");

  const csvRows = [headers.join(',')];

  records.forEach(rec => {
    const p = rec.profile;
    const s = rec.asScores || { binhHoa: 0, duongHu: 0, amHu: 0, khiHu: 0, damThap: 0, thapNhiet: 0, huyetU: 0, khiTre: 0, dacBiet: 0 };
    const c = rec.clinicalData;
    const q = rec.surveyData;

    // Helper lấy data cho 1 phase
    const getPhaseCols = (ph: any) => {
      if(!ph) return Array(17).fill('');
      const cols = [`"${ph.file||''}"`];
      ['bl23_l', 'bl23_r', 'bl25_l', 'bl25_r'].forEach(pt => {
         cols.push(
           ph[`green_${pt}`] || '', 
           ph[`red_${pt}`] || '', 
           ph[`ei_${pt}`] || '', 
           ph[`mi_${pt}`] || '',
           ph[`ri_${pt}`] || ''
         );
      });
      return cols;
    };

    const row = [
      rec.id, rec.timestamp, p.patientCode, `"${p.fullName}"`, p.class, `"${p.studentId || ''}"`, `"${p.phoneNumber || ''}"`, p.yearOfBirth, p.gender, p.weight, p.height,
      s.binhHoa, s.duongHu, s.amHu, s.khiHu, s.damThap, s.thapNhiet, s.huyetU, s.khiTre, s.dacBiet,
      ...Array.from({length: 60}, (_, i) => q[i+1] || ''),
      // Nối dữ liệu lâm sàng 3 thời điểm
      ...getPhaseCols(c.pre),
      ...getPhaseCols(c.postImmediate),
      ...getPhaseCols(c.post10Min),
      `"${c.cuppingMarkTime || ''}"`
    ];
    csvRows.push(row.join(','));
  });

  return csvRows.join('\n');
};

export const exportAllRecordsToCSV = () => {
  const content = getAllRecordsCSVContent();
  if (!content) { alert("Chưa có dữ liệu!"); return; }
  downloadCSV(`CCMQ_TongHop_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`, content);
};

export const exportToCSVs = (profile: UserProfile, surveyData: SurveyData, asScores: ASScores, clinicalData?: ClinicalData) => {
  const cData = clinicalData || { pre: {}, postImmediate: {}, post10Min: {}, cuppingMarkTime: '' } as any;
  saveRecord(profile, surveyData, cData, asScores);

  const baseFilename = `CCMQ_${profile.patientCode}_${profile.fullName.trim().replace(/\s+/g, '_')}`;
  const commonHeaders = ['Mã BN', 'Họ Tên', 'Lớp', 'MSSV'];
  const commonRow = [`"${profile.patientCode}"`, `"${profile.fullName}"`, `"${profile.class}"`, `"${profile.studentId}"`];

  // 1. File Câu hỏi
  const ansHeader = [...commonHeaders, ...CCMQ_QUESTIONS.map(q => `Câu ${q.id}`)];
  const ansRow = [...commonRow, ...CCMQ_QUESTIONS.map(q => surveyData[q.id] || '')];
  downloadCSV(`${baseFilename}_CauHoi.csv`, [ansHeader.join(','), ansRow.join(',')].join('\n'));

  // 2. File Điểm AS
  setTimeout(() => {
    const scHeader = [...commonHeaders, 'Bình Hòa', 'Dương Hư', 'Âm Hư', 'Khí Hư', 'Đàm Thấp', 'Thấp Nhiệt', 'Huyết Ứ', 'Khí Trệ', 'Đặc Biệt'];
    const scRow = [...commonRow, asScores.binhHoa, asScores.duongHu, asScores.amHu, asScores.khiHu, asScores.damThap, asScores.thapNhiet, asScores.huyetU, asScores.khiTre, asScores.dacBiet];
    downloadCSV(`${baseFilename}_DiemAS.csv`, [scHeader.join(','), scRow.join(',')].join('\n'));
  }, 300);

  // 3. File Lâm Sàng
  setTimeout(() => {
    const clHeader = [...commonHeaders];
    const clRow = [...commonRow];
    ['Pre', 'PostImm', 'Post10m'].forEach(p => {
        const phKey = p === 'Pre' ? 'pre' : p === 'PostImm' ? 'postImmediate' : 'post10Min';
        const phData = cData[phKey] || {};
        
        clHeader.push(`File_${p}`);
        clRow.push(`"${phData.file || ''}"`);
        
        ['bl23_l', 'bl23_r', 'bl25_l', 'bl25_r'].forEach(pt => {
            clHeader.push(`G_${pt}`, `R_${pt}`, `EI_${pt}`, `MI_${pt}`);
            clRow.push(phData[`green_${pt}`]||'', phData[`red_${pt}`]||'', phData[`ei_${pt}`]||'', phData[`mi_${pt}`]||'');
        });
    });
    clHeader.push('TG Mất Vết');
    clRow.push(`"${cData.cuppingMarkTime || ''}"`);
    
    downloadCSV(`${baseFilename}_LamSang.csv`, [clHeader.join(','), clRow.join(',')].join('\n'));
  }, 600);
};
// ==========================================
// TẢI TOÀN BỘ DỮ LIỆU TỪ CLOUD XUỐNG DƯỚI DẠNG CSV
// ==========================================
export const exportCloudRecordsToCSV = async (url: string): Promise<{success: boolean, message: string}> => {
  try {
    // 1. Gọi API lấy toàn bộ dữ liệu từ Cloud
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ action: 'get_all' }),
    });
    
    const result = await response.json();
    
    if (result.status !== 'success' || !result.data || result.data.length === 0) {
      return { success: false, message: 'Không có dữ liệu trên Cloud hoặc tải thất bại.' };
    }

    const records: any[] = result.data;

    // 2. Tạo mảng Tiêu đề (Headers) - Khớp 100% với Google Sheet
    const headers = [
      "Thời gian", "Mã BN", "Họ Tên", "Lớp", "MSSV", "SĐT", "Năm sinh", "Giới tính", "Cân nặng", "Chiều cao",
      "AS Bình Hòa", "AS Dương Hư", "AS Âm Hư", "AS Khí Hư", "AS Đàm Thấp", "AS Thấp Nhiệt", "AS Huyết Ứ", "AS Khí Trệ", "AS Đặc Biệt"
    ];
    
    const phases = [
      { key: 'pre', name: 'Trước' },
      { key: 'postImmediate', name: 'Ngay Sau' },
      { key: 'post10Min', name: 'Sau 10p' }
    ];
    const points = [
      { key: 'bl23_l', name: 'BL23(T)' }, { key: 'bl23_r', name: 'BL23(P)' },
      { key: 'bl25_l', name: 'BL25(T)' }, { key: 'bl25_r', name: 'BL25(P)' }
    ];

    phases.forEach(p => {
      headers.push(`File ${p.name}`);
      points.forEach(pt => {
        headers.push(`G_${pt.name} ${p.name}`, `R_${pt.name} ${p.name}`, `EI_${pt.name} ${p.name}`, `MI_${pt.name} ${p.name}`, `RI_${pt.name} ${p.name}`);
      });
    });
    
    headers.push("TG Mất Vết Giác");
    for (let i = 1; i <= 60; i++) headers.push(`Câu ${i}`);

    // Hàm bọc chuỗi an toàn cho CSV
    const escapeCsv = (val: any) => `"${String(val || '').replace(/"/g, '""')}"`;

    // 3. Chuyển đổi từng Record thành chuỗi CSV
    const csvRows = records.map(rec => {
      const p = rec.profile || {};
      const s = rec.asScores || {};
      const c = rec.clinicalData || {};
      const q = rec.surveyData || {};

      const row = [
        escapeCsv(rec.timestamp), escapeCsv(p.patientCode), escapeCsv(p.fullName), escapeCsv(p.class),
        escapeCsv(p.studentId), escapeCsv(p.phoneNumber), escapeCsv(p.yearOfBirth), escapeCsv(p.gender), escapeCsv(p.weight), escapeCsv(p.height),
        s.binhHoa, s.duongHu, s.amHu, s.khiHu, s.damThap, s.thapNhiet, s.huyetU, s.khiTre, s.dacBiet
      ];

      phases.forEach(phase => {
        const phData = c[phase.key] || {};
        row.push(escapeCsv(phData.file));
        points.forEach(pt => {
          row.push(
            escapeCsv(phData[`green_${pt.key}`]),
            escapeCsv(phData[`red_${pt.key}`]),
            escapeCsv(phData[`ei_${pt.key}`]),
            escapeCsv(phData[`mi_${pt.key}`]),
            escapeCsv(phData[`ri_${pt.key}`])
          );
        });
      });

      row.push(escapeCsv(c.cuppingMarkTime));
      for (let i = 1; i <= 60; i++) row.push(escapeCsv(q[i]));

      return row.join(',');
    });

    // 4. Gộp Tiêu đề và Dữ liệu, thêm BOM để Excel đọc không bị lỗi tiếng Việt
    const csvContent = "\uFEFF" + headers.map(escapeCsv).join(',') + '\n' + csvRows.join('\n');

    // 5. Tự động kích hoạt tải xuống
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const urlObj = URL.createObjectURL(blob);
    link.setAttribute('href', urlObj);
    link.setAttribute('download', `Cloud_Data_CCMQ_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(urlObj);

    return { success: true, message: `Đã tải thành công ${records.length} hồ sơ!` };

  } catch (error) {
    console.error("Lỗi khi tải CSV từ Cloud:", error);
    return { success: false, message: 'Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại.' };
  }
};
