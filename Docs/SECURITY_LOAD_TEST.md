# Rà soát bảo mật và tải — 08/10/2026

## Phạm vi và nghiệm thu

Kiểm tra repository FYCEweb; không quét/sửa toàn bộ hệ điều hành, không stress Vercel/Render, không đọc `.env`/dump, không gửi email hoặc thanh toán thật. MongoDB replica QA `127.0.0.1:27028`; integration dùng `fyce_admin_test`, benchmark dùng `fyce_load_test`. Harness không cho thay target bằng URL/URI production và chỉ dọn DB fixture cố định.

**Chưa chứng nhận 1.000 hoặc 10.000 người đồng thời không lỗi trên production.** Gói CPU/RAM/replica Render chưa được cung cấp. 10.000 request tổng không phải 10.000 người đồng thời. Giữ tiến độ tổng90%; không dùng audit hoặc unit tests làm bằng chứng tuyệt đối an toàn.

## Phát hiện và sửa

| Vấn đề | Thay đổi và kiểm chứng |
| --- | --- |
| OTP đọc/tăng/save mất lượt khi gửi đồng thời | `$inc` có điều kiện dưới5 lượt, đúng hash/expiry; signup tiêu thụ OTP+kích hoạt user trong transaction; reset xác nhận bằng CAS. 24 mã sai đồng thời dừng ở5;8 mã đúng chỉ một thành công cho mỗi luồng. |
| Cookie refresh/logout cần kiểm tra origin ngoài CORS | Allowlist chính xác CLIENT_URL/CLIENT_URLS; Origin lạ/null403; development localhost5173. Không Origin vẫn cần cookie thật. |
| JWT verify không giới hạn thuật toán | Chỉ HS256; HS512 bị401. Không đổi khóa đang dùng. |
| Homepage reload đồng thời tạo nhiều truy vấn giống nhau | Single-flight gộp query đang chạy; không giữ kết quả/TTL. 1.000 callers chỉ một loader; lần sau đọc mới, lỗi không kẹt promise. |
| Thiếu giới hạn xử lý và chờ DB | Admission trước parser: general80, webhook16, multipart2 mỗi process; excess503+Retry-After2. Pool20, wait queue5s, server selection10s. Kiểm tra release khi ngắt/kết thúc và slot webhook/health riêng. DB áp lực trả503, không401/xóa cookie. |
| Header/body chậm | Header15s, body120s, keep-alive5s, header16KiB,1.000 request/socket; listen backlog2048 (OS có thể giới hạn thấp hơn). Socket header chưa kết thúc nhận408; không đặt timer response cắt trailer. |
| GridFS vẫn đọc khi client F5/rời trang | Destroy download stream khi response close; kiểm thử ngắt image/video thấy nguồn được hủy. |
| Ảnh admin chỉ kiểm tra MIME khai báo | Kiểm tra magic JPG/PNG/GIF/WebP trước lưu; giới hạn multipart files/fields/parts. SVG giả PNG bị400, không tăng GridFS files. Đây là kiểm tra chữ ký, không phải giải mã toàn ảnh hoặc antivirus. |
| JSON sai/quá lớn thành500 hoặc phản chiếu input |400 chung,413 khi vượt2MiB; không phản chiếu input; health vẫn200. |
| Hai nhãn bộ đếm thiếu English | Bổ sung catalog có dấu `:`; frontend19/19 đạt. |

Không thay schema/collection, tiền/lịch sử, QR, trạng thái payment hoặc quy tắc giữ ghế. Không cache ghế/hold/vé hoặc bỏ xác minh SePay. Webhook có slot riêng vẫn phải vượt secret/HMAC/transaction. Admission không thay WAF/chống DDoS; yêu cầu đang stream media cũng chiếm slot general.

## Hồi quy

- Backend **82/82**:78 integration +4 admission/single-flight/DB503/HTTP. Bao gồm role/ownership/stale write/bulk HMAC, purge giữ lịch sử tiền, CSV/XLSX, refresh rotation, webhook giả/lặp, đối soát, rollback Booking/Seat/Ticket/email, refund/bán lại và check-in cạnh tranh.
- Frontend **19/19**, production build đạt; lint0 lỗi/16 cảnh báo cũ, không tắt rule.
- npm audit backend/frontend cả dev dependencies:0 advisory tại thời điểm kiểm tra; không loại trừ lỗ hổng chưa công bố.
- Syntax107 file backend/test/harness và diff check đạt; không track `.env`, backup hoặc key. Local còn khoảng70GiB; không dọn Atlas chunks/dữ liệu thật hoặc chỉnh kernel.

## Số đo local cuối

