# FYCEweb

Ứng dụng đặt vé và quản trị FYCE: React/Vite frontend + Express/Mongoose backend.

- [Tiến độ và bàn giao](Docs/PROGRESS.md) — **8/10 cổng nghiệm thu, 80%**; UI Safari đã kiểm tra một phần; còn mobile/camera và provider E2E.
- [Kiến trúc, API và các bất biến dữ liệu](Docs/ARCHITECTURE.md)
- [Kiểm thử và lưu ý triển khai](Docs/TESTING.md)
- [Tiến độ dạng JSON cho công cụ/AI](Docs/progress.json)

Màn hình quản trị: `/admin`. Cấu hình theo `backend/.env.example` và biến frontend `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`. Sau khi cài dependencies, chạy `npm run dev` trong từng thư mục backend/frontend.

- [Chạy local, lỗi Google origin và hoàn vé thủ công](Docs/LOCAL_SETUP.md)
