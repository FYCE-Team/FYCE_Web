# Kiến trúc FYCEweb — bản ghi từ mã nguồn

07/10 media deploy: `routePublicVideo` chỉ đổi URL GridFS video public cùng origin sang `PUBLIC_VIDEO_ORIGIN` (production mặc định Render, tùy chọn `VITE_PUBLIC_VIDEO_ORIGIN`). Điều này tránh Vercel rewrite cache nhầm response Range 206 thành video đầy đủ. URL CDN ngoài/signed/blob và local giữ nguyên. `API_BASE_URL` cho auth/payment vẫn `/api` first-party; không dùng origin video cho API nghiệp vụ.

Cập nhật: 2026-09-30. Checkout ban đầu không có thư mục Docs, AGENTS.md hay tài liệu kiến trúc riêng; chỉ có README mặc định của Vite. Tài liệu này mô tả hệ thống thực tế, không giả định các quy tắc thiết kế chưa được cung cấp.

## Các lớp và thư mục

Sửa 07/10: PublicMotion luôn render một ConcertAtmosphere ở router, bao gồm auth/admin; chỉ observer card/heading public. Không còn ẩn section trước khi cuộn. MutationObserver chỉ xử lý added Element, bỏ text, không scan toàn root/đọc bounding rect mỗi cập nhật. Nền SVG duy nhất fixed dưới content; các page/section wrapper trong suốt, card/form giữ nền đặc. EventDetail dùng `videoSource.js` phân loại trailer và phát ngay trong hero/cover, tự chạy tắt tiếng; không có trailer hoặc native video lỗi thì về ảnh cover. Không còn player riêng. ImagePreview ở MainLayout public dùng native dialog; ContentImage bật preview khi có context, admin không có context nên giữ hành vi cũ. Gallery concert dùng masonry theo tỷ lệ ảnh gốc, không đọc layout trong scroll handler. Không đổi hợp đồng API hoặc collection.

Bổ sung đợt chuyển động/cuộn 06/10/2026: `PublicMotion` chỉ quan sát sections/cards public bằng IntersectionObserver, bỏ hiệu ứng khi reduced-motion; admin không nhận scroll reveal. `ScrollPosition` quản lý vị trí toàn ứng dụng, chỉ ghi tọa độ tối đa 50 URL vào sessionStorage (không chứa token). Reload trang đọc/auth/profile về đầu; trang chọn ghế/checkout/chi tiết đơn/my-tickets và admin giữ tọa độ theo URL; Back giữ vị trí và link hash mới giữ neo. Không khôi phục lựa chọn ghế từ tọa độ.

Event có subdocument `english` giới hạn trường/độ dài, editor tùy chọn. Home/chi tiết sự kiện/tiêu đề trang chọn ghế đọc bản này; không viết lại snapshot Booking/Ticket. Chưa có bản dịch biên tập thì giữ nội dung gốc, không đoán bản dịch tác phẩm/nghệ sĩ. Video giữ API GridFS cũ nhưng giới hạn file nhỏ và abort khi lỗi; dùng URL media ngoài trong field hiện có để tránh ghi binary vào Atlas. Xem `MEDIA_STORAGE.md`.

Cập nhật bổ sung 06/10/2026: `i18n/content.js` đọc bản `english` tùy chọn của Hero/About/features, sau đó fallback catalog. Subdocument `contentTranslation.js` giới hạn độ dài, không đổi collection hoặc yêu cầu migration. CMS vẫn kiểm tra `updatedAt` trước khi lưu. Không tự dịch/ghi lại nội dung tùy ý trong DB.

Auth: cookie HttpOnly và access token trong bộ nhớ giữ nguyên. Refresh từ chối phiên thiếu/hết hạn/sai nhưng không gửi cookie xóa trên phản hồi lỗi (tránh xóa cookie mới bởi request cũ). Logout/đổi mật khẩu vẫn thu hồi và xóa như trước. `sessionRestore.js` chỉ thử `/auth/me` với token đang có khi refresh 401; backend xác minh hạn token và trạng thái user. AuthContext bảo vệ kết quả cũ bằng generation và token reference.

