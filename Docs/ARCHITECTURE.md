# Kiến trúc FYCEweb — bản ghi từ mã nguồn

Cập nhật: 2026-09-29. Checkout ban đầu không có thư mục Docs, AGENTS.md hay tài liệu kiến trúc riêng; chỉ có README mặc định của Vite. Tài liệu này mô tả hệ thống thực tế, không giả định các quy tắc thiết kế chưa được cung cấp.

## Các lớp và thư mục

| Thành phần                               | Vai trò và nguyên tắc                                                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `frontend/src/App.jsx`                   | React Router: public, auth, protected, admin. Trang admin tải bằng `lazy` và `Suspense`.                                 |
| `frontend/context/AuthContext.jsx`       | Access token trong bộ nhớ, bootstrap/refresh bằng cookie; cung cấp user/login/logout.                                    |
| `frontend/src/services/`                 | Gọi API. `admin.service.js` dùng lại AuthContext, refresh một lần khi 401, hỗ trợ AbortSignal.                           |
| `frontend/src/pages/admin/management/`   | Dashboard, users, homepage CMS, booking/payment reconciliation, tickets; component chung và CSS được giới hạn `.am-*`.   |
| `frontend/src/pages/admin/events/`       | CRUD sự kiện và quản trị sơ đồ ghế hiện có.                                                                              |
| `frontend/src/pages/admin/checkin/`      | Camera BarcodeDetector, nhập QR thủ công, xác thực/check-in, chọn sự kiện.                                               |
| `frontend/src/styles/variables.css`      | Nguồn token thiết kế FYCE: xanh chủ đạo, vàng nhấn, font/radius/shadow. Dashboard mới dùng lại các token này.            |
| `backend/src/app.js`, `server.js`        | Express 5, helmet, CORS, JSON/cookie parser; server nối MongoDB trước khi listen.                                        |
| `backend/src/routes/`                    | Định tuyến, middleware xác thực và phân quyền. Có 13 file routes sau cập nhật.                                           |
| `backend/src/controllers/`               | Chuyển HTTP request/response và ánh xạ lỗi. Admin trả `{ success, data }`.                                               |
| `backend/src/services/`                  | Nghiệp vụ và truy vấn; không đưa logic thanh toán vào frontend.                                                          |
| `backend/src/models/`                    | 16 Mongoose models sau cập nhật. Không đổi tên collection/enum đã có.                                                    |
| `backend/src/scripts/`                   | Seed/migration ghế, ảnh/video GridFS. Không tự chạy trên DB thật.                                                        |
| `backend/test/admin.integration.test.js` | Kiểm thử HTTP + MongoDB riêng; không đọc `.env`.                                                                         |
| `fyce_backup/`                           | Bản dump tồn tại trước phiên làm việc, chứa dữ liệu nhạy cảm. Không dùng làm fixture, không sửa và không đưa vào commit. |

## Quan hệ dữ liệu

- `User` → `Booking` → nhiều booking items (snapshot ghế/giá) → `Ticket` theo từng ghế.
- `Event` có hạng vé, nội dung và lịch bán; `Venue`, `VenueLayout`, `EventSeatConfig`, `Seat` phục vụ sơ đồ ghế. `SeatHistory` lưu nghiệp vụ quản trị ghế hiện có.
- `Booking` lưu customer/event snapshot để thay đổi hồ sơ/sự kiện không viết lại lịch sử mua vé.
- `Ticket` giữ trạng thái `valid / checked_in / cancelled / refunded`; unique index `(bookingId, seatId)` chống phát hành trùng.
- `HeroSection`, `AboutSection`, `Gallery` cấp dữ liệu public qua `/api/homepage`.
- Ảnh/video tải lên qua API cũ, lưu GridFS `images`/`videos`; `/uploads` vẫn hỗ trợ tài nguyên cũ. Xóa nội dung CMS không xóa binary dùng chung.
- `RefreshToken`, `EmailVerification`, `PasswordReset` phục vụ xác thực.
- `PaymentReview` mới lưu thông tin đã chuẩn hóa về từng lần xử lý thanh toán: booking code, amount, outcome, message. Không lưu payload thô, secret hay thông tin thẻ/ngân hàng. Dữ liệu trước bản cập nhật không tự có nhật ký này.

## Hợp đồng admin mới

Tất cả `/api/admin/*` cần bearer token, tài khoản active, không blocked, role admin được đọc lại từ DB. Response đặt `Cache-Control: no-store, private`.

