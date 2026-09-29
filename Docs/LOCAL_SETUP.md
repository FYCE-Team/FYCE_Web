# Chạy local và xử lý lỗi đăng nhập

Cập nhật 2026-09-29. Không đưa `.env`, khóa bí mật hoặc `fyce_backup/` vào Git.

## Lỗi kết nối hiện tại

Backend cổng 3000 trước đó không chạy, nên trang chủ và đăng nhập báo `ERR_CONNECTION_REFUSED`. Đã khởi động lại, kết nối MongoDB thành công và xác minh `/api/health`, `/api/homepage` trả HTTP 200. Đây là tiến trình development, không phải dịch vụ tự khởi động sau khi reboot.

Chạy hai terminal và giữ chúng hoạt động:

```sh
# Terminal 1, từ thư mục gốc repo
npm run dev --prefix backend
```

```sh
# Terminal 2
npm run dev --prefix frontend
```

Frontend: `http://localhost:5173`. Backend: `http://localhost:3000/api`. Nếu Vite đã chạy thì không mở thêm tiến trình. Vite dùng `strictPort` để tránh âm thầm đổi cổng làm lệch OAuth origin. Dùng cùng hostname localhost cho frontend/API để cookie hoạt động; không trộn 127.0.0.1 với localhost.

`NODE_ENV=development` cho phép CORS chính xác tại localhost:5173 và 127.0.0.1:5173, cùng `CLIENT_URL`/`CLIENT_URLS` được cấu hình. Production chỉ dùng danh sách cấu hình, không tự cho phép local và không wildcard. Origin QA khác phải khai báo rõ.

## Google: “The given origin is not allowed for the given client ID”

Đã so sánh cấu hình hiện tại: `GOOGLE_CLIENT_ID` backend và `VITE_GOOGLE_CLIENT_ID` frontend khớp nhau. Origin được Google kiểm tra độc lập với CORS của backend; sửa CORS không thay thế cấu hình Google Cloud.

Trong Google Cloud / Google Auth Platform → Clients, mở đúng OAuth Web Client đang dùng trong `.env`. Trong **Authorized JavaScript origins**, thêm các origin dùng thực tế:

- `http://localhost`
- `http://localhost:5173`
- Domain HTTPS deploy thực tế, ví dụ `https://fyce-web.vercel.app`

Không thêm `/login`, `/api`, query hoặc path vào origin. Nếu chủ động dùng 127.0.0.1 hay cổng khác thì cũng cần đăng ký chính xác origin tương ứng. Không đổi sang Client ID khác chỉ ở frontend. Sau khi đổi env, khởi động lại Vite/backend; sau khi lưu trên Cloud, chờ cấu hình có hiệu lực rồi thử lại.

Nguồn chính thức: [Google Identity Services — Setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid). Chưa sửa Google Cloud trong phiên này và chưa xác minh đăng nhập Google thật thành công.

## Hoàn tiền thủ công

Trong Admin → Đơn vé & thanh toán → Đối chiếu:

1. Admin và khách trao đổi, xử lý tiền bên ngoài trước (Facebook/Zalo/kênh đã thống nhất).
2. Chọn từng vé chưa check-in, nhập ghi chú và xác nhận đã hoàn tiền ngoài hệ thống.
3. Hệ thống ghi nhận `refunded`, đổi QR version, trả ghế `available`, lưu admin/thời gian/lý do và SeatHistory trong một MongoDB transaction.
4. Hoàn một phần giữ booking `confirmed/paid`, thêm `refundedAmount`; các vé còn lại tiếp tục hợp lệ. Hoàn tất cả chuyển booking `cancelled/refunded`. Giá mua ban đầu và items không đổi.
5. Khách mua lại tạo booking/ticket/QR mới. Vé cũ không được tái sử dụng hoặc phát hành lại bằng retry.

Đây là xác nhận nghiệp vụ, không có API chuyển tiền tự động. Cần MongoDB replica set (Atlas hỗ trợ); standalone bị từ chối trước khi có thay đổi được commit. Không cho hoàn vé đã check-in. Dữ liệu ghế/đơn mâu thuẫn phải được đối chiếu, không tự đoán hoặc sửa lịch sử. Ghế legacy thiếu soldBookingId chỉ được xử lý khi không có đơn paid hoặc vé còn hiệu lực khác cạnh tranh quyền sở hữu.
