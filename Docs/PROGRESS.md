## Bảo mật và chống quá tải — 08/10/2026

**█████████░ 90% — hồi quy đạt; chưa chứng nhận1.000/10.000 concurrent production.**

- Đã sửa race OTP/CAS, bảo vệ Origin cho cookie refresh/logout, JWT HS256, giới hạn request/DB wait, single-flight homepage, HTTP timeouts, ngắt GridFS khi client rời trang, magic ảnh và JSON errors; bổ sung2 nhãn English thiếu.
- Backend82/82 (78 integration+4 unit), frontend19/19, build đạt, lint0 lỗi/16 warning cũ, audits0 hai phía, syntax107 và diff check đạt. Không thay schema/tiền/QR/hold hoặc dữ liệu/provider thật.
- Local tải:1.000 reload/25 concurrent đều200;10.000 request burst/1.000 outstanding có2685 HTTP200,7025 HTTP503 bảo vệ và290 ETIMEDOUT. API không crash và mọi phase phục hồi homepage200. 1.000 worker có nhịp nghỉ:3000/3000 HTTP200, **tối đa8 outstanding**, không chứng nhận1.000 request đồng thời.500 abort chủ động không làm mất khả năng phục vụ.
- Cold burst chưa đạt, harness exit1 và giữ JSON; kernel backlog local128 chỉ được đọc, không chỉnh OS. Gói Render/staging chưa có, không stress production và không hứa10.000 user. Report/điều kiện nghiệm thu: [SECURITY_LOAD_TEST.md](SECURITY_LOAD_TEST.md), [số đo JSON](security-load-results.json).
- Thanh tiến độ giữ90%; các cổng Google/SePay/email/camera trước đây và capacity production còn mở. Commit/push xem Git history; không coi push là bằng chứng Render đã chạy đúng backend.

---

## Căn hàng header trên Safari — 08/10/2026

- Quan sát Safari production: nút tài khoản lệch lên so với nav/language/admin. Account wrapper đổi từ normal inline flow sang flex center; nút account dùng flex, chữ/avatar/SVG có display và line-height rõ ràng, ảnh avatar block để bỏ khoảng baseline.
- Chuẩn hóa native appearance/margin/font/line-height các nút chỉ trong site-header; login/register dùng flex center. Giữ dropdown, breakpoints mobile, dấu focus và toàn bộ hành vi auth/API.
- Production build/diff check đạt; commit `9eca0fb` đã push main, Vercel success. Safari production có phiên sẵn: tài khoản/avatar/chevron cùng hàng với nav/admin/language; dropdown mở/đóng được. Chrome desktop: tâm nav/language/admin/account đều y35px; mobile390 account/menu tâm y32px, scrollWidth390. Viewport reset; chỉ mở/đóng menu, không ghi tài khoản/DB hoặc thay cấu hình Safari. Evidence tạm `/tmp/fyce-header-safari.png`. Không nghiệm thu mọi phiên bản trình duyệt/thiết bị.

---

## Bộ đếm ngược concert và liên hệ hỗ trợ — 07/10/2026

- Điều chỉnh theo phản hồi: ô cao tối thiểu56px, chữ số22px; nền trắng/xanh rất nhạt, ô giây màu kem/vàng nhẹ, viền mảnh và bóng nhẹ. Bỏ ánh sáng lướt và nảy/scale, giữ chuyển số4px/18deg trong380ms cùng reduced-motion. Chỉ CSS, không đổi thời gian sự kiện hoặc API. Build/diff check đạt.
- Bộ đếm Home dùng ô xanh đậm/vàng, số tabular, hiệu ứng lật/nảy khi giá trị từng đơn vị thay đổi và ánh sáng lướt bằng transform. Không ẩn nội dung, không thay timer/thời gian sự kiện; reduced-motion tắt animation. Ngày không hợp lệ về 0 thay vì NaN.
- Bổ sung nhãn bộ đếm và hỗ trợ đặt vé tiếng Anh. Số hỗ trợ chi tiết sự kiện đổi thành `0325 289 840`, được người dùng xác nhận trước commit.
- Build, 19/19 frontend tests, lint và diff check đạt (16 warning cũ). Không đổi backend, auth, thanh toán hoặc DB. Commit `daca65d` đã push main, Vercel success. Chrome production: đủ 4 ô, animation countdown-tick; giây cập nhật, nhãn VI/EN đúng; mobile390 scrollWidth390, ô75.25×72px. Viewport và ngôn ngữ đã trả về mặc định/VI. Evidence tạm `/tmp/fyce-countdown-desktop.png`.

---

## Tên tab và favicon FYCE — 07/10/2026