Generator, API child process và MongoDB cùng máy Apple M4/16GiB/Node22.20.0. Không đo render trình duyệt, CDN, media transfer hoặc Google/SePay/SMTP/Internet. Hồi quy kết thúc trước benchmark cuối. [Report JSON đầy đủ](security-load-results.json) có ngày, latency toàn bộ và thành công, status, timeout, RSS, event-loop và recovery.

| Phase | Request tổng | Request đang chờ tối đa |200|503| Lỗi mạng |p95 thành công ms|RSS API đỉnh MiB|
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| homepage-reload | 1000 | 25 | 1000 | 0 | 0 | 7.2 | 150.3 |
| mixed-burst-100 | 2000 | 100 | 1253 | 747 | 0 | 149.1 | 303.7 |
| mixed-burst-1000 | 10000 | 1000 | 2685 | 7025 | 290 | 4080.8 | 313.1 |
| paced-1000-workers | 3000 | 8 | 3000 | 0 | 0 | 3.9 | 317.1 |
| reload-abort | 500 | 100 | 1 | 0 | 0 | 8.4 | 317.3 |

Sau **mọi phase**, homepage truy vấn DB trở lại200; không có HTTP500 trong benchmark. `reload-abort` có500 lượt client chủ động hủy sau2ms, không gộp vào lỗi mạng. Ngắt download media được kiểm tra riêng ở integration.

**Cold burst1.000 request chưa đạt**: có ETIMEDOUT và503. Script thoát1, vẫn ghi report; không retry ẩn lỗi. Máy có `kern.ipc.somaxconn=128` (chỉ đọc), backlog ứng dụng2048 không vượt giới hạn OS. Đây là yếu tố liên quan, chưa chứng minh nguyên nhân duy nhất. Không chỉnh hệ điều hành để làm đẹp số đo.

`paced-1000-workers` là1.000 worker, mỗi worker3 request, khởi đầu trải5s, nghỉ1s giữa lượt:3.000/3.000 HTTP200, nhưng chỉ tối đa8 request đang chờ; **không dùng phase này chứng nhận1.000 request đồng thời**. 503 là từ chối có kiểm soát, không đáp ứng yêu cầu “mọi lượt đều thành công”.

## Giới hạn và điều kiện tải production

Admission tính response mỗi process; query đã gửi có thể tiếp tục sau client abort. Pool20 giới hạn socket, wait queue timeout không giới hạn thời gian thực thi query. Không tuyên bố RAM luôn nằm trong gói Render hoặc DB jobs luôn dưới80. Rate limiter hiện dùng memory process; nhiều replica cần store chung và kiểm chứng IP Vercel→Render, không tin tùy ý X-Forwarded-For. Health hiện là liveness, không phải readiness DB. Worker thanh toán/email cần instance đang chạy và lease đã có.

Để nghiệm thu1.000/10.000 user cần staging tương đương gói thật, data/index/latency gần thật, generator máy khác, ramp/soak lâu; đo lỗi, throughput thành công, p95/p99, RAM/CPU/pool/query chậm. Thử TCP cold burst, hold tranh ghế, callback lặp, refresh, polling và media. Provider dùng sandbox. Chốt ngưỡng lỗi/latency trước khi đo; localhost không suy ra năng lực Render.

Media lớn nên tách khỏi API/Atlas streaming qua storage/CDN chủ dự án cấu hình; public cache phải có invalidation khi lưu CMS. Không cache dữ liệu cá nhân/ghế/payment. Xem [MEDIA_STORAGE.md](MEDIA_STORAGE.md). Tải vượt một instance cần CPU/RAM/replica thích hợp, pool theo tổng kết nối Atlas, shared limiter và thử lại; tăng HTTP_MAX_INFLIGHT đơn lẻ có thể cạn RAM. Chưa có cấu hình/credentials staging để thực hiện phần này.

## Chạy lại

1. Khởi động replica QA riêng27028 theo [TESTING.md](TESTING.md); không đổi URI script.
2. `npm test --prefix backend`; `npm test --prefix frontend`; `npm run build --prefix frontend`; `npm run lint --prefix frontend`.
3. Test xong mới `npm run test:load --prefix backend`; không chạy hai benchmark cùng DB fixture. Report ở `/tmp/fyce-security-load-results.json`.
4. Đọc cả exit code và status/errors; không chỉ health200. Harness không đọc `.env`, không import server.js/provider workers, tự dọn fixture.
5. Deploy frontend/backend cùng commit; CLIENT_URL phải đúng origin để refresh/logout không403; không xoay secret. HTTP_MAX_* có default nên env bổ sung không bắt buộc.

API references: [Node HTTP](https://nodejs.org/api/http.html), [Mongoose connections](https://mongoosejs.com/docs/connections.html), [Mongo driver pool/wait queue](https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/connection-pools/).