Thiết kế: font có sẵn trong bundle từ Fontsource; `concert.css` và SVG trang chủ chỉ tạo hiệu ứng trang trí, hỗ trợ `prefers-reduced-motion`, không can thiệp nghiệp vụ thanh toán.

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
| `backend/src/models/`                    | Các Mongoose models. Không đổi tên collection/enum đã có.                                                    |
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
4. Hero/about public chọn active, chưa vào thùng rác, có `sortOrder` nhỏ nhất, rồi `createdAt` mới nhất. Không giả định chỉ có một bản active vì mô hình cũ không có unique constraint. Form mô tả đúng quy tắc này.
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
- SePay REST xác minh invoice chính xác; nếu detail không nhận invoice thì tìm order_id rồi đọc detail. REST CAPTURED + APPROVED PAYMENT khi có transactions; riêng danh sách transactions rỗng của chuyển khoản ngân hàng cho phép xác nhận theo CAPTURED từ merchant REST với đúng VND/đủ tiền. IPN vẫn bắt buộc transaction APPROVED. URL success/error/cancel không phải bằng chứng thanh toán.
- IPN xác thực X-Secret-Key (SEPAY_IPN_SECRET hoặc SEPAY_SECRET_KEY); balance webhook dùng cấu hình riêng. Không lưu/log payload nhạy cảm.
- `paymentSync.service.js`: fallback tự động ở server, tick 15s, batch tối đa 10, claim bền vững 2 phút chống nhiều worker; pending thử lại 30s, expired 5 phút, lỗi backoff tối đa 15 phút. Chỉ quét đơn chưa trả tiền tạo trong 48 giờ, chưa đánh dấu cần admin đối chiếu. Đơn cũ hơn vẫn đối chiếu theo API người mua/admin. Worker chỉ chạy khi server thức và có khóa SePay.
- Thanh toán đến trễ được tự động nhận nếu thời điểm trả tiền từ provider nằm trong hạn giữ ghế và tất cả ghế vẫn rảnh/thuộc hold cũ; không lấy ghế đã thuộc người khác. Thanh toán quá hạn hoặc lệch tiền/ghế bật paymentReviewRequired. Admin phải đối chiếu thực tế, không ép paid.
- `TicketEmail`: unique bookingId, lease 2 phút, retry bền vững; tạo PNG QR tại server, CID trong thư và file đính kèm. Chọn SMTP hoặc HTTPS Resend; không gọi dịch vụ QR bên ngoài. Chỉ gửi vé valid của đơn paid/confirmed; QR đã hoàn vẫn bị từ chối ở check-in.
- CMS form chính tập trung nội dung/upload/hiển thị; thông số phụ trong mục nâng cao. Backend mặc định thứ tự/alt text và đánh số feature. Footer giữ nguyên.


## Mở rộng quản trị và profile (2026-10-01)

- Menu admin dọc bên trái; footer được sửa theo yêu cầu mới ngày 01/10, thay thế ràng buộc giữ nguyên footer trước đó. Khám phá dẫn `/#top`, `/#concerts`, `/#about`, `/#gallery`; bỏ Thông tin, Đặt vé và bản tin.
- `deletedAt`/`deletedBy` thêm vào User/Event/Booking/Ticket/HeroSection/AboutSection/Gallery. `null` bao gồm bản ghi cũ thiếu field. Không migration hoặc xóa cứng dữ liệu cũ. Sự kiện vào thùng rác bị ẩn khỏi public và không nhận hold/booking mới; đơn/vé cũ tiếp tục thanh toán, đối chiếu, xem vé và check-in theo trạng thái nghiệp vụ.
- Thùng rác của đơn/vé chỉ ẩn khỏi danh sách quản trị thường; không hoàn tiền, không giải phóng ghế, không đổi QR. Buyer vẫn có lịch sử/vé. Muốn vô hiệu vé và trả ghế, dùng xác nhận hoàn tiền đã có. Restore không tạo vé mới và không sửa số tiền.
- User trash không áp dụng admin; khóa và tăng `authVersion`, thu hồi refresh token. Restore giữ trạng thái khóa trước đó, không phục hồi phiên cũ. Các admin khác vẫn được bảo vệ khỏi khóa/hạ quyền.
- `POST /api/admin/bulk/preview` nhận `kind`, `action=trash|restore|restore-seats`, `filters` (có thể có `ids` cho các mục chọn). Chốt tối đa 1.000 ID + updatedAt, ký HMAC với domain riêng, gắn admin và hạn 10 phút. `POST /api/admin/bulk/execute` nhận token xác nhận; transaction kiểm tra từng version. Một bản ghi stale làm rollback toàn bộ; không tự retry với dữ liệu mới. Bản ghi mới tạo sau preview không bị tác động. `GET /api/admin/trash/:kind` phân trang dữ liệu đã xóa với projection an toàn.
- Checkbox chọn toàn trang chỉ chọn trang đang xem; đổi bộ lọc/trang bỏ lựa chọn cũ. “Xóa tất cả” chốt tất cả kết quả bộ lọc, không phụ thuộc phân trang. Cả hai đều hiển thị số lượng và xác nhận bằng dialog có focus trap.
- `restore-seats` chỉ đổi ghế active/blocked thành available và ghi SeatHistory trong cùng transaction; không lấy ghế sold/held.
- Thư viện upload nhiều tệp tuần tự, báo tiến độ và số tệp đã thành công nếu một tệp lỗi. Chỉ ảnh và title tùy chọn; ảnh mới public ngay. Kéo thả dùng dnd-kit đang có, có keyboard/↑↓ dự phòng. `POST /api/admin/content/gallery/reorder` lưu title/sortOrder với updatedAt từng ảnh trong transaction. Không ghi đè khi stale. Tệp GridFS dùng chung không bị xóa khi xóa CMS.
- `/api/homepage` và Home render toàn bộ ảnh active/chưa xóa, không còn giới hạn 5 hoặc 100. Lặp bố cục 5 ảnh, lazy-load ảnh; dữ liệu thứ tự lấy từ server. Gallery lớn vẫn trả toàn bộ metadata theo yêu cầu; cân nhắc phân trang/infinite-scroll nếu số lượng tăng rất lớn.
- Check-in admin nhận mã `TKT-…` (không phân biệt hoa/thường, bỏ khoảng trắng hai đầu) hoặc QR signed. Hai đường dùng chung kiểm tra paid/confirmed, event và atomic valid → checked_in. Không mở endpoint tra mã vé công khai.
- `/profile`: sửa họ tên/điện thoại, avatar JPG/PNG/WebP tối đa 5MB, xác thực chữ ký tệp; email không tự thay đổi. `POST /api/auth/me/avatar` chỉ sửa chính user từ bearer token.
- `ProfileOtp` lưu HMAC OTP theo user, TTL 5 phút, tối đa 5 lần sai, cooldown gửi lại 60 giây với unique index chống gửi đồng thời. `/api/auth/me/password-otp` gửi mã đến email đã gắn tài khoản; `/me/password` tiêu thụ mã một lần và đổi bcrypt hash trong transaction, tăng authVersion, xóa refresh/reset tokens. Giới hạn bcrypt 72 byte, cần chữ hoa/thường/số và ít nhất 8 ký tự. User Google có thể thiết lập mật khẩu bằng email OTP.
- Access token mang `ver`; middleware đối chiếu User.authVersion. RefreshToken cũng lưu authVersion tại thời điểm tạo phiên; token cũ không lấy được phiên mới sau đổi mật khẩu/khôi phục user. User/token legacy thiếu version được hiểu là 0.

