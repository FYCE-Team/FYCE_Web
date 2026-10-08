const boundedInteger = (value, fallback, max) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= max ? number : fallback;
};

// Per-process admission, not a queue: reject excess work before parsing bodies or querying MongoDB.
// Separate webhook capacity prevents public reloads from occupying every payment callback slot.
export const createRequestAdmission = ({
  general = boundedInteger(process.env.HTTP_MAX_INFLIGHT, 80, 1000),
  webhook = boundedInteger(process.env.HTTP_MAX_WEBHOOK_INFLIGHT, 16, 100),
  upload = boundedInteger(process.env.HTTP_MAX_UPLOAD_INFLIGHT, 2, 20)
} = {}) => {
  const active = { general: 0, webhook: 0, upload: 0 };
  const limits = { general, webhook, upload };
  return (req, res, next) => {
    if (["GET", "HEAD"].includes(req.method) && /^\/api\/health\/?$/i.test(req.path)) return next();
    const bucket = req.method === "POST" && /^\/api\/payments\/sepay-webhook\/?$/i.test(req.path)
      ? "webhook"
      : /^(POST|PUT|PATCH)$/.test(req.method) && req.is("multipart/form-data")
        ? "upload" : "general";
    if (active[bucket] >= limits[bucket]) {
      res.set("Retry-After", "2");
      res.set("Cache-Control", "no-store");
      return res.status(503).json({ success: false, code: "SERVER_BUSY", message: "Máy chủ đang bận. Vui lòng đợi một lát rồi thử lại." });
    }
    active[bucket]++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active[bucket]--;
      res.off("finish", release);
      res.off("close", release);
    };
    res.once("finish", release);
    res.once("close", release);
    next();
  };
};
