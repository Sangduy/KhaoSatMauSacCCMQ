# 🩸 Khảo Sát Màu Sắc CCMQ (CCMQ Color Analysis)

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

> **Hệ thống hỗ trợ thu thập và phân tích dữ liệu lâm sàng chuyên sâu cho Nghiên cứu Y học Cổ truyền (CCMQ).**

Dự án được thiết kế để tối ưu hóa quy trình lấy mẫu lâm sàng, giúp nghiên cứu viên tự động hóa việc tính toán các chỉ số phức tạp và quản lý dữ liệu bệnh nhân một cách khoa học.

---

## ✨ Tính Năng Nổi Bật

- 🤖 **Tính toán chỉ số tự động:** Tự động chấm điểm 9 thể chất (AS Scores) từ 60 câu hỏi khảo sát theo bảng câu hỏi CCMQ.
- 🎨 **Phân tích màu sắc thông minh:** Tự động trích xuất và tính toán các chỉ số **EI, MI, RI** từ file CSV của ImageJ cho các huyệt vị Thận Du (BL23) và Đại Trường Du (BL25).
- ☁️ **Chế độ Dual-Storage:** - Hoạt động **Offline** hoàn toàn khi không có mạng (Lưu trữ Local).
  - Đồng bộ hóa dữ liệu lên **Google Sheets** khi có kết nối Internet.
- 💾 **Cơ chế Lưu Nháp (Draft):** Tự động lưu trữ quá trình nhập liệu lâm sàng, ngăn ngừa mất dữ liệu khi trình duyệt bị tải lại đột ngột.
- 📊 **Xuất dữ liệu SPSS:** Bộ lọc xuất file CSV tùy chỉnh (Thông tin cá nhân, Chỉ số lâm sàng, Câu hỏi trắc nghiệm) để phục vụ trực tiếp cho phân tích thống kê.

---

## 📸 Giao Diện Ứng Dụng

| Form Khảo Sát | Admin Panel |
| :---: | :---: |
| ![Survey Form](https://via.placeholder.com/400x250.png?text=CCMQ+Survey+UI) | ![Admin Dashboard](https://via.placeholder.com/400x250.png?text=Clinical+Data+Admin) |

---

## 🛠 Công Nghệ Sử Dụng

**Frontend:**
* **React 18** & **TypeScript**: Xây dựng giao diện ổn định và chặt chẽ.
* **Vite**: Công cụ đóng gói và phát triển ứng dụng tốc độ cao.
* **Tailwind CSS**: Thiết kế giao diện hiện đại, đáp ứng (Responsive) trên iPad/Mobile.
* **Lucide React**: Thư viện icon đồng bộ và tinh tế.

**Backend & Security:**
* **Google Apps Script**: Xử lý dữ liệu đám mây qua API.
* **GitHub Secrets**: Bảo mật mật khẩu quản trị và thông tin nhạy cảm qua biến môi trường.

---

## 🚀 Cài Đặt và Phát Triển

1. **Clone project:**
   ```bash
   git clone [https://github.com/sangduy/khaosatmausacccmq.git](https://github.com/sangduy/khaosatmausacccmq.git)
Cài đặt thư viện:

Bash
npm install
Chạy ở chế độ phát triển:

Bash
npm run dev
🏥 Mục Tiêu Nghiên Cứu
Ứng dụng này phục vụ cho việc chuẩn hóa quy trình đánh giá thể chất và biến đổi màu sắc da tại các huyệt vị trong Y học Cổ truyền, hướng tới việc ứng dụng công nghệ số vào nghiên cứu lâm sàng.
