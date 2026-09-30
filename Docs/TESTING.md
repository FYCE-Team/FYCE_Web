# Kiểm thử và vận hành thử

Ngày chạy: 2026-09-30. Kiểm thử dùng MongoDB replica set riêng cổng 27028, database `fyce_admin_test`, dữ liệu giả; không đọc `.env` và không phục hồi dump `fyce_backup`.

## Lệnh tái hiện

```sh
mkdir -p /tmp/fyce-admin-test-db
mongod --dbpath /tmp/fyce-admin-test-db --port 27028 --bind_ip 127.0.0.1 --nounixsocket --replSet fyce-qa --logpath /tmp/fyce-admin-test-mongo.log
```

Lần đầu khởi tạo replica set tại localhost:27028, từ thư mục `backend`:

```sh
node --input-type=module -e 'import mongoose from "mongoose"; await mongoose.connect("mongodb://127.0.0.1:27028/admin?directConnection=true"); await mongoose.connection.db.admin().command({replSetInitiate:{_id:"fyce-qa",members:[{_id:0,host:"127.0.0.1:27028"}]}}); await mongoose.disconnect();'
```

Đợi node thành primary. Giữ MongoDB ở một terminal riêng; ở terminal khác:

```sh
npm ci --prefix backend
npm ci --prefix frontend
npm test --prefix backend
npm run build --prefix frontend
npm run lint --prefix frontend
npm audit --prefix backend
npm audit --prefix frontend
```

`npm test` xóa/tạo lại **chỉ** `fyce_admin_test` tại localhost:27028. Không chạy hai bộ test cùng lúc. Không thay URI trong test thành URI ứng dụng. Các secret trong test là giá trị giả dùng riêng cho test, không dành cho deploy. Tắt mongod thử nghiệm sau khi dùng.

## Kết quả và phạm vi

- **47/47 ca tích hợp đạt**: phân quyền, validation/pagination/regex, dashboard totals, dữ liệu nhạy cảm, user CRUD/duplicate/stale writes/block Google, bảo vệ admin, CMS CRUD/concurrent writes/unsafe URLs/media conflict, booking/ticket audit, QR tamper/duplicate check-in/event mismatch/payment state, idempotent issuance/reconciliation, payment duplicate/cancel/expiry/outgoing/partial rollback, public homepage, upload MIME/admin/GridFS round-trip.
- Build production thành công; lazy route loại bỏ cảnh báo chunk lớn hơn 500 kB.
- Lint trả exit 0, không có error; còn 16 warning trên phần mã cũ (15 `set-state-in-effect`, 1 `only-export-components`). Các trang management mới không có warning.
- Kiểm tra cú pháp toàn bộ `backend/src/**/*.js` và `git diff --check`.
- npm audit ban đầu: frontend production 0; backend production 2 moderate (multer và nodemailer). Đã cập nhật bản vá tương thích, giữ package-lock đồng bộ. **Audit cuối (cả production và dev dependencies): backend 0, frontend 0 lỗ hổng.**
- Safari desktop đã kiểm tra login, navigation, CMS tạo/sửa/publish/hủy xóa, audit hold, check-in và form hoàn vé trên DB QA. Chưa nghiệm thu mobile/camera thật.
- Không gọi SePay/SMTP/Google thật. Ca “paid reconciliation” kiểm tra đường idempotent của đơn đã confirmed/paid; không thay thế kiểm thử SDK với SePay sandbox.

## Các trạng thái nghiệp vụ cần nghiệm thu thủ công

- User: tài khoản chưa xác thực khác tài khoản bị khóa; token đã phát phải bị từ chối ngay sau khóa; admin không thể tự khóa/hạ quyền.
- CMS: lưu ảnh/video trước rồi lưu nội dung; hai nguồn nền đồng thời bị chặn; xóa nội dung không làm mất tệp ở trang khác. Giữ nháp không làm thay đổi trang public; ưu tiên sortOrder hoạt động đúng.
- Booking: chỉ pending chưa paid được hủy. Đối soát đọc SePay phía server, không sửa trạng thái thành paid từ browser. IPN đến chậm chỉ khôi phục nếu provider xác nhận trả trong hạn và ghế chưa thuộc người khác; còn lại chuyển đối chiếu.
- Vé: QR sai chữ ký/buổi diễn, QR đã check-in, đơn refunded/cancelled đều không được nhận vào cổng. Hoàn một phần giữ các vé còn lại hiệu lực; toàn bộ lịch sử/QR cũ/QR mới và tranh chấp refund/check-in đã có test transaction. Khi camera không hỗ trợ BarcodeDetector, dùng QR thủ công.
- UI: kiểm tra bảng cuộn ngang trên mobile, menu cuộn ngang, label/focus keyboard, loading/empty/error, nút không bấm lặp trong request, thông báo xung đột 409 và retry có chủ đích.

## Deploy

Giữ env names trong `.env.example`, không commit `.env` hoặc dữ liệu dump. Không có migration phá dữ liệu: `isBlocked`/sale ownership là field thêm mới có default; `PaymentReview` là collection mới. Binary GridFS và danh tính user hiện có giữ nguyên. Kiểm tra quyền tạo index/collection ở môi trường deploy, cấu hình CORS/cookie/HTTPS và `TICKET_QR_SECRET` riêng ở production. Xem DEPLOYMENT.md và Git history cho bản sửa production; không coi push code là nghiệm thu dịch vụ thật. Commit và nhánh bàn giao được ghi trong Git history; không lưu secrets hoặc database dump trong commit.

Xem `LOCAL_SETUP.md` để chạy frontend/backend đúng cổng, xử lý Google origin và sử dụng hoàn vé thủ công.

## Bổ sung hồi quy thanh toán / phiên đăng nhập

- Refresh đồng thời, grace timeout, cookie Secure/HttpOnly/Lax, logout; return URL allowlist.
- SePay REST invoice→provider ID, IPN đúng/sai secret, từ chối REFUND, callback trùng, transaction rollback khi phát hành lỗi, delayed on-time vs ghế đã bán.
- Worker tự cấp vé và tạo email job không cần browser/IPN; lease chống hai worker cùng đơn; lỗi provider chờ retry không cấp vé giả.
- QR PNG/CID, HTML escape, hàng đợi email retry/chống xử lý trùng, HTTP email mock và lỗi 429. Không gửi thư thật, không thực hiện chuyển tiền.
- Safari QA same-origin: đăng nhập, reload, rời sang hostname khác rồi quay về URL payment=error; phiên còn nguyên, đơn paid vẫn hiện xác nhận và QR. Đây là fixture QA, không phải chứng nhận SePay production.
- Live read-only trước deploy: Vercel /api/health trả HTML index (proxy chưa triển khai), Render /api/health trả JSON 200. Chưa có mã đơn lỗi từ người dùng để kết luận nguyên nhân của riêng giao dịch đó.

Ca hồi quy mới: sửa About raw legacy không author/trùng sortOrder; CAPTURED không transactions chỉ nhận qua REST, không tin IPN thiếu transaction hoặc sai currency; bank webhook tham chiếu PAY...; HMAC raw JSON và timestamp replay. Đơn thật và ảnh khôi phục là xử lý nghiệp vụ được cho phép riêng, không phải fixture test.

Checkout canonical signing regression: đối chiếu chuỗi thứ tự trường cố định và HMAC với expected độc lập; cả 48 ca đạt.
