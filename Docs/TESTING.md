07/10 — nhạc cụ/chuyển động: frontend19 tests gồm top-home policy cho PUSH/POP/REPLACE, build đạt, lint0 lỗi/16 warning cũ. Chrome desktop login có1 nền/4 nhạc cụ; register/login390 không overflow, wrappertransparent; logo auth và Home sau cuộn2608 đều scrollY0. Production Vercel bundleindex-BXJViotw.js: auth logo và Home sau cuộn1786 về0, register390 không overflow. Không submit form/provider. Audit hai phía0 và syntax99backendđạt; integration73 lịch sử chưa chạy lại vì backend không đổi. CSS giảm chuyển động có đầy đủ quy tắc tắt animation; chưa đo benchmark FPS mọi thiết bị.

07/10 — trailer/ảnh: frontend19/19, build đạt, lint0 lỗi/16 warning cũ. Chrome Day2 tự phát muted trong hero, readyState4; mobile390 reload cũng paused=false/time tăng sau bổ sung defaultMuted/canplay. Native dialog mở bằng click/Enter, đóng Escape/nút/bấm ngoài và phục hồi focus/overflow. Fixture GET-only API 3003/Vite5181: không trailer + có heroVideoUrl vẫn chỉ cover; trailer 404 về cover; 7 ảnh hoạt động đầy đủ, masonry 2 cột desktop/1 cột mobile390, không overflow. Home card mở ảnh giữ URL Home. Không ghi DB/provider thật.

Production QA5182: video trực tiếp Render paused=false/readyState4; test `routePublicVideo` giữ CDN signed/query/fragment, blob/local/other-origin, từ chối public origin HTTP/credential. Bản Vercel trước fix trả cached 206 chỉ2 byte cho Range0-; không lấy HEAD200 làm bằng chứng phát video thành công.

# Kiểm thử và vận hành thử

07/10: frontend **18/18**, build đạt, lint 0 lỗi/16 warning hiện hữu. Thêm test phân loại URL video: absolute GridFS, signed/extensionless CDN, YouTube watch/shorts/nocookie/short links và từ chối protocol/credentials/control characters không hợp lệ. Backend không đổi, bộ 73 test trước vẫn là kết quả lịch sử, không chạy lại trong đợt chỉ sửa frontend. Kiểm tra public HEAD phát hiện Day2 404 và Day1 200; repair URL được ghi trong PROGRESS, không dùng production cho các test transaction.

Chrome desktop: Home cuộn và EventDetail/Login có nền chung, không hidden section. Day2 player controls hiện, readyState 4, duration 10s, bấm Play paused=false/time tăng/error=null. API public xác nhận repaired source trả 200. Đây là kiểm tra video công khai, không đăng nhập/tạo đơn/chuyển tiền.

Đợt chuyển động/cuộn/video 06/10: **73/73 backend, 15/15 frontend**. Test thật với MongoDB QA: video nguồn lỗi sau chunk 1MB, GridFS abort không để lại chunks/metadata; Event English public giữ nội dung VI và bỏ trường không được phép, giới hạn độ dài. Unit scroll policy kiểm tra reload trang đọc về đầu, trang thao tác giữ vị trí, Back/hash riêng. Build đạt. UI browser của bản mới chưa nghiệm thu vì kết nối công cụ Chrome bị lỗi policy sau retry; không thay kiểm thử UI bằng unit policy.

Kết quả mới nhất **06/10/2026**: backend **71/71**, frontend **13/13**, build thành công, lint **0 errors / 16 warnings** hiện hữu; audit backend/frontend gồm dev dependencies đều **0**. Backend thêm kiểm thử bản tiếng Anh CMS/stale writes/validation và refresh thất bại không xóa cookie mới. Frontend thêm Unicode/casing/editorial fallback và token hết hạn/bị khóa/cookie 401/lỗi mạng khi phục hồi phiên.

Chrome QA 1440px/390px: font hỗ trợ tiếng Việt, homepage EN, menu đóng khi bấm ngoài/Escape; đơn paid giả 274 ghế giữ phiên khi rời trang rồi Back, reload payment=error/cancel. API QA 3002, Vite 5180 và MongoDB 27028 biệt lập; dữ liệu homepage đọc công khai chỉ dùng cho bố cục, không nhập DB production. Chưa xác minh giao dịch/Google/email/camera thật hoặc thiết bị bạn của người dùng. Chạy thêm `npm test --prefix frontend` trong quy trình bên dưới.

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

