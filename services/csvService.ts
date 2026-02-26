import { SurveyRecord } from '../types';

export interface ExportOptions {
  personalInfo: boolean;
  clinicalIndices: boolean;
  redGreenDetails: boolean;
  surveyDetails: boolean;
}

export const generateCustomCSV = (records: SurveyRecord[], options: ExportOptions) => {
  if (!records || records.length === 0) {
    alert("Không có dữ liệu để xuất CSV!");
    return;
  }

  // ==========================================
  // 1. TẠO DÒNG TIÊU ĐỀ (HEADERS)
  // ==========================================
  
  // Mặc định cột đầu tiên LUÔN LÀ "Mã BN" để làm khóa chính cho SPSS
  const headers: string[] = ["Mã BN"];
  
  if (options.personalInfo) {
    // Đẩy cột "Thời gian" vào nhóm Thông tin cá nhân
    headers.push("Thời gian", "Họ Tên", "Lớp", "MSSV", "SĐT", "Năm sinh", "Giới tính", "Cân nặng", "Chiều cao");
  }
  
  if (options.clinicalIndices) {
    headers.push("AS Bình Hòa", "AS Dương Hư", "AS Âm Hư", "AS Khí Hư", "AS Đàm Thấp", "AS Thấp Nhiệt", "AS Huyết Ứ", "AS Khí Trệ", "AS Đặc Biệt");
    const pts = ['BL23(T)', 'BL23(P)', 'BL25(T)', 'BL25(P)'];
    ['Trước', 'Ngay Sau', 'Sau 10p'].forEach(phase => {
      pts.forEach(pt => {
        headers.push(`EI_${pt} ${phase}`, `MI_${pt} ${phase}`, `RI_${pt} ${phase}`);
      });
    });
    headers.push("TG Mất Vết Giác");
  }

  if (options.redGreenDetails) {
    const pts = ['BL23(T)', 'BL23(P)', 'BL25(T)', 'BL25(P)'];
    ['Trước', 'Ngay Sau', 'Sau 10p'].forEach(phase => {
      headers.push(`Tên File ${phase}`);
      pts.forEach(pt => {
        headers.push(`G_${pt} ${phase}`, `R_${pt} ${phase}`);
      });
    });
  }
  
  if (options.surveyDetails) {
    for (let i = 1; i <= 60; i++) headers.push(`Câu ${i}`);
  }

  // ==========================================
  // 2. TẠO CÁC DÒNG DỮ LIỆU (ROWS)
  // ==========================================
  const rows = records.map(rec => {
    const escape = (val: any) => `"${val !== undefined && val !== null ? val : ''}"`;
    const p = rec.profile;
    
    // Mặc định cột dữ liệu đầu tiên luôn lấy patientCode
    const rowData: string[] = [escape(p.patientCode)];
    
    if (options.personalInfo) {
      rowData.push(escape(new Date(rec.timestamp).toLocaleString('vi-VN')), escape(p.fullName), escape(p.class), escape(p.studentId), escape(p.phoneNumber), escape(p.yearOfBirth), escape(p.gender), escape(p.weight), escape(p.height));
    }

    if (options.clinicalIndices) {
      const s = rec.asScores || {} as any;
      rowData.push(escape(s.binhHoa||0), escape(s.duongHu||0), escape(s.amHu||0), escape(s.khiHu||0), escape(s.damThap||0), escape(s.thapNhiet||0), escape(s.huyetU||0), escape(s.khiTre||0), escape(s.dacBiet||0));
      
      const c = rec.clinicalData || {} as any;
      const phases = [c.pre, c.postImmediate, c.post10Min];
      const ptKeys = ['bl23_l', 'bl23_r', 'bl25_l', 'bl25_r'];
      
      phases.forEach(phaseData => {
        if (!phaseData) {
          rowData.push(...Array(12).fill('""')); 
        } else {
          ptKeys.forEach(pt => {
            rowData.push(escape((phaseData as any)[`ei_${pt}`]), escape((phaseData as any)[`mi_${pt}`]), escape((phaseData as any)[`ri_${pt}`]));
          });
        }
      });
      
      rowData.push(escape(c.cuppingMarkTime)); 
    }

    if (options.redGreenDetails) {
      const c = rec.clinicalData || {} as any;
      const phases = [c.pre, c.postImmediate, c.post10Min];
      const ptKeys = ['bl23_l', 'bl23_r', 'bl25_l', 'bl25_r'];
      
      phases.forEach(phaseData => {
        if (!phaseData) {
          rowData.push('""', ...Array(8).fill('""')); 
        } else {
          rowData.push(escape((phaseData as any).file));
          ptKeys.forEach(pt => {
            rowData.push(escape((phaseData as any)[`green_${pt}`]), escape((phaseData as any)[`red_${pt}`]));
          });
        }
      });
    }

    if (options.surveyDetails) {
      const q = rec.surveyData || {} as any;
      for (let i = 1; i <= 60; i++) rowData.push(escape(q[i]));
    }

    return rowData.join(',');
  });

  const csvContent = "\uFEFF" + headers.join(',') + "\n" + rows.join('\n'); 
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `Du_Lieu_Nghien_Cuu_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