- Tên tab thống nhất `Fantasy Youth Chamber Ensemble` cho toàn bộ frontend.
- Header/footer dùng chung ảnh SVG ƒ xanh với favicon thay ký tự font ƒ; header đăng nhập/đăng ký cũng đồng bộ. Giữ kích thước logo, tên thương hiệu và liên kết về đầu trang chủ; không đổi API/dữ liệu.
- Favicon SVG được vẽ theo mẫu ƒ xanh đặc trên nền trắng người dùng gửi, thay bản nét viền trước đó; thu gọn khoảng trắng để rõ trên tab. URL `/fyce-icon.svg?v=3` giúp làm mới cache. Đây là bản vector theo mẫu, không phải tệp ảnh gốc. Không thay hostname `localhost` của môi trường phát triển.
- Khung vuông bo góc và viền xanh nhạt nằm trực tiếp trong SVG, đồng bộ favicon/header/footer/auth; bỏ viền CSS kép và khung tròn auth. Kích thước logo và hành vi điều hướng giữ nguyên.
- Kiểm tra HTML/SVG và production build; không đổi backend hoặc dữ liệu nghiệp vụ.

## Nhạc cụ nền, chuyển động và logo — 07/10/2026

**█████████░ 90% — thay đổi giao diện đạt QA; nghiệm thu provider cũ còn mở.**

- Sửa lớp `auth-layout` che nền; login/register dùng nền trong suốt, form/card giữ nền đặc. Một nền chung có 19 nốt/khóa nhạc + 4 minh họa SVG piano/violin/flute, nổi rõ hơn ở auth và chuyển động bằng transform. Không tải thêm ảnh/font hoặc binary Atlas.
- Vẽ lại khóa sol bằng nét liền, giữ toàn bộ stroke trong viewBox; nối vòng/đuôi và đầu nốt, không phụ thuộc font ký hiệu nhạc.
- Tăng độ dịch nền, chuyển động khuông nhạc và card 28px/scale.975 trong620ms; hero chỉ chuyển động text. Reveal gallery/heading/auth-card bằng IntersectionObserver, không opacity gate hoặc transform toàn section/page; không scroll listener đọc layout. Reduced-motion tắt animation/hover; admin không nhận reveal.
- Logo chung và logo auth là React Router Link `/#top`. Logo ở Home cuộn tức thì; scrollPolicy xử lý `#top` là tọa độ0, Home không dùng scrollIntoView cho top vì sẽ lệch72px bởi header. Anchor về About/concerts và chính sách giữ vị trí trang thao tác giữ nguyên.
- Chrome desktop: nền login hiển thị nhạc cụ, một background; register/mobile390 không overflow và nền wrapper trong suốt. Logo từ auth về Home sau dữ liệu tải scrollY0; ở Home cuộn2608 rồi bấm logo cũng scrollY0. Nội dung luôn hiện, card reveal chạy. Evidence tạm `/tmp/fyce-instrument-evidence/`.
- Frontend19/19, build/lint/diff check kiểm tra trước release; audit frontend/backend0, backend syntax99/99. Backend integration73 là kết quả lịch sử, không chạy lại vì không đổi backend. Không đăng nhập/tạo tài khoản/giao dịch thật, không sửa DB hoặc hệ điều hành ngoài dự án.

Commit code **`fc2c829`** đã push main; GitHub Vercel success, production bundle **`index-BXJViotw.js`** khớp build. Chrome production: login wrapper transparent và đủ4 nhạc cụ; logo từ auth về0, Home sau cuộn1786 rồi bấm logo cũng về0. Register mobile390 không overflow. Frontend19/19, lint0 lỗi/16 warning cũ, build/diff đạt, audits0 hai phía, syntax99backendđạt. Các giới hạn kiểm thử provider/FPS nhiều thiết bị trước đó giữ nguyên. Viewport đã reset; QA5180 được dừng sau nghiệm thu, server khác giữ nguyên.

---

## Trailer trong cover và xem ảnh — 07/10/2026

**█████████░ 90% — tính năng media đạt QA; nghiệm thu provider trước đó còn mở.**