- **65/65 ca tích hợp đạt (01/10/2026)**: phân quyền, validation/pagination/regex, dashboard totals, dữ liệu nhạy cảm, user CRUD/duplicate/stale writes/block Google, bảo vệ admin, CMS CRUD/concurrent writes/unsafe URLs/media conflict, booking/ticket audit, QR tamper/duplicate check-in/event mismatch/payment state, idempotent issuance/reconciliation, payment duplicate/cancel/expiry/outgoing/partial rollback, public homepage, upload MIME/admin/GridFS round-trip.
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
- Vé: QR sai chữ ký/buổi diễn, QR đã check-in, đơn refunded/cancelled đều không được nhận vào cổng. Hoàn một phần giữ các vé còn lại hiệu lực; toàn bộ lịch sử/QR cũ/QR mới và tranh chấp refund/check-in đã có test transaction. Khi camera không hỗ trợ BarcodeDetector, nhập mã vé TKT hoặc QR thủ công.
- UI: kiểm tra bảng cuộn ngang trên mobile, sidebar dọc trái, label/focus keyboard, loading/empty/error, nút không bấm lặp trong request, thông báo xung đột 409 và retry có chủ đích.

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


### Hồi quy thùng rác / profile / gallery 01-10-2026

Đã thêm kiểm thử: code/QR check-in cạnh tranh; snapshot bulk loại trừ bản ghi mới, chống tamper/replay, rollback khi stale, không xóa admin; event trash ẩn public/chặn hold và giữ vé buyer; restore không đổi QR; ghế chỉ blocked được mở lại; reorder/gallery trash; OTP ràng buộc user, cooldown đồng thời, 5 lần sai, hết hạn, dùng một lần; đổi mật khẩu thu hồi access/refresh; avatar giả MIME bị từ chối và không sửa user khác; homepage trả hơn 100 ảnh; refresh token cũ không vượt qua authVersion mới.

QA UI dùng frontend 5180 và API 3002, chỉ MongoDB 27028; không chạy worker gửi tiền/email hay kết nối provider thật. Checkbox chỉ chọn trang hiện tại, “Xóa tất cả” theo toàn bộ bộ lọc. Xác nhận dialog trước mọi bulk operation. Khi hơn 1.000 bản ghi, thu hẹp bộ lọc; không tự chia nhỏ việc xóa thành các batch không được xem trước.

### Xóa vĩnh viễn và chi tiết quản trị

65/65 ca đạt trên MongoDB QA riêng ngày 01/10. Ca mới kiểm tra: cụm từ xác nhận bắt buộc; rollback toàn bộ nếu một mục stale; token không replay; bảo vệ đơn paid, vé, sự kiện và khách hàng liên quan; dấu vết đối soát phát sinh sau preview vẫn chặn xóa; chặn đơn mới/ghế held; cho phép đơn unpaid đủ tuổi đã đóng và sự kiện độc lập. Detail API chỉ dành cho admin, không lộ password/authVersion/QR version/hold token. Hồi quy quên mật khẩu kiểm tra tiêu thụ token một lần và thu hồi OTP/phiên cũ.

Build frontend đạt, lint 0 lỗi/16 cảnh báo hiện hữu, audit cả hai package 0 lỗ hổng. UI dashboard/modal mới chưa được nghiệm thu trực quan: browser tool lỗi request-header policy hai lần. Khi kiểm tra deploy: mở dashboard ở desktop/390px; nhấn tên người mua/mã vé/mã đơn, kiểm tra modal/nền mờ/Escape; kiểm tra checkbox và preview xóa vĩnh viễn bằng dữ liệu QA. Không purge dữ liệu production để kiểm thử.

## Kết quả 02/10/2026

69/69 backend integration, 8/8 frontend (`npm test --prefix frontend`), build đạt; lint 0 lỗi/16 cảnh báo hiện hữu. Audit cả hai package: 0. QA riêng localhost:27028, API3002, Vite5180, không đọc .env/provider thật.

Ca mới: QR nhóm 274 ghế/1 email attachment; owner/role/event/tamper, scan đồng thời chỉ một lần; partial/full refund, QR cũ từng ghế và group/refund race; CSV BOM/quotes/formula injection và XLSX typed text, lọc/chọn/không lộ secret. Frontend kiểm tra catalog locale/user input/admin locale và media lifecycle: giữ stream qua nhiều mã, chống lặp, stop khi permission pending, bỏ detector result sau stop. Camera tests dùng stream giả, không thay cho nghiệm thu thiết bị thật.

Chrome QA xác nhận VI/EN lưu lựa chọn và giữ input, header mobile390px, một QR cho đơn274ghế, giao diện adminVI, xuất XLSX chọn một đơn và nhập mã đơn đã check-in. Ảnh QA lưu /tmp/fyce-qa-evidence/group-qr-en.jpg (không đưa dữ liệu/QR vào Git).