### Purge và modal chi tiết (01/10/2026)

- Bulk `action=purge` dùng cùng snapshot HMAC/version/actor/expiry và transaction; request execute phải có `confirmation: "XOA VINH VIEN"`. Cả preview và execute kiểm tra ràng buộc. Batch gặp một mục bị bảo vệ sẽ từ chối toàn bộ, không xóa một phần.
- Giữ lịch sử thanh toán theo lựa chọn người dùng. Đơn paid/refunded hoặc có PaymentReview/TicketEmail/vé chưa hủy/SeatHistory tiền/ghế held-sold không purge. Đơn chỉ đủ điều kiện nếu unpaid/failed, cancelled/expired và được tạo trên 48 giờ; tuổi đơn không phải thời gian từ lúc hủy. Vé còn parent booking không purge riêng. Sự kiện còn bất kỳ đơn/vé hoặc held/sold không purge. User admin hoặc còn dữ liệu liên quan không purge.
- Purge sự kiện độc lập dọn seats/config/history của sự kiện, bỏ Hero.featuredEvent; giữ venue/layout dùng chung. CMS purge không xóa GridFS vì ảnh có thể được dùng nhiều nơi. Không có migration hoặc thao tác purge production tự động.
- `GET /api/admin/details/:kind/:id` (users/bookings/tickets) yêu cầu admin và no-store. DTO không có password/authVersion/hold secret/qrVersion. Giao diện hiển thị người đặt vé, không khẳng định đó là người đứng tên tài khoản chuyển tiền. Modal native dialog hỗ trợ focus trap/Escape và backdrop blur.
- Quên mật khẩu cũng tiêu thụ reset token và cập nhật password/authVersion, thu hồi refresh/profile OTP trong cùng transaction.

## Bổ sung 02/10/2026: locale, xuất dữ liệu, QR nhóm và scanner

`frontend/src/i18n` là context/catalog nội bộ, chỉ áp dụng giao diện user. `/admin` luôn `vi`; không sửa locale preference của user khi vào admin. Nội dung CMS và tên sự kiện không tự dịch vì chưa có trường dịch đã duyệt.

`GET /api/admin/export/:kind` nhận tickets/bookings/payments, format=xlsx|csv, bộ lọc danh sách và ids tùy chọn (tối đa 1.000). Phân quyền admin/no-store; rate limit riêng 10/phút; tối đa 10.000 dòng, quá giới hạn phải thu hẹp lọc. Cột thanh toán thể hiện trạng thái và thực thu sau hoàn; xuất không thay đổi dữ liệu.

`GET /api/tickets/booking/:bookingCode?pass=booking` vẫn kiểm tra chủ đơn; trả thêm bookingPass, bỏ tạo QR từng ghế khi có pass=booking. Client cũ mặc định vẫn nhận QR từng Ticket. Token FYCEB1 ký HS256 với audience riêng, chỉ chứa ID đơn. Backend đối chiếu live Booking/Ticket trước verify/check-in. Không đổi schema, không gộp/xóa Ticket và không tác động thanh toán. Email mới có một attachment QR cho toàn đơn. Check-in nhóm dùng transaction snapshot/majority; refund và check-in ghi cùng Ticket nên chỉ một nghiệp vụ thắng cạnh tranh.

`qrCamera.js` quản lý stream độc lập với API vé; pause/resume chỉ điều khiển detector. Stop/unmount giải phóng media, generation chặn stream/detector đến muộn. QR đang trong khung không gọi API lặp; sau ba khung trống được nhận lại và server vẫn kiểm tra chống vào cổng hai lần. UI luôn cần xác nhận check-in.