- Chi tiết concert chỉ dùng `trailerVideoUrl` ở hero: MP4/CDN tự chạy muted/loop/playsInline; YouTube dùng embed autoplay/mute. Không có trailer hoặc native video lỗi thì hiện cover; không lấy `heroVideoUrl` thay trailer. Bỏ khung video riêng.
- ImagePreview ở MainLayout public: ảnh trang chủ, chương trình, nghệ sĩ, hoạt động, avatar profile và sơ đồ khán phòng mở ảnh đầy đủ trong native dialog với backdrop mờ. Enter/Space, Escape/nút đóng/bấm ngoài, focus trap và trả focus/overflow; điều hướng đóng dialog. Không áp dụng admin, QR hoặc trailer. Bấm ảnh trong card mở ảnh; tiêu đề/CTA vẫn dẫn tới sự kiện.
- Hai gallery concert đổi từ khung cố định/hàng cuộn ngang sang masonry hai cột theo tỷ lệ ảnh gốc; mobile nhỏ một cột. Giữ mọi ảnh và thứ tự metadata, không cắt ảnh chứa nội dung chương trình.
- QA Chrome: Day2 video nằm trong hero, muted, paused=false, readyState4; ảnh lớn VI/EN mở/đóng bằng bàn phím và bấm ngoài, focus/overflow phục hồi; Home card ảnh không điều hướng. Fixture API chỉ GET ở 3003 + Vite 5181 xác minh không trailer dù có heroVideoUrl vẫn chỉ cover, native trailer 404 về cover, bảy ảnh hoạt động hiển thị đủ, desktop hai cột/mobile390 một cột không overflow. Không ghi DB thật/fixture, không chạm auth/thanh toán/backend.
- Mobile390 sau reload: video muted/defaultMuted, paused=false, readyState4, time tăng; set muted attribute trước mount và thử play khi canplay để tránh lần tải sẵn nhưng không tự chạy. Frontend 19/19 tests, build đạt (`index-C-rc14Wi.js`), lint 0 lỗi/16 warning cũ, diff check đạt. Screenshot tạm `/tmp/fyce-trailer-evidence/`. Commit/deploy ghi sau khi xác minh.
- Kiểm tra Vercel sau commit `ecba0fd` tìm lỗi Range proxy: request `bytes=0-` bị trả cached `bytes 0-1/848508`, chỉ 2 byte (`x-vercel-cache: HIT`). `routePublicVideo` chỉ chuyển GridFS video public cùng origin sang Render ở production; giữ nguyên CDN signed/blob/local và API auth first-party. Origin video cấu hình qua `VITE_PUBLIC_VIDEO_ORIGIN` (mặc định Render hiện tại). Production build QA5182 phát trực tiếp Render, muted/paused=false/readyState4. Không sửa backend hoặc DB để xử lý lỗi cache.

---

Release code **`649bff8`** (sau `ecba0fd`) đã push main, GitHub Vercel status success; production bundle **`index-C-rc14Wi.js`** khớp build. Chrome trên Vercel: trailer Day2 trực tiếp Render, trong hero, muted/paused=false/readyState4/time tăng; không player riêng. Dialog ảnh chương trình mở được, Escape đóng. Mobile390 reload vẫn tự phát, gallery một cột, không tràn ngang. Render trả đúng Range0-1 (2 bytes), sau đó Range0- (848.508 bytes), không cache nhầm. Đã dừng QA API3003/Vite5180/5181/preview5182 và reset viewport; server khác giữ nguyên. Backend/DB/auth/payment không đổi trong đợt này.

## Sửa độ trễ cuộn, nền nhạc và video — 07/10/2026

**█████████░ 90% — bản sửa code đạt; các cổng nghiệm thu provider còn giữ nguyên.**

- Bỏ opacity gate/transform cả section, stagger và animation cả page; card chỉ dịch 8px trong 280ms, không chờ hiện nội dung. MutationObserver bỏ qua cập nhật text/countdown, chỉ xét subtree mới và gom theo requestAnimationFrame; không đọc layout toàn trang mỗi tick.
- Một nền chung ở cấp router, xuyên suốt public/auth/admin, dưới nội dung; nốt tròn/trắng/đen/móc đơn/móc kép và khóa sol/fa bằng SVG, khuông nhạc chuyển động nhẹ. Giữ nền card/form đặc để đọc rõ; pointer-events none, aria-hidden và reduced-motion.
- EventVideo có khung phát riêng với controls/playsInline/preload metadata. Nhận GridFS tương đối/URL đầy đủ, CDN signed/không đuôi và YouTube watch/shorts/embed; không đoán video dựa vào extension. Video nền chỉ dùng heroVideoUrl; trailer phát chủ động trong khung riêng.
- Production: Day1 MP4 HTTP 200, 848.508 bytes. Day2 trỏ file thiếu 404. Chỉ đọc đúng file Day2 trong backup và xác nhận binary giống hoàn toàn video Day1 còn phục vụ (SHA-256 `b814cbe8ded13728f58bf3a750c25e19900dc4a23ec93e85bdc00a6203f7bff9`). Sửa nguyên tử **chỉ trailerVideoUrl Day2** sang file chung `/api/videos/6ac526b03263d1b67ffb0cf2`, kiểm tra updatedAt trước khi ghi, tăng version. Không thêm/xóa binary Atlas, không sửa đơn/vé/ghế; URL cũ vẫn 404. Không dùng backup làm fixture hoặc commit binary.
- Frontend 18/18 test, build đạt, lint 0 lỗi/16 warning cũ; không thay backend/dependency. UI và deployment cập nhật theo xác minh bên dưới.

