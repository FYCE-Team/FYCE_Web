import { useState } from "react";

export default function ContentImage({ src, alt = "", showWarning = false, ...props }) {
    const [failedSource, setFailedSource] = useState(null);
    const failed = failedSource === src;
    if (failed || !src) return <div className={props.className} role="img" aria-label="Hình ảnh chưa có sẵn" style={{ display: "grid", placeItems: "center", minHeight: 120, background: "#eef3f6", color: "#486275" }}>
        {showWarning ? "Không tìm thấy tệp ảnh. Vui lòng tải lại ảnh trong mục chỉnh sửa." : "FYCE"}
    </div>;
    return <img {...props} src={src} alt={alt} onError={() => setFailedSource(src)} />;
}
