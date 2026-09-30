# Triển khai FYCE Vercel / Render

Cập nhật 2026-09-30. URL người dùng xác nhận: https://fyce-web.vercel.app. Backend: https://fyce-web.onrender.com. Không đặt secret trong VITE_* hoặc commit .env. Không thay trạng thái đơn thật bằng query success từ browser.

## Vercel

Root Directory `frontend`, build `npm run build`, output `dist`. Deploy cùng commit với backend. `frontend/vercel.json` phải được áp dụng: `/api/*` proxy Render, `/uploads/*` proxy Render, sau cùng SPA fallback. Production JS dùng `/api` dù VITE_API_BASE_URL cũ còn là URL Render. Nếu đổi backend domain, đổi cả hai rewrite.

Kiểm tra `https://fyce-web.vercel.app/api/health` phải trả JSON, không phải HTML/index.html. Kiểm tra header trang chính `Cross-Origin-Opener-Policy: same-origin-allow-popups`. Sau chuyển proxy, đăng nhập mới một lần để tạo cookie thuộc Vercel; cookie Render cũ không tự chuyển domain. Sau đó thử reload, quay về từ cổng thanh toán và Back/Forward; không xóa phiên vì lỗi mạng.

## Render

Root Directory `backend`, build `npm ci`, start `npm start`. Node hỗ trợ fetch/AbortSignal.timeout; MongoDB Atlas/replica set và quyền tạo index/collection cần có. Không dùng MongoDB standalone cho thanh toán/hoàn vé transaction.

Biến môi trường cần đối chiếu trong dashboard (giữ nguyên khóa đang dùng, không tùy tiện xoay khóa):

- NODE_ENV=production
- CLIENT_URL=https://fyce-web.vercel.app
- CLIENT_URLS: chỉ các frontend origin bổ sung thực sự sử dụng, ngăn cách dấu phẩy.
- REFRESH_COOKIE_SAME_SITE=lax khi dùng proxy trên.
- MONGO_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, TICKET_QR_SECRET; JWT_ACCESS_EXPIRES/JWT_REFRESH_EXPIRES theo chính sách hiện có. Thiếu TICKET_QR_SECRET ở production làm API tạo QR không hoạt động.
- GOOGLE_CLIENT_ID khớp VITE_GOOGLE_CLIENT_ID trên Vercel.
- SEPAY_ENV=production cho tiền thật, sandbox cho thử nghiệm; merchant/secret phải cùng môi trường. Không dùng sandbox để đối chiếu giao dịch tiền thật.
- SEPAY_MERCHANT_ID và SEPAY_SECRET_KEY dùng checkout + REST. SEPAY_IPN_SECRET là secret xác thực IPN đã cấu hình ở SePay; nếu bỏ trống dùng SEPAY_SECRET_KEY.

Worker đối chiếu và email chạy cùng server, không cần người mua mở trang. Render Free có thể ngủ khi không có traffic; không hứa giao vé/email tức thời khi instance đang ngủ. Với yêu cầu vận hành liên tục, cần instance luôn chạy phù hợp với tài khoản/chính sách vận hành.

## SePay

Cấu hình **IPN của Cổng thanh toán** đến `https://fyce-web.onrender.com/api/payments/sepay-webhook`, HTTP POST HTTPS public, authentication SECRET_KEY gửi X-Secret-Key khớp env. Kiểm tra log delivery tại SePay: 401 là secret sai, 500 cần retry/kiểm tra server. Webhook biến động số dư và gateway IPN là hai loại khác nhau, không trộn cấu hình khóa.

Fallback REST tìm invoice FYCE chính xác, lấy order_id rồi detail. Nhận CAPTURED + APPROVED PAYMENT đúng VND/đủ số tiền; chuyển khoản có transactions rỗng dùng order-level CAPTURED từ merchant REST. Không áp dụng ngoại lệ này cho browser/IPN. Worker quét đơn pending/expired trong 48h, tự retry; lỗi nhà cung cấp backoff. Khi IPN tới, không cần chờ worker. Browser polling 10 giây khi tab hiển thị; không tự dừng sau hai phút.

Nếu đã có giao dịch trong SePay nhưng chưa có vé: đối chiếu mã FYCE, môi trường merchant, status/detail transaction, IPN delivery, Render logs. Giao dịch trong danh sách biến động ngân hàng chưa chắc đã được gateway gắn vào đúng invoice. Không đánh dấu paid chỉ dựa vào ảnh giao dịch. Admin → Đơn vé & thanh toán → Đối chiếu đọc REST thật; log và paymentReviewRequired hiển thị nếu lệch tiền hoặc ghế đã thuộc đơn khác. Đơn cũ hơn 48 giờ cần chủ động gọi đối chiếu; worker không tự quét lịch sử vô hạn.