Chrome kết nối lại thành công sau retry: desktop cuộn Home không có hidden section; một background với 19 SVG ký hiệu trên Home/EventDetail/Login. Day2 foreground video readyState 4, duration 10s, controls bật; bấm Play chạy, error null. API public Day2 trả source mới, HEAD video 200. Không đo benchmark FPS trên tất cả thiết bị; kiểm tra code đã loại bỏ nguồn quét layout/độ trễ cũ. Evidence tạm: `/tmp/fyce-smooth-evidence/background-scroll.png`, `day2-video.png`.

Mobile 390px: không tràn ngang, video 316px nằm trong khung, controls/readyState4/error null; không có hidden section. Viewport override đã trả về mặc định. Admin chỉ có nền trang trí, chưa đăng nhập admin thật để kiểm tra trực quan trong đợt này.

Commit **`2c5e25b`** đã push `FYCE-Team/FYCE_Web/main`; Vercel success, production `index-CmZdzCap.js` khớp build. Đã dừng Vite QA 5180 của phiên; các server khác giữ nguyên.

---

## Đợt bổ sung chuyển động/cuộn/video 06/10/2026 — lịch sử

**█████████░ 90% — code và kiểm thử tự động đạt; nghiệm thu UI mới/dịch vụ thật còn mở.**

Commit **`9301d31`** đã push main. Vercel success, bundle production `index-DtgTrNQk.js` khớp build local. Probe phiên bản Render bị timeout; chưa xác nhận backend cùng commit. Lint 0 lỗi/16 warning cũ, audit hai phía 0, backend syntax 99 tệp đạt. Đã dừng API/Vite/MongoDB QA của đợt này; không dừng server ứng dụng khác.

- [x] Nền public thêm hai khuông nhạc, nhiều nốt chuyển động, nền trang ngoài hero; chuyển động lớn hơn và reveal sections/cards khi cuộn. Reduced-motion vẫn hiện nội dung; không áp dụng scroll reveal cho admin.
- [x] Reload Home/event detail/auth/profile về đầu. Trang chọn ghế, checkout, chi tiết đơn, vé của tôi và admin khôi phục vị trí theo URL trong tab; Back và các link neo vẫn có chính sách riêng. Lưu tọa độ, không lưu token/dữ liệu ghế.
- [x] Rà soát literal user: catalog đã phủ chuỗi giao diện. Thêm bản tiếng Anh biên tập cho tên/phụ đề/mô tả sự kiện/địa điểm, hiển thị ở Home/EventDetail/tiêu đề chọn ghế. Cần admin điền bản dịch nội dung tùy ý; không tự dịch tên tác phẩm/nghệ sĩ.
- [x] Ô URL video nền luôn hiện, hướng dẫn dùng link media ngoài. GridFS mặc định 25MB (backend env 1–100MB), bỏ mức 5GB. Upload lỗi abort để xóa chunks dang dở; không tự xóa dữ liệu Atlas.
- [x] 73/73 backend và 15/15 frontend, build đạt. Hai test backend mới kiểm tra English public/validation và lỗi upload sau một chunk không để lại orphan.
- [ ] Công cụ Chrome báo lỗi kết nối policy sau thử lại, chưa nghiệm thu trực quan/reload thật của UI mới trong đợt này. Không dùng kết quả UI đợt trước để đánh dấu đạt bản mới.
- [ ] Cần tài khoản/link media ngoài hoặc dung lượng Atlas đủ để ghi metadata; xem `MEDIA_STORAGE.md`. Chưa đo/xóa GridFS production, chưa nghiệm thu upload thật khi quota đầy.

Phạm vi là mã nguồn/dependencies/luồng FYCE, không sửa toàn bộ hệ điều hành. Không gọi giao dịch/email thật. Commit và deploy xem Git history/provider; còn phải kiểm tra backend đúng commit trên Render.

---

## Đợt cập nhật 06/10/2026 — lịch sử

**█████████░ 90% — code và QA hoàn tất; nghiệm thu thiết bị/dịch vụ thật còn mở.** Phạm vi rà soát là repository FYCEweb, không phải sửa toàn bộ hệ điều hành. Commit của đợt này xem Git history; trạng thái phát hành ghi trong `progress.json`.

Commit chức năng **`24d8e1b`** đã push main. Vercel success, bundle production `index-Xdbt9br_.js` khớp local; health Vercel/Render 200. Lần kiểm tra ngay sau push, Render vẫn trả refresh 401 kèm cookie xóa và chưa có `code` mới: **backend rollout chưa được xác nhận**, cần deploy cùng commit rồi nghiệm thu phiên thật. Health 200 không chứng minh đã chạy code mới.

