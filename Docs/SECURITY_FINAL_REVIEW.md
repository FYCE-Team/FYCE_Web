# Rà soát bảo mật và độ ổn định — 11/10/2026

Phạm vi là repository FYCEweb: API, đăng nhập/OTP, đặt/nhả ghế, callback và phát hành vé qua hồi quy, media/GridFS, frontend và dependency. Dùng dữ liệu giả trên MongoDB replica QA `127.0.0.1:27028`, không đọc `.env` thật, không gửi email/chuyển tiền hoặc thay tài khoản/đơn production. Đây không phải chứng nhận không thể bị tấn công hoặc kiểm tra toàn bộ hệ điều hành máy người dùng.

## Các lỗi đã sửa

| Khu vực | Lỗi/rủi ro trước sửa | Hành vi sau sửa |
| --- | --- | --- |
| Đăng ký chưa xác thực | Có thể sửa đăng ký bằng ID; sửa dữ liệu có thể tranh chấp với kích hoạt | Tiếp tục cần token HMAC 24 giờ gắn với tài khoản và phiên bản mật khẩu, hoặc mật khẩu ban đầu cho client cũ. Transaction/CAS ngăn ghi đè tài khoản đã kích hoạt; token không dùng làm access JWT. Nếu gửi email lỗi trước khi nhận ID, thử lại vẫn cần đúng mật khẩu pending ban đầu, không khôi phục chỉ bằng email. |
| Liên kết Google | Kích hoạt đăng ký chưa xác thực có thể giữ mật khẩu do người khác đặt trước | Khi Google nhận quyền sở hữu email đang chờ xác thực, xóa mật khẩu/điện thoại chưa xác minh, thu hồi thông tin xác thực đang chờ và tăng authVersion. Giữ mật khẩu local đã xác thực. |
| Google email bên thứ ba | `email_verified` riêng lẻ không đủ bằng chứng về quyền sở hữu hiện tại | Chỉ Gmail hoặc Workspace có `hd` đã được xác minh mới tự tạo/liên kết theo email. Google ID đã liên kết tiếp tục hoạt động. Email khác dùng đăng ký/OTP hoặc đăng nhập local. |
| OTP | Hash sáu chữ số không có khóa dễ dò khi lộ DB; resend đồng thời hoặc cleanup chậm ảnh hưởng mã mới | HMAC có khóa server, ràng buộc mục đích/user và nonce riêng từng lần; serialized resend/cooldown; cleanup khớp đúng thế hệ. OTP cũ còn hạn được hỗ trợ chuyển tiếp, vẫn giới hạn lần thử và dùng một lần. |
| Phiên trình duyệt | Login/Google login thiếu kiểm tra Origin ở thao tác cấp cookie | Cùng allowlist Origin như refresh/logout; giữ proxy API first-party và COOP hỗ trợ popup. |
| Đặt và nhả ghế | Cùng hold có thể tạo nhiều invoice; nhả/cleanup/repair có thể đụng invoice vừa tạo | Transaction khóa cùng bản ghi account và CAS ghế; checkout cùng hold trả cùng đơn. Giữ hạn/token đã đóng băng của invoice; không giải phóng ghế thuộc invoice mới. Không đổi logic xác nhận tiền/QR. Admin vẫn hủy được đơn unpaid của buyer bị khóa/inactive/trash qua quyền nội bộ; người mua không thể tự bỏ kiểm tra này. |
| Ghế public | Có thể đọc sự kiện chưa công bố hoặc trường liên kết đơn; sửa category có race | Chỉ sự kiện published chưa xóa; bỏ sale ownership khỏi response; CAS category chỉ khi ghế vẫn available. Hold kiểm tra cửa sổ bán. |
| Dữ liệu public | Event có thể trả email/tên quản trị viên; hero có thể lộ featured event draft | Loại author metadata khỏi public event/CMS; populate chỉ event published chưa xóa. API admin giữ thông tin phục vụ quản trị. |
| Upload/avatar | Text multipart chưa chặn đủ; upload lặp có thể làm đầy Atlas | Giới hạn multipart trước lưu, avatar 5 lần/15 phút/tài khoản và quota cộng dồn 20 ảnh/25 MiB; đặt chỗ dung lượng nguyên tử, không xóa ảnh cũ/dùng chung. |
| GridFS | Lỗi lúc ghi metadata có thể để chunks rác; lỗi download còn header độ dài cũ | Ghi có backpressure; cleanup đúng ID mới sau lỗi nguồn/chunk/finalization; HEAD không mở download; ngắt kết nối trong lúc đọc metadata không mở stream muộn; lỗi trước byte đầu trả JSON no-store đủ nội dung. |
| Frontend | Thiếu bảo vệ nhúng trang và một số nhãn tiếng Anh | Vercel có frame-ancestors/X-Frame-Options, nosniff, object/base restriction và Permissions-Policy; thêm bản dịch lỗi bảo mật và ba tiêu đề user đã sửa. |

Điều kiện Google dựa trên [hướng dẫn xác minh ID token của Google](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token): email ngoài Gmail/Workspace có thể đổi chủ sau lần Google xác minh trước đó. Backend vẫn xác minh chữ ký, audience, issuer và hạn token qua thư viện chính thức.