Trường hợp IPN đến trễ: nếu provider xác nhận chuyển trong hạn và mọi ghế vẫn rảnh/thuộc hold cũ thì tự cấp vé. Nếu ghế đã có chủ mới hoặc tiền chuyển sau hạn, giữ lịch sử và chuyển đối chiếu thủ công; không thu hồi ghế người khác. User không nên chuyển thêm tiền để “thử lại”.

## Email vé và OTP

Mặc định SMTP: SMTP_HOST/PORT/SECURE/USER/PASSWORD, có thể đặt EMAIL_FROM. [Render Free chặn outbound SMTP 25/465/587](https://render.com/docs/free); nếu dùng gói đó, cấu hình HTTPS đã hỗ trợ:

- EMAIL_PROVIDER=resend
- RESEND_API_KEY: key gửi mail ở backend
- EMAIL_FROM: địa chỉ thuộc domain đã xác minh trên nhà cung cấp

Không tự tạo tài khoản hoặc mua dịch vụ trong phiên sửa này. Khi chưa có transport hợp lệ, queue giữ pending và admin thấy tình trạng; thanh toán vẫn phát hành vé trong web. Không coi provider nhận API là thư đã vào inbox. Kiểm tra delivered/bounce/spam bằng tài khoản thử được phép sử dụng.

Email chứa thông tin đơn/ghế, link vé, QR PNG inline CID và đính kèm. Queue unique bookingId, retry có lease. SMTP vẫn có khả năng gửi trùng khi crash đúng khoảng sau gửi/trước ghi sent; Resend idempotency 24 giờ giảm trường hợp này. Nội dung QR email dùng thời điểm phát hành cố định để payload retry ổn định. Không chạy backfill email toàn bộ lịch sử; reconcile lại đơn đã paid có thể tạo job còn thiếu.

## Google và cảnh báo trình duyệt

Thêm Authorized JavaScript origin chính xác `https://fyce-web.vercel.app` vào đúng OAuth Web Client, đồng bộ client ID hai phía. Không thêm /login vào origin. Singleton initialize/COOP đã sửa trong code, nhưng không thể thay cấu hình Google Cloud từ repository. [Google hướng dẫn cấu hình](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

CSP report-only của trang pay.sepay.vn là chính sách của SePay, không phải bằng chứng FYCE từ chối giao dịch. Không nới CSP toàn cục hoặc bỏ xác thực webhook để che cảnh báo.

## Nghiệm thu trước khi kết luận production ổn định

1. Health JSON qua Vercel; phiên login còn sau reload/rời trang/quay lại; guest refresh 401 không có cookie là bình thường.
2. SePay sandbox đúng tiền → paid/confirmed → đúng số vé/QR → email; lặp IPN không tạo thêm vé/job; đóng tab vẫn tự cấp vé.
3. Cancel/error return không làm mất auth và không ghi đè đơn đã paid; thiếu tiền/ghế có chủ mới không cấp vé nhầm.
4. Check-in QR một lần; offline refund trả ghế, QR cũ vô hiệu, người mua mới nhận QR mới.
5. Kiểm tra giao dịch lỗi cụ thể bằng mã đơn người dùng cung cấp. Phiên này chưa nhận mã đó, không tự sửa đơn thật.

Nguồn: [Vercel rewrites](https://vercel.com/docs/routing/rewrites), [SePay IPN](https://developer.sepay.vn/vi/cong-thanh-toan/IPN), [SePay order detail](https://developer.sepay.vn/vi/cong-thanh-toan/API/don-hang/chi-tiet-don-hang), [Resend send email](https://resend.com/docs/api-reference/emails/send-email), [CID attachments](https://resend.com/changelog/embed-images-using-cid).

### Phân biệt webhook ngân hàng với gateway IPN

Webhook ngân hàng có thể chứa PAY... thay vì mã FYCE; backend sẽ tra chính xác mã gateway qua REST merchant rồi đối chiếu invoice. HMAC dùng SEPAY_WEBHOOK_SECRET (hoặc tên cũ SEPAY_WEBHOOK_TOKEN), khác SEPAY_IPN_SECRET. Không bỏ xác thực để tránh 401. HTTP 200 có success:false không có nghĩa đã cấp vé; phải đọc response body trong lịch sử SePay. Lỗi 401/403 ở REST cần kiểm tra merchant/secret/môi trường **trên Render**, không chỉ .env local; 429 chờ retry. Tab đang giữ bundle cũ cần tải lại để nhận bản mới; refresh guest 401 không đồng nghĩa tài khoản mất dữ liệu.