- [x] Hiệu ứng khuông nhạc/nốt nhạc/ánh đèn concert bằng SVG/CSS; có chế độ giảm chuyển động. Font Manrope và Playfair Display hỗ trợ tiếng Việt, đóng gói cùng website, không tải Google Fonts bên ngoài.
- [x] Bổ sung tiếng Anh cho nội dung trang chủ hiện tại, thông báo user và tên địa điểm; chuẩn hóa Unicode/khoảng trắng khi dịch. Hero/About có bản tiếng Anh tùy chọn trong CMS, không sửa dữ liệu gốc hoặc dịch tên người dùng. Nội dung biên tập mới chưa có bản dịch vẫn giữ nguyên; admin luôn tiếng Việt.
- [x] Menu mobile đóng khi bấm ngoài menu/nút mở, hoặc Escape; menu tài khoản cũng đóng khi bấm ngoài.
- [x] Refresh 401 không xóa cookie của lần đăng nhập mới hơn. Back từ trang ngoài giữ token trong bộ nhớ nếu `/auth/me` xác nhận còn hợp lệ; không lưu token vào localStorage, không kéo dài hạn hoặc bỏ qua tài khoản bị khóa. Phản hồi cũ không ghi đè phiên mới.
- [x] Backend 71/71, frontend 13/13; build đạt; lint 0 lỗi/16 cảnh báo hiện hữu; audit hai package gồm dev dependencies: 0 lỗ hổng. Vá source-map-js/proxy-addr; thay nodemon bằng Node watch để loại bỏ dependency có advisory.
- [x] Chrome QA dùng API/MongoDB riêng: VI/EN, desktop 1440px/mobile 390px, Escape/bấm ngoài menu; đơn paid giả 274 ghế giữ phiên khi rời trang và Back, kể cả payment=cancel/error. Homepage dùng bản đọc công khai, không phục hồi dữ liệu khách hàng thật.
- [ ] Người dùng đã xác nhận bạn dùng cùng URL Vercel; chưa có trình duyệt/thiết bị để tái hiện đúng trường hợp đó. Chưa nghiệm thu checkout SePay mới, Google OAuth thật, inbox email và camera vật lý trong đợt này.

Không thay trạng thái đơn thật, không chuyển tiền, không gửi email thật để thử. Các transaction thanh toán/vé/ghế/check-in giữ nguyên. QA không chứng minh mọi trình duyệt đều không mất phiên; tiếp tục kiểm tra thiết bị thực tế khi có thông tin.

---

## Đợt cập nhật 02/10/2026 — lịch sử

**█████████░ 90% — chức năng và kiểm thử QA hoàn tất; nghiệm thu dịch vụ thật còn mở.** Phạm vi là repository FYCEweb, không phải toàn bộ hệ điều hành. Commit chức năng **`f0e0104`** đã push `FYCE-Team/FYCE_Web/main`. Vercel báo success và domain chính có bundle `index-DHXL29tf.js` khớp build local. Render và Vercel proxy health đều 200; export XLSX qua production trả file hợp lệ (bộ lọc rỗng, chỉ header). Chưa xác minh SHA/log trong Render Dashboard: user đã cho phép Authorize nhưng GitHub đó dẫn tới tạo account mới; chờ đăng nhập workspace đúng.

- [x] Giao diện user Việt/Anh qua nút header; lưu lựa chọn, không dịch tên/nội dung do người dùng nhập; admin luôn tiếng Việt. Mobile vẫn có nút ngôn ngữ.
- [x] Xuất XLSX/CSV vé/khách mời, đơn vé và thanh toán theo bộ lọc hoặc lựa chọn; chỉ admin, chống công thức CSV, không xuất QR/secret, tối đa 10.000 dòng và 10 lượt/phút/admin.
- [x] Một QR theo đơn nhiều ghế trên trang vé và email mới; vẫn giữ Ticket theo ghế và QR cũ. Một lần xác nhận check-in toàn bộ vé valid còn lại của đơn, không nhận vé đã hoàn/đã dùng; transaction chống check-in cạnh tranh hoàn vé. Không gộp hai đơn/hai sự kiện.
- [x] Camera giữ stream sau xác thực/check-in; tạm ngừng nhận mã khi chờ xác nhận, tự sẵn sàng sau thành công; chặn mã lặp trong khung; dừng khi bấm Dừng hoặc rời trang; giải phóng stream nếu cấp quyền đến sau khi rời trang.
- [x] Màu ghế quản trị thống nhất theo trạng thái và khớp chú giải; hạng vé vẫn ở thông tin chi tiết. Không đổi hạng/giá/trạng thái trong DB.
- [x] 69/69 integration backend; 8/8 frontend; build đạt, lint 0 lỗi/16 cảnh báo hiện hữu; audit hai package 0 lỗ hổng. MongoDB QA riêng 27028, không đọc .env/DB thật.
- [x] Chrome QA: đổi ngôn ngữ và giữ nội dung nhập; mobile 390px, đơn 274 ghế chỉ một QR; admin giữ tiếng Việt; tải XLSX chọn một đơn; nhập mã đơn kiểm tra 274 vé đã check-in.
- [x] Production chỉ đọc: VI/EN, adminVI, export XLSX rỗng; Day2 có 274 ghế trống cùng màu `#7db7f5`, không thay dữ liệu. Back về danh sách admin giữ phiên.
- [ ] Camera vật lý, Google OAuth, giao dịch SePay mới và email đến inbox trên deploy chưa nghiệm thu trong đợt này. Không đánh dấu hoàn thành dựa trên mock/test.

