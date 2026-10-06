const configured = Number(process.env.VIDEO_UPLOAD_MAX_MB);
export const videoUploadMaxMB = Number.isFinite(configured) && configured >= 1 && configured <= 100 ? configured : 25;
export const videoUploadMaxBytes = Math.floor(videoUploadMaxMB * 1024 * 1024);
