import { useState } from "react";
import { useLanguage } from "../../i18n/useLanguage.js";
import { resolveVideoSource } from "../../utils/videoSource.js";
import { getMediaUrl } from "../../utils/media.js";
export default function EventVideo({ value, title, poster }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  const source = resolveVideoSource(value);
  return <section id="event-video" className="event-detail-video-section event-detail-container">
    <h2>{t("Video chương trình")}</h2>
    {source && !failed ? source.kind === "youtube" ? <iframe src={`${source.src}?rel=0`} title={`${t("Video chương trình")} · ${title}`} loading="lazy" allow="fullscreen; encrypted-media; picture-in-picture" allowFullScreen /> : <video src={getMediaUrl(source.src)} poster={poster ? getMediaUrl(poster) : undefined} controls playsInline preload="metadata" onError={() => setFailed(true)} /> : <p role="status">{t("Video chưa tải được. Link có thể đã hết hạn, không công khai hoặc định dạng chưa được trình duyệt hỗ trợ.")}</p>}
  </section>;
}