Không tự gửi lại email vé đã gửi trước đây. Người mua vẫn dùng QR cũ; mở chi tiết đơn để lấy QR nhóm mới. Khi khách đến riêng, nhân viên nhập mã TKT từng ghế; chỉ check-in nhóm khi cả nhóm có mặt.

Thay đổi riêng `package.json`/`package-lock.json` ở root không thuộc bản phát hành. Frontend/backend có package riêng và lockfile được kiểm tra.

---

## Đợt cập nhật 01/10/2026 — đọc mục này trước

Commit chức năng: `85a6587` trên nhánh `main`. Giữ nguyên thay đổi riêng ở `package.json`/`package-lock.json` thư mục gốc, không đưa vào commit này.

Tiến độ chức năng đợt này: **█████████░ 90% — code và kiểm thử local hoàn tất; nghiệm thu dịch vụ thật trên deploy còn mở.** Không dùng tỷ lệ này để kết luận giao dịch/email thật đã được nghiệm thu.

- [x] Sidebar admin dọc trái; nhóm nút sự kiện gọn/cùng kích thước.
- [x] Xóa một/chọn nhiều/toàn bộ kết quả bộ lọc vào thùng rác; khôi phục một/chọn nhiều/toàn bộ. Giữ tiền, lịch sử, QR và vé đã mua; chặn admin bị xóa.
- [x] Xóa vĩnh viễn trong thùng rác: xác nhận bằng cụm từ, kiểm tra lại trong transaction; bảo vệ lịch sử thanh toán, đơn/vé và liên kết. Chỉ xóa đơn chưa thanh toán đã hủy/hết hạn, tạo trên 48 giờ, không dấu vết xử lý tiền/ghế.
- [x] Dashboard mới với số liệu thực, thao tác nhanh; tên người dùng/mã đơn/mã vé mở modal lớn có backdrop mờ, hỗ trợ Escape/focus trap.
- [x] Khôi phục toàn bộ ghế bị khóa; transaction + SeatHistory, bảo vệ sold/held.
- [x] Gallery chọn nhiều tệp, title tùy chọn, kéo thả/keyboard, lưu thứ tự có kiểm tra phiên bản. Trang chủ hiển thị toàn bộ ảnh; đã kiểm thử hơn 100 ảnh.
- [x] Check-in thủ công nhận mã vé từ email và dùng cùng bảo vệ như QR.
- [x] Profile, avatar, đổi mật khẩu bằng OTP email, giới hạn thử mã và thu hồi phiên cũ.
- [x] Footer bỏ Thông tin/Đặt vé/bản tin, link neo như header, cân đối Khám phá/Liên hệ bên phải.
- [x] 65/65 kiểm thử tích hợp trên MongoDB QA độc lập; frontend build, backend syntax (94 tệp), diff check đạt; lint 0 lỗi/16 cảnh báo cũ.
- [x] Audit mới tìm và vá transitive dependencies brace-expansion, ip-address bằng bản tương thích. Không thay đổi API thanh toán.
- [ ] Nghiệm thu OTP inbox, Google/camera thật và checkout mới trên deploy. Không tự chuyển tiền hoặc sửa dữ liệu thật để kiểm thử.

Chrome QA: sidebar/profile đã xem trực quan; checkbox sự kiện bật đúng số lượng, dialog chốt đúng mục; kéo chuột đổi thứ tự gallery và lưu có thông báo thành công. Test database là fyce_admin_test tại 127.0.0.1:27028; không dùng .env hoặc dump production. Kiểm tra trực quan dashboard/modal bổ sung ngày 01/10 bị chặn bởi lỗi công cụ trình duyệt “Unable to load browser request-header policy” sau hai lần thử; API/build đã đạt nhưng không ghi nhận UI mới là đã nghiệm thu. Các kết quả cũ bên dưới là lịch sử, không thay cho tình trạng hiện tại.

