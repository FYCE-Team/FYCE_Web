# Tiến độ FYCE admin

Cập nhật 2026-09-29. Phạm vi rà soát: mã nguồn, dependencies và luồng dữ liệu của dự án FYCEweb; không phải chẩn đoán/sửa toàn bộ hệ điều hành của máy.

**Tiến độ nghiệm thu: 8/10 hạng mục — 80%**

`████████░░` Chức năng đã triển khai; đã xác minh một phần UI Safari; còn mobile/camera và tích hợp nhà cung cấp.

| Hạng mục                                        | Trạng thái                    | Bằng chứng / phần còn lại                                                                                                             |
| ----------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Khảo sát cấu trúc và hợp đồng backend           | Hoàn thành                    | `ARCHITECTURE.md`; không tìm thấy Docs/AGENTS sẵn có trong checkout                                                                   |
| User                                            | Hoàn thành ở mức API/build    | Danh sách/tìm kiếm/lọc/phân trang/tạo/sửa/phân quyền/khóa; chống stale write và mất admin cuối                                        |
| Trang chủ                                       | Hoàn thành ở mức API/build    | CRUD hero/about/gallery, upload/gỡ ảnh/video, bản nháp/hiển thị/thứ tự, feature editor, preview ảnh                                   |
| Đơn vé và thanh toán                            | Hoàn thành ở mức API/build    | Danh sách/lọc/chi tiết/hủy pending/đối soát SePay/nhật ký xử lý                                                                       |
| Vé và check-in                                  | Hoàn thành ở mức API/build    | Danh sách/lọc theo event, lịch sử check-in, đối chiếu đơn–vé–ghế, chặn sai event/đơn chưa paid                                        |
| Dashboard, điều hướng, tải trang                | Hoàn thành ở mức build        | Dashboard mới tại `/admin`, màu FYCE, responsive CSS, lazy routes; hết cảnh báo chunk >500kB                                          |
| Sửa lỗi bảo mật/concurrency và tự động kiểm tra | Hoàn thành trong phạm vi test | 35/35 test đạt; build/cú pháp đạt; audit hai phía 0 lỗ hổng; lint 0 error, 16 warning cũ                                                                   |
| Tài liệu bàn giao                               | Hoàn thành                    | Docs này, `ARCHITECTURE.md`, `TESTING.md`, `progress.json`                                                                            |
| Nghiệm thu UI desktop/mobile và camera | Đã kiểm tra một phần trên Safari | Đăng nhập, CMS draft→publish, đối chiếu đơn, check-in, form hoàn vé; chưa mobile/camera thật. |
| E2E SePay/SMTP/Google và vận hành production    | Chưa xác minh                 | Chưa gọi dịch vụ thật, chưa thực hiện thanh toán/hoàn tiền thật, chưa triển khai; cần môi trường sandbox tích hợp đầy đủ.             |

## Lỗi đã xử lý

- Token cũ không còn sử dụng được nếu user bị khóa; role được lấy từ DB, tránh tin role cũ trong token.
- Google login không tự bỏ qua khóa quản trị; tài khoản Google chưa có password không gây lỗi bcrypt khi login bằng password.
- Sửa user/CMS đồng thời trả 409 thay vì ghi đè; list API giới hạn phân trang và escape regex tìm kiếm.
- Ẩn password, googleId, holdToken, qrVersion khỏi danh sách quản trị; dữ liệu admin không cache.
- Check-in kiểm tra đơn paid/confirmed và event; cập nhật check-in nguyên tử chống hai lần vào cổng.
- Thanh toán cạnh tranh hủy/hết hạn, callback trùng và bán một phần ghế được bổ sung điều kiện cập nhật/rollback theo owner của lần xử lý.
- Giao dịch chiều ra `transferType: out` bị từ chối; thanh toán muộn/sự cố được ghi PaymentReview.
- Upload media chỉ dành cho admin; cập nhật multer/nodemailer theo kết quả npm audit.
- Loại bỏ debug đường dẫn/SMTP config và kết nối SMTP tự chạy khi import module.
- Giới hạn retry refresh trong trang sự kiện cũ, sửa dependency callback giữ ghế và phần ghi chú ghế, dọn import/state không dùng, cập nhật đồng hồ hết hạn trên chi tiết booking.
- Dashboard/luồng đăng nhập admin trỏ `/admin`; menu quản trị đầy đủ; tách bundle admin khỏi trang public.

