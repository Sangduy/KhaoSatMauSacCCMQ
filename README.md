# CCMQ Survey App

Ứng dụng web thu thập dữ liệu bảng kiểm thể chất Y học cổ truyền (CCMQ) với 60 câu hỏi, hỗ trợ tính điểm tự động và lưu trữ dữ liệu.

## Tính năng chính

*   **Khảo sát CCMQ:** 60 câu hỏi đánh giá thể chất.
*   **Tính điểm tự động:** Tự động tính điểm cho 9 loại thể chất (Bình Hòa, Dương Hư, Âm Hư, Khí Hư, Đàm Thấp, Thấp Nhiệt, Huyết Ứ, Khí Trệ, Đặc Biệt).
*   **Quản lý dữ liệu:**
    *   Lưu trữ cục bộ trên trình duyệt (LocalStorage).
    *   Đồng bộ dữ liệu lên Google Sheets (thông qua Google Apps Script).
    *   Xuất dữ liệu ra file CSV (Excel).
*   **Dành cho Cán bộ Y tế:** Nhập liệu các chỉ số lâm sàng (EI, MI, Hình ảnh).
*   **Phiếu đồng thuận:** Quản lý xác nhận đồng thuận tham gia nghiên cứu của sinh viên.

## Cài đặt và Chạy thử

1.  Cài đặt thư viện:
    ```bash
    npm install
    ```

2.  Chạy server phát triển (Localhost):
    ```bash
    npm run dev
    ```

3.  Đóng gói cho Production:
    ```bash
    npm run build
    ```

## Cấu hình Đồng bộ Google Sheets

Để kích hoạt tính năng lưu dữ liệu lên Google Sheets:

1.  Tạo Google Sheet và gắn Apps Script theo cấu trúc đã định.
2.  Deploy Apps Script dưới dạng **Web App** (Access: Anyone).
3.  Vào **Admin Panel** của ứng dụng (biểu tượng cài đặt) -> Nhập mật khẩu `admin123`.
4.  Dán URL Web App vào ô cấu hình tương ứng.

## Công nghệ

*   React
*   Vite
*   Tailwind CSS
