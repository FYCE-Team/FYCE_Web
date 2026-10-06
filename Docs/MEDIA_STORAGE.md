# Video và dung lượng Atlas

Cập nhật 06/10/2026. Video hiện tại được stream vào GridFS bucket `videos`, metadata trong `videos.files`, binary trong `videos.chunks`; ảnh có bucket riêng. Nếu thấy `fs.chunks`/`file.chunks`, cần đối chiếu tên bucket của dữ liệu cũ, không mặc định đó là dữ liệu rác.

GridFS chia file thành chunks để lưu, không tự làm nhỏ nội dung video. Thay kích thước chunk chỉ đổi số documents. Nguồn: [MongoDB GridFS](https://www.mongodb.com/docs/manual/core/gridfs/).

## Phương án dùng ngay: video bên ngoài, Atlas chỉ lưu URL

1. Nén clip nền ngắn khoảng 15–30 giây, bỏ âm thanh; dùng MP4 H.264 hoặc WebM. Giữ file gốc ở nơi sao lưu riêng.
2. Upload clip đã nén lên dịch vụ media/CDN của nhóm. Ví dụ Cloudinary hỗ trợ tối ưu chất lượng/định dạng video; cần tài khoản và cấu hình của chủ dự án. Không đưa API secret vào frontend. Xem [Cloudinary video optimization](https://cloudinary.com/documentation/video_optimization).
3. Trong admin trang chủ, dán **link trực tiếp MP4/WebM HTTPS** vào “Video nền”, gỡ nguồn ảnh nền nếu đang dùng, bấm Lưu. Đây là URL phát video, không phải URL trang xem YouTube/Drive. Website tải media trực tiếp từ host đó, backend không fetch link nên không tạo SSRF.
4. Xác minh link công khai, Content-Type video phù hợp, phát/seek trên mobile, CDN cho phép website sử dụng. Với video sự kiện cũng có thể dùng URL media trong các ô video sẵn có.

Tích hợp upload thẳng từ FYCE sang nhà cung cấp chưa được cấu hình vì chưa có tài khoản/khóa dịch vụ. Không tự tạo account, mua gói hay upload dữ liệu production. Dán link không cần FYCE lưu binary mới trong Atlas, nhưng **nếu Atlas đã chặn mọi thao tác ghi vì hết quota, vẫn phải giải phóng dung lượng an toàn hoặc nâng dung lượng trước khi lưu metadata**.

## Nén trước khi upload

Nếu máy đã có FFmpeg, chạy cho một file video do nhóm chọn (output là file mới, không ghi đè input):

```sh
ffmpeg -i input.mp4 -t 30 -an -vf "scale=1280:-2" -c:v libx264 -crf 28 -preset medium -movflags +faststart background-small.mp4
```

Đây là cấu hình khởi đầu, cần xem lại chất lượng và kích thước output. Video nền không cần độ phân giải 4K; giảm độ dài/độ phân giải thường giúp nhiều hơn đổi chunk size.

## Bảo vệ upload GridFS

Mặc định mới giới hạn **25MB**, biến backend `VIDEO_UPLOAD_MAX_MB` cho phép 1–100MB; giá trị sai dùng mặc định. Reverse proxy/hosting có thể có giới hạn request nhỏ hơn. Không còn cho upload 5GB vào Atlas từ ứng dụng. Upload thất bại gọi GridFS `abort()` để dọn chunks dang dở; nếu DB đã từ chối ghi/xóa, cleanup có thể thất bại và cần kiểm tra riêng. Kiểm thử QA đã mô phỏng lỗi sau khi ghi một chunk, xác nhận không còn orphan chunk.

## Với binary đã tồn tại

Không xóa collection chunks, không xóa từng chunk của một video còn dùng. Backup trước; đối chiếu ID trong `.files` với Hero/Event và cả dữ liệu trong thùng rác. Chỉ sau khi chuyển link, kiểm tra phát ổn và xác nhận file không còn tham chiếu mới cân nhắc xóa bằng GridFS API để xóa đồng bộ file/chunks. Đợt này **không xóa hoặc sửa binary trong Atlas**, chưa đo quota/data size thật. Thay link không tự giải phóng file cũ.
