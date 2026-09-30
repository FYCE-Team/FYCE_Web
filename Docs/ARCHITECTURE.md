# Kiến trúc FYCEweb — bản ghi từ mã nguồn

Cập nhật: 2026-09-30. Checkout ban đầu không có thư mục Docs, AGENTS.md hay tài liệu kiến trúc riêng; chỉ có README mặc định của Vite. Tài liệu này mô tả hệ thống thực tế, không giả định các quy tắc thiết kế chưa được cung cấp.

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
| `backend/src/models/`                    | 17 Mongoose models sau cập nhật. Không đổi tên collection/enum đã có.                                                    |
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

Thanh toán và hoàn vé dùng MongoDB transaction (snapshot/majority). Xác nhận thanh toán commit Booking/Seat/Ticket/TicketEmail cùng nhau; lỗi phát hành vé rollback toàn bộ. PaymentReview ghi ngoài transaction để lưu cả lần xử lý lỗi. Email là tác vụ bền vững tách khỏi xác nhận tiền; lỗi gửi không làm mất vé. SMTP có thể gửi trùng nếu process dừng sau khi nhà cung cấp nhận thư nhưng trước khi ghi sent; không tuyên bố exactly-once. Resend hỗ trợ idempotency trong 24 giờ, không bảo đảm chống trùng vô hạn.

Các service CMS cũ vẫn cho phép gọi không có version token; giao diện mới chỉ gọi endpoint admin có kiểm soát phiên bản. Consumer cũ cần được chuyển sang hợp đồng mới nếu muốn cùng bảo đảm chống ghi đè.

## Luồng production Vercel → Render (2026-09-30)

- Frontend production gọi `/api`, cấu hình tập trung `src/config/api.js`; Vercel proxy API/uploads trước SPA fallback. Cookie refresh thuộc origin frontend, HttpOnly/Secure/SameSite=Lax/path=/api/auth. Cần đăng nhập lại một lần sau chuyển từ cookie Render cũ.
- Frontend gộp refresh đồng thời; backend xoay token bằng CAS, previous hash có grace 30 giây. Không xóa phiên chỉ vì mất mạng/5xx. Logout thu hồi phiên. Access token vẫn chỉ trong bộ nhớ.
- Google GIS initialize một lần theo client ID; nút có thể render lại. COOP cho phép popup. Authorized origins vẫn phải cấu hình trên Google Cloud.
- SePay REST xác minh invoice chính xác; nếu detail không nhận invoice thì tìm order_id rồi đọc detail. Chỉ CAPTURED + APPROVED PAYMENT, tiền VND đủ giá đơn mới xử lý. URL success/error/cancel không phải bằng chứng thanh toán.
- IPN xác thực X-Secret-Key (SEPAY_IPN_SECRET hoặc SEPAY_SECRET_KEY); balance webhook dùng cấu hình riêng. Không lưu/log payload nhạy cảm.
- `paymentSync.service.js`: fallback tự động ở server, tick 15s, batch tối đa 10, claim bền vững 2 phút chống nhiều worker; pending thử lại 30s, expired 5 phút, lỗi backoff tối đa 15 phút. Chỉ quét đơn chưa trả tiền tạo trong 48 giờ, chưa đánh dấu cần admin đối chiếu. Đơn cũ hơn vẫn đối chiếu theo API người mua/admin. Worker chỉ chạy khi server thức và có khóa SePay.
- Thanh toán đến trễ được tự động nhận nếu thời điểm trả tiền từ provider nằm trong hạn giữ ghế và tất cả ghế vẫn rảnh/thuộc hold cũ; không lấy ghế đã thuộc người khác. Thanh toán quá hạn hoặc lệch tiền/ghế bật paymentReviewRequired. Admin phải đối chiếu thực tế, không ép paid.
- `TicketEmail`: unique bookingId, lease 2 phút, retry bền vững; tạo PNG QR tại server, CID trong thư và file đính kèm. Chọn SMTP hoặc HTTPS Resend; không gọi dịch vụ QR bên ngoài. Chỉ gửi vé valid của đơn paid/confirmed; QR đã hoàn vẫn bị từ chối ở check-in.
- CMS form chính tập trung nội dung/upload/hiển thị; thông số phụ trong mục nâng cao. Backend mặc định thứ tự/alt text và đánh số feature. Footer giữ nguyên.