| HTTP       | Endpoint                            | Chức năng                                                                               |
| ---------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| GET        | `/api/admin/overview`               | Tổng user/event, nhóm booking/payment, ticket/check-in, 8 đơn mới nhất                  |
| GET        | `/api/admin/users`                  | `page`, `limit` (1–100), `q`, `role`, `isActive`, `isBlocked`                           |
| POST       | `/api/admin/users`                  | Tạo tài khoản; bcrypt; kiểm tra username/email/password                                 |
| PATCH      | `/api/admin/users/:id`              | fullName/phone/role/isActive/isBlocked và `updatedAt` bắt buộc                          |
| GET        | `/api/admin/bookings`               | `page`, `limit`, `q`, `eventId`, `status`, `paymentStatus`                              |
| GET        | `/api/admin/bookings/:id/audit`     | Booking items, vé, ghế, chênh lệch, 50 payment logs gần nhất                            |
| POST       | `/api/admin/bookings/:id/reconcile` | Dùng lại `reconcileSePayPayment` phía server; không tin trạng thái từ browser           |
| POST       | `/api/admin/bookings/:id/cancel`    | Chỉ hủy pending/unpaid qua service booking hiện có                                      |
| POST       | `/api/admin/bookings/:id/refund`    | Xác nhận hoàn thủ công từng vé; transaction, chống stale write và check-in cạnh tranh |
| GET        | `/api/admin/tickets`                | `page`, `limit`, `q`, `eventId`, `status`; holder và người check-in; không có QR secret |
| GET/POST   | `/api/admin/content/:type`          | Danh sách có phân trang / tạo hero, about, gallery                                      |
| PUT/DELETE | `/api/admin/content/:type/:id`      | Sửa/xóa với `updatedAt` bắt buộc, stale write trả 409                                   |

API cũ giữ nguyên đường dẫn/response. `/api/tickets/admin/verify` và `/check-in` nhận thêm `eventId` tùy chọn, giữ tương thích scanner hiện có. Upload ảnh/video được giới hạn admin (frontend hiện chỉ sử dụng trong quản trị).

## Bất biến cần giữ khi tiếp tục phát triển

1. `isActive` là trạng thái xác thực; `isBlocked` là khóa của quản trị. Google/OTP không được bỏ qua khóa quản trị. User cũ thiếu `isBlocked` được hiểu là không khóa.
2. Không xóa cứng user có lịch sử giao dịch. Không sửa email/username của user hiện có trong màn hình này. Tài khoản admin không bị khóa/hạ quyền qua endpoint mới, tránh mất admin cuối do hai yêu cầu đồng thời.
3. Sửa user/CMS so sánh `updatedAt`; timestamp mới tăng ít nhất 1ms. Không tự retry stale write vì có thể ghi đè quyết định của người khác. Form phải tải lại bản mới.
4. Hero/about public chọn active có `sortOrder` nhỏ nhất, rồi `createdAt` mới nhất. Không giả định chỉ có một bản active vì mô hình cũ không có unique constraint. Form mô tả đúng quy tắc này.
5. Hero không có đồng thời ảnh và video. Feature trong about có thứ tự không trùng. Link CMS mới chỉ nhận HTTP(S), đường dẫn nội bộ và anchor.
6. Thanh toán/hủy/hết hạn chuyển trạng thái bằng cập nhật có điều kiện. Ghế bán mới lưu `soldBookingId` và `saleClaimToken`; rollback chỉ lấy ghế của đúng lần xử lý. Hai callback cùng booking không được rollback ghế của nhau.
7. Phát hành vé idempotent. Check-in dùng cập nhật `valid → checked_in` nguyên tử; xác thực đơn đã paid/confirmed và event nếu có chọn. Không tự phát hành QR admin từ mã vé thường.
8. Hoàn tiền xử lý ngoài hệ thống theo yêu cầu người dùng; admin xác nhận qua `/api/admin/bookings/:id/refund` với `ticketIds`, `reason`, `offlineRefundConfirmed: true`, `updatedAt`. Transaction cập nhật Ticket/Seat/Booking/SeatHistory nguyên tử; chỉ vé valid chưa check-in. Không gọi provider chuyển tiền. Giữ tổng tiền/items, ghi `refundedAmount`; partial giữ confirmed/paid, full chuyển cancelled/refunded. QR version cũ bị thay và ghế bán lại tạo vé mới.
9. Không chạy seed, migration, webhook thử nghiệm hoặc repair trực tiếp vào database thật để “kiểm thử”.

## Giới hạn kiến trúc còn lại

Luồng hoàn vé mới dùng transaction nhiều document trên replica set (snapshot/majority). Luồng thanh toán cũ chưa dùng transaction/outbox. Các kiểm thử xác nhận các tình huống tranh chấp được bổ sung, nhưng không thể bảo đảm crash-consistency khi process/DB ngắt giữa bước cập nhật ghế và xác nhận booking. PaymentReview ghi nhận lần xử lý dở để đối soát; phải kiểm tra booking/seat/provider trước khi sửa. Transaction/outbox cho thanh toán vẫn là phần cần triển khai và kiểm thử thêm.

Các service CMS cũ vẫn cho phép gọi không có version token; giao diện mới chỉ gọi endpoint admin có kiểm soát phiên bản. Consumer cũ cần được chuyển sang hợp đồng mới nếu muốn cùng bảo đảm chống ghi đè.