## Kiểm thử và số đo

- `npm test --prefix backend`: **135/135** đạt (78 nghiệp vụ, 4 load protection, 22 auth, 15 booking, 14 media, 2 public metadata), không skip. Lỗi admin cancel buyer bị khóa phát hiện trong lần chạy tổng hợp đầu đã sửa và chạy lại đạt.
- `npm test --prefix frontend`: **19/19** đạt; production build đạt (`index-AxDCIVkb.js`); lint 0 lỗi/16 warning hiện hữu.
- Cú pháp **112** file backend/test/harness và `git diff --check` đạt.
- `npm audit` ở root, backend, frontend gồm dev dependencies: **0 advisory** tại thời điểm kiểm tra. Scan một số mẫu private key/GitHub token/AWS access key trong source tracked không có match; đây không phải quét secret toàn diện. Chỉ `.env.example` được track.
- Benchmark cuối được ghi riêng ở [SECURITY_LOAD_TEST.md](SECURITY_LOAD_TEST.md); capacity production vẫn chưa chứng nhận. Các suite riêng dùng database `fyce_auth_security_test`, `fyce_booking_security_test`, `fyce_media_security_test`, `fyce_public_security_test`; bộ nghiệp vụ dùng `fyce_admin_test`, benchmark dùng `fyce_load_test`. Không chạy hai bản của cùng suite/benchmark đồng thời. Lệnh và điều kiện tái hiện ở [TESTING.md](TESTING.md).

## Tương thích triển khai

- Deploy backend và frontend cùng release, giữ nguyên env secrets; không cần thêm secret, collection nghiệp vụ hay index migration. MongoDB vẫn cần replica set/Atlas để transaction hoạt động.
- `User.avatarStorageBytes`/`avatarStorageCount` là trường nội bộ thêm mới, không trả trong API. Tài khoản cũ khởi tạo từ các file xác định là avatar của chính tài khoản; không tính CMS hoặc xóa file dùng chung. Nếu cleanup lỗi không thể xác minh, giữ reservation để không vượt quota. Quota cần owner hỗ trợ dọn/đối chiếu khi đầy.
- OTP mới dùng `JWT_REFRESH_SECRET` với domain/purpose riêng; mã SHA-256 cũ chỉ được chấp nhận khi còn hạn và chưa dùng. Rollback backend cũ không hiểu OTP HMAC đang lưu: người dùng cần yêu cầu mã mới; ưu tiên forward-fix.
- Token đăng ký nằm trong sessionStorage của tab, hết hạn sau 24 giờ; chỉ sửa đăng ký đang chờ, không cấp quyền đăng nhập/admin. Thay mật khẩu/email/username làm token cũ mất hiệu lực. Không lưu mật khẩu trong browser storage.
- Cookie Origin cần `CLIENT_URL`/`CLIENT_URLS` chính xác cả local và deploy. Không bỏ kiểm tra khi cấu hình sai. Quy tắc CSP mới chỉ bảo vệ base/object/framing, chưa phải chính sách script nonce đầy đủ.

## Những phần chưa đủ điều kiện chốt

1. **Tài khoản Google đã liên kết trước bản sửa:** dữ liệu cũ không ghi nguồn gốc mật khẩu, nên không thể tự phân biệt mật khẩu local hợp lệ với mật khẩu tồn tại từ đăng ký chưa xác thực. Bản sửa chặn trường hợp mới; cần chủ hệ thống rà soát nhóm tài khoản lịch sử và tổ chức xác minh/đặt lại mật khẩu, thu hồi phiên khi xác định bị ảnh hưởng. Không tự reset hàng loạt tài khoản thật trong QA.
2. **1.000/10.000 người đồng thời:** không chứng nhận từ localhost. Cần gói Render, staging tương đương production và generator khác máy; benchmark hiện chỉ kiểm tra API với dữ liệu giả. 503 bảo vệ quá tải không tính là đáp ứng thành công.
3. Rate limit/admission còn theo từng process; nhiều replica cần store chung và xác minh IP chuỗi proxy Vercel→Render. Header timeouts/pool limits không thay cho bảo vệ DDoS tại edge. Health là liveness, không bảo đảm DB ready.
4. Nghiệm thu SePay/Google/SMTP inbox/camera thật và thiết bị của người dùng vẫn cần dữ liệu/quyền/thiết bị tương ứng. Không suy ra nhà cung cấp hoạt động chỉ từ mock test hoặc health200.
5. Không tự dọn Atlas chunks cũ, quét malware hệ điều hành, đổi kernel hoặc thay dữ liệu production. Quota media và quyền tài khoản dịch vụ cần owner xử lý theo [MEDIA_STORAGE.md](MEDIA_STORAGE.md).

Tiến độ toàn dự án giữ **90%** cho đến khi hoàn tất các cổng nghiệm thu bên ngoài và mục lịch sử tài khoản/tải production. Audit dependency 0 advisory không loại trừ lỗ hổng chưa công bố.
