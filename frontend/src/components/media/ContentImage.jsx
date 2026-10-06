import { useLanguage } from "../../i18n/useLanguage.js";
import { useImagePreview } from "./ImagePreviewContext.js";
import { useState } from "react";

export default function ContentImage({ src, alt = "", showWarning = false, preview = true, ...props }) {
    const { t } = useLanguage();
    const openImage = useImagePreview();
    const canPreview = preview && !!openImage;
    const showImage = event => {
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.focus({ preventScroll: true });
        openImage({ src, alt: t(alt) });
    };

    const [failedSource, setFailedSource] = useState(null);
    const failed = failedSource === src;
    if (failed || !src) return <div className={props.className} role="img" aria-label={t("Hình ảnh chưa có sẵn")} style={{ display: "grid", placeItems: "center", minHeight: 120, background: "#eef3f6", color: "#486275" }}>
        {t(showWarning ? "Không tìm thấy tệp ảnh. Vui lòng tải lại ảnh trong mục chỉnh sửa." : "FYCE")}
    </div>;
    return <img {...props} data-image-preview={canPreview ? "" : undefined} role={canPreview ? "button" : props.role} tabIndex={canPreview ? 0 : props.tabIndex}
        aria-label={canPreview ? `${t("Xem ảnh lớn")}: ${t(alt)}` : props["aria-label"]}
        onClick={canPreview ? showImage : props.onClick}
        onKeyDown={canPreview ? event => { if (event.key === "Enter" || event.key === " ") showImage(event); } : props.onKeyDown}
        src={src} alt={t(alt)} onError={() => setFailedSource(src)} />;
}
