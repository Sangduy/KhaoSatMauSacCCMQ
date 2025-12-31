import { SurveyData, ASScores } from '../types';

/**
 * Công thức chung: AS = [(Tổng điểm - Số câu) / (Số câu * 4)] * 100
 */
const calculateFormula = (sum: number, itemCount: number): number => {
  return ((sum - itemCount) / (itemCount * 4)) * 100;
};

export const calculateASScores = (data: SurveyData): ASScores => {
  // Helper để lấy giá trị điểm (mặc định là 0 nếu chưa trả lời - dù UI đã bắt buộc)
  const getVal = (id: number) => data[id] || 0;

  // Helper tính tổng các câu điểm thuận
  const sum = (ids: number[]) => ids.reduce((acc, id) => acc + getVal(id), 0);

  // Helper tính tổng các câu điểm ngược (Cho thể Bình Hòa)
  // Quy tắc đảo ngược: 1->5, 2->4, 3->3, 4->2, 5->1 => ct: 6 - val
  const sumReverse = (ids: number[]) => ids.reduce((acc, id) => acc + (6 - getVal(id)), 0);

  // 1. AS Thể Dương hư (8 câu)
  // Câu: 18, 19, 20, 22, 23, 52, 55, 58
  const scoreDuongHu = calculateFormula(sum([18, 19, 20, 22, 23, 52, 55, 58]), 8);

  // 2. AS Thể Âm hư (8 câu)
  // Câu: 17, 21, 29, 35, 36, 38, 44, 46
  const scoreAmHu = calculateFormula(sum([17, 21, 29, 35, 36, 38, 44, 46]), 8);

  // 3. AS Thể Khí hư (7 câu)
  // Câu: 2, 3, 4, 5, 6, 7, 27
  const scoreKhiHu = calculateFormula(sum([2, 3, 4, 5, 6, 7, 27]), 7);

  // 4. AS Thể Đàm thấp (8 câu)
  // Câu: 14, 16, 28, 42, 47, 49, 50, 51
  const scoreDamThap = calculateFormula(sum([14, 16, 28, 42, 47, 49, 50, 51]), 8);

  // 5. AS Thể Thấp nhiệt (9 câu)
  // Câu: 39, 41, 46, 48, 49, 56, 57, 59, 60 (Lưu ý: 46, 49 trùng lặp với thể khác theo tài liệu)
  const scoreThapNhiet = calculateFormula(sum([39, 41, 46, 48, 49, 56, 57, 59, 60]), 9);

  // 6. AS Thể Huyết ứ (8 câu)
  // Câu: 33, 35, 36, 37, 40, 43, 44, 45
  const scoreHuyetU = calculateFormula(sum([33, 35, 36, 37, 40, 43, 44, 45]), 8);

  // 7. AS Thể Khí trệ (7 câu)
  // Câu: 9, 10, 11, 12, 13, 15, 47
  const scoreKhiTre = calculateFormula(sum([9, 10, 11, 12, 13, 15, 47]), 7);

  // 8. AS Thể Đặc biệt (7 câu)
  // Câu: 24, 25, 26, 30, 31, 32, 34
  const scoreDacBiet = calculateFormula(sum([24, 25, 26, 30, 31, 32, 34]), 7);

  // 9. AS Thể Bình hòa (8 câu)
  // Điểm thuận: 1, 23, 53
  // Điểm ngược: 2, 7, 8, 22, 54
  const rawSumBinHoa = sum([1, 23, 53]) + sumReverse([2, 7, 8, 22, 54]);
  const scoreBinHoa = calculateFormula(rawSumBinHoa, 8);

  return {
    binhHoa: Math.round(scoreBinHoa * 100) / 100,
    duongHu: Math.round(scoreDuongHu * 100) / 100,
    amHu: Math.round(scoreAmHu * 100) / 100,
    khiHu: Math.round(scoreKhiHu * 100) / 100,
    damThap: Math.round(scoreDamThap * 100) / 100,
    thapNhiet: Math.round(scoreThapNhiet * 100) / 100,
    huyetU: Math.round(scoreHuyetU * 100) / 100,
    khiTre: Math.round(scoreKhiTre * 100) / 100,
    dacBiet: Math.round(scoreDacBiet * 100) / 100,
  };
};

export const getHighestScores = (scores: ASScores): string[] => {
  // Chuyển object thành mảng để sort
  const entries = Object.entries(scores) as [keyof ASScores, number][];
  
  // Lọc ra các thể bệnh lý (trừ Bình Hòa) có điểm cao >= 30 (ngưỡng tham khảo thường dùng)
  // Hoặc đơn giản là lấy top 3 cao nhất
  const sorted = entries.sort((a, b) => b[1] - a[1]);
  
  return sorted.slice(0, 3).map(([key, val]) => {
    switch(key) {
      case 'binhHoa': return `Bình hòa (${val})`;
      case 'duongHu': return `Dương hư (${val})`;
      case 'amHu': return `Âm hư (${val})`;
      case 'khiHu': return `Khí hư (${val})`;
      case 'damThap': return `Đàm thấp (${val})`;
      case 'thapNhiet': return `Thấp nhiệt (${val})`;
      case 'huyetU': return `Huyết ứ (${val})`;
      case 'khiTre': return `Khí trệ (${val})`;
      case 'dacBiet': return `Đặc biệt (${val})`;
      default: return '';
    }
  });
};