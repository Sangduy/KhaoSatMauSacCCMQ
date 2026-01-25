// File: services/indicesService.ts

/**
 * Tính toán chỉ số EI và MI dựa trên giá trị Đỏ (Red) và Xanh (Green).
 * Công thức:
 * EI = log10(Red / Green)
 * MI = log10(1 / Green)
 */
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