# Tiến độ FYCE admin

Cập nhật 2026-09-30. Phạm vi rà soát: mã nguồn, dependencies và luồng dữ liệu của dự án FYCEweb; không phải chẩn đoán/sửa toàn bộ hệ điều hành của máy.

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
| Sửa lỗi bảo mật/concurrency và tự động kiểm tra | Hoàn thành trong phạm vi test | 47/47 test đạt; build/cú pháp đạt; audit hai phía 0 lỗ hổng; lint 0 error, 16 warning cũ                                                                   |
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
6. Transaction Booking/Seat/Ticket/TicketEmail và retry worker đã triển khai. Nghiệm thu IPN/REST/email trên môi trường thực tế; không tuyên bố hệ thống tuyệt đối không lỗi.

**Không đánh dấu 100% hoặc “không còn lỗi” trước khi hoàn tất hai cổng nghiệm thu còn lại.**

## Cập nhật theo lỗi người dùng báo

- Backend cổng 3000 đã khởi động và nối Atlas; health/homepage HTTP 200. CORS development cho phép localhost:5173; production dùng allowlist. Vite giữ cổng cố định.
- Client ID Google hai phía khớp. Còn cần Authorized JavaScript origins trên Google Cloud; hướng dẫn tại `LOCAL_SETUP.md`. Chưa xác nhận Google OAuth thật.
- Footer admin đã khôi phục component Footer ban đầu theo yêu cầu.
- Hoàn vé thủ công từng ghế/toàn đơn: chọn vé, ghi chú, xác nhận đã xử lý tiền bên ngoài, transaction, vô hiệu QR cũ, lưu lịch sử, bán lại QR mới. Dashboard tính tiền còn lại sau hoàn; trang người mua giữ lịch sử đơn đã hoàn.
- 47 test đạt gồm partial/full refund, QR cũ/mới, không hồi sinh vé bằng issuance retry, rollback nhiều collection, đồng thời refund/refund và refund/check-in, ghế legacy, từ chối vé đã check-in, CORS và audit hold hết hạn.
- Safari desktop: login QA thành công; form refund chuyển trạng thái và hiện lịch sử admin/thời gian/lý do. Các thử nghiệm sửa dữ liệu chỉ dùng DB QA; không hoàn tiền hoặc sửa đơn thật.
- Tiến độ vẫn 80% theo 10 cổng nghiệm thu: UI mới xác minh một phần; provider/mobile/camera còn mở. Không đánh dấu hoàn thành toàn bộ.

- Đã mở Safari `http://localhost:5173`: trang chủ hiển thị dữ liệu CMS và hai sự kiện từ backend thật. Đã tắt tiến trình QA 27028/3018/5174; giữ API ứng dụng 3000 và frontend 5173. Backend cần được chạy lại thủ công sau khi đóng terminal/reboot.

## Bản sửa production ngày 2026-09-30

- Hoàn tất proxy first-party Vercel, refresh chống race/mất mạng, GIS singleton và COOP popup.
- Thanh toán transaction; fallback REST tự chạy phía server; polling frontend không tự dừng sau 2 phút. Hiển thị lỗi kết nối thay vì chỉ chờ vô hạn. Không nhầm query error thành giao dịch thất bại khi đơn đã paid.
- Giao dịch được xác minh tự phát hành QR, tạo email queue và retry; hỗ trợ SMTP hoặc Resend HTTPS cho môi trường chặn SMTP. Admin audit hiển thị tình trạng gửi thư và yêu cầu đối chiếu.
- CMS bớt trường kỹ thuật, có mục nâng cao; giữ footer.
- 47/47 test, production build, cú pháp backend, diff check đạt. Lint 0 lỗi/16 cảnh báo cũ; npm audit cả dev+prod hai phía 0 lỗ hổng tại thời điểm kiểm tra.
- Chưa xác minh giao dịch thật người dùng vừa báo vì chưa có mã đơn; chưa cấu hình tài khoản Google/SePay/email từ dashboard nhà cung cấp. Xem DEPLOYMENT.md cho điều kiện vận hành và nghiệm thu. Giữ tiến độ 80%, không đánh dấu 100% chỉ nhờ mock tests.

### Xác minh sau push

Commit chức năng `f50887f` đã push vào `FYCE-Team/FYCE_Web` nhánh main. Lúc 08:24 ngày 2026-09-30 (Asia/Ho_Chi_Minh), Vercel phục vụ bundle `index-DgG46Wqj.js` khớp build đã kiểm tra; `/api/health` qua Vercel trả JSON 200, Cache-Control no-store/private và COOP same-origin-allow-popups. Render trực tiếp cũng trả health JSON 200 với header mới. Đây là xác minh triển khai/định tuyến, chưa phải nghiệm thu giao dịch hay email thật. Các tiến trình QA 27028/3018/5174 đã dừng; worktree sạch sau commit bàn giao.