## Những việc người/AI tiếp theo cần làm

1. Đọc ba tài liệu Docs trước khi sửa. Kiểm tra `git status`: commit bàn giao xem trong Git history; `fyce_backup/` có sẵn trước phiên làm việc, đã được ignore và không thuộc commit.
2. Chạy kiểm thử theo `TESTING.md`, dùng đúng DB thử nghiệm riêng. Không đổi URI test sang production.
3. Tiếp tục nghiệm thu toàn bộ CRUD và layout ở 1440px/768px/390px, validation, modal xác nhận xóa/hủy, keyboard, stale write hai tab, refresh auth, upload thật và camera trên HTTPS.
4. Kiểm thử SePay sandbox đủ số tiền/thiếu tiền/thanh toán muộn/webhook lặp, SMTP OTP, Google OAuth và refresh cookie trong cấu hình deploy thật. Hoàn tiền thực hiện ngoài hệ thống; đã có xác nhận admin và trả ghế bằng transaction. Không cần API refund provider trong phạm vi hiện tại.
5. Rà soát 16 cảnh báo lint cũ chủ yếu React set-state-in-effect và Fast Refresh. Không tắt rule toàn cục để che cảnh báo. Đây không phải lỗi build; chưa refactor hàng loạt các màn hình ngoài admin.
6. Với yêu cầu crash-consistency xuyên Booking/Seat/Ticket, triển khai transaction/outbox trên replica set; luồng refund đã có transaction; payment cũ chỉ được kiểm chứng trong các tình huống đã kiểm thử, không tuyên bố hệ thống tuyệt đối không lỗi.

**Không đánh dấu 100% hoặc “không còn lỗi” trước khi hoàn tất hai cổng nghiệm thu còn lại.**

## Cập nhật theo lỗi người dùng báo

- Backend cổng 3000 đã khởi động và nối Atlas; health/homepage HTTP 200. CORS development cho phép localhost:5173; production dùng allowlist. Vite giữ cổng cố định.
- Client ID Google hai phía khớp. Còn cần Authorized JavaScript origins trên Google Cloud; hướng dẫn tại `LOCAL_SETUP.md`. Chưa xác nhận Google OAuth thật.
- Footer admin đã khôi phục component Footer ban đầu theo yêu cầu.
- Hoàn vé thủ công từng ghế/toàn đơn: chọn vé, ghi chú, xác nhận đã xử lý tiền bên ngoài, transaction, vô hiệu QR cũ, lưu lịch sử, bán lại QR mới. Dashboard tính tiền còn lại sau hoàn; trang người mua giữ lịch sử đơn đã hoàn.
- 35 test đạt gồm partial/full refund, QR cũ/mới, không hồi sinh vé bằng issuance retry, rollback nhiều collection, đồng thời refund/refund và refund/check-in, ghế legacy, từ chối vé đã check-in, CORS và audit hold hết hạn.
- Safari desktop: login QA thành công; form refund chuyển trạng thái và hiện lịch sử admin/thời gian/lý do. Các thử nghiệm sửa dữ liệu chỉ dùng DB QA; không hoàn tiền hoặc sửa đơn thật.
- Tiến độ vẫn 80% theo 10 cổng nghiệm thu: UI mới xác minh một phần; provider/mobile/camera còn mở. Không đánh dấu hoàn thành toàn bộ.

- Đã mở Safari `http://localhost:5173`: trang chủ hiển thị dữ liệu CMS và hai sự kiện từ backend thật. Đã tắt tiến trình QA 27028/3018/5174; giữ API ứng dụng 3000 và frontend 5173. Backend cần được chạy lại thủ công sau khi đóng terminal/reboot.
