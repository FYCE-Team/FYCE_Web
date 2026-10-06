import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "../../i18n/useLanguage.js";
import { ImagePreviewContext } from "./ImagePreviewContext.js";
import "./ImagePreview.css";

export default function ImagePreview({ children }) {
    const [image, setImage] = useState(null);
    const dialog = useRef(null);
    const location = useLocation();
    const { t } = useLanguage();

    useEffect(() => {
        if (dialog.current?.open) dialog.current.close();
    }, [location.key]);
    useEffect(() => {
        if (!image) return;
        const modal = dialog.current;
        const overflow = document.body.style.overflow;
        const previousFocus = document.activeElement;
        modal.showModal();
        document.body.style.overflow = "hidden";
        return () => {
            modal.close();
            document.body.style.overflow = overflow;
            if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        };
    }, [image]);

    return <ImagePreviewContext.Provider value={setImage}>
        {children}
        {image && <dialog ref={dialog} className="image-preview" aria-label={t("Xem ảnh lớn")}
            onClose={() => setImage(null)} onCancel={() => setImage(null)} onClick={event => {
                if (event.target === event.currentTarget) setImage(null);
            }}>
            <button type="button" className="image-preview-close" autoFocus onClick={() => setImage(null)} aria-label={t("Đóng ảnh")}>×</button>
            <figure>
                <img src={image.src} alt={image.alt || ""} />
                {image.alt && <figcaption>{image.alt}</figcaption>}
            </figure>
        </dialog>}
    </ImagePreviewContext.Provider>;
}