## Hồi quy theo giao dịch thực tế (2026-09-30)

- SePay REST trả CAPTURED/VND/đủ tiền nhưng transactions=[] với chuyển khoản ngân hàng. Đã hỗ trợ xác nhận order-level **chỉ từ REST merchant đã xác thực**; webhook/browser không được tự bỏ qua kiểm tra. updated_at là giới hạn trên thời điểm capture khi xem xét khôi phục hold hết hạn, vẫn kiểm tra toàn bộ quyền sở hữu ghế.
- Webhook biến động số dư tới Render HTTP 200 nhưng body báo không tìm thấy mã FYCE: nội dung dùng PAY... của gateway. Đã tra PAY.../SEPAY-... qua merchant REST để lấy chính xác invoice trước đối chiếu. Không đoán invoice từ giao dịch ngân hàng. HMAC dùng raw bytes, có chống replay 5 phút và alias SEPAY_WEBHOOK_SECRET.
- About legacy thiếu createdBy: sửa nội dung giữ nguồn tác giả cũ là unknown, ghi updatedBy đúng admin; tạo mới vẫn bắt buộc author, trường nghiệp vụ vẫn validate. Feature order chuẩn hóa theo mảng; stale write vẫn 409.
- Hai ảnh GridFS bị thiếu đã khôi phục đúng ID và bytes gốc từ riêng images.files/images.chunks trong backup; kiểm tra sequence/chunk length/JPEG trước transaction, không overwrite, không phục hồi collection khác. Cả hai URL production trả JPEG 200. Backup không dùng làm fixture, không thay đổi và không commit.
- Người dùng xác nhận riêng cho phép đối chiếu/cấp vé đơn được cung cấp. Kết quả: confirmed/paid, 1 vé ghế K02; retry không nhân đôi. Chrome local reload giữ phiên, hiển thị QR. Email job sent lúc 08:41:28; chưa chứng minh inbox delivery.
- 47/47 tests, build/cú pháp/diff đạt; lint 0 lỗi/16 warning. Render dashboard chưa đăng nhập, chưa đọc được log để kết luận nguyên nhân riêng của 502 trước đó. Code phân biệt 401/403 cấu hình và 429 giới hạn thay vì gộp mọi lỗi thành thông báo chung.

## Checkout, Back/Forward và giao diện vé

- Thay hàm ký checkout của SDK bằng hàm chung createSePayCheckout theo thứ tự canonical tài liệu SePay: order_amount, merchant, currency, operation, order_description, order_invoice_number, payment_method, success_url, error_url, cancel_url. Cả tạo đơn và trả tiền lại dùng cùng hợp đồng. Không ghi secret/signature vào log.
- AuthContext xử lý pageshow.persisted: khôi phục phiên khi trở lại từ BFCache, hiển thị loading trong lúc refresh, giữ HttpOnly cookie và access token trong memory.
- Bỏ pseudo-element nét đứt trên ticket-pass, không che QR. Link hành động trong admin có border/padding/hover/focus tương đương button, giới hạn trong am-page; không đổi footer.
- 48/48 integration tests đạt; build và lint đạt (16 warning cũ). Cần tiếp tục nghiệm thu checkout tại provider với đơn mới; không tự tạo giao dịch tiền thật để test. Lỗi PUT About legacy đã có test đúng dữ liệu thiếu createdBy; nếu production còn lỗi cần xác minh Render đang chạy commit mới.

### Xác minh Chrome production sau commit 7738af6

- Vercel bundle index-BzyHJOZS.js khớp build. Đăng nhập admin được khôi phục qua cookie.
- Mở Giới thiệu và lưu lại nguyên nội dung hiện có: thành công, UI báo “Đã lưu nội dung trang chủ.” Không thay đổi văn bản/ảnh/publish của người dùng.
- Rời admin sang sepay.vn rồi Back: phiên admin được khôi phục, không bị đưa về login. Header đang bootstrap được đổi sang “Đang khôi phục phiên…” để tránh báo Đăng nhập tạm thời gây hiểu nhầm.
- Đơn đã đối chiếu hiển thị paid; vé hiện đã check-in bởi thao tác sau đó của người dùng, nên QR vô hiệu đúng nghiệp vụ. Không reset check-in.
- Checkout mới đã kiểm tra chữ ký canonical bằng test; chưa thực hiện thanh toán mới ở provider trong lần kiểm tra này, không tuyên bố đã nghiệm thu tiền thật hoàn toàn.
