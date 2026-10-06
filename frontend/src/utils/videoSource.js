export function resolveVideoSource(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const source = value.trim();
  if ([...source].some(char => char === "\\" || char.charCodeAt(0) < 32)) return null;
  if (/^\/(?!\/)/.test(source) || source.startsWith("blob:")) return { kind: "video", src: source };
  let url;
  try { url = new URL(source); } catch { return null; }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
  const host = url.hostname.replace(/^www\./, "");
  if (["youtube.com", "m.youtube.com", "youtube-nocookie.com", "youtu.be"].includes(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = host === "youtu.be" ? parts[0] : parts[0] === "watch" ? url.searchParams.get("v") : ["embed", "shorts", "live"].includes(parts[0]) ? parts[1] : null;
    return /^[\w-]{11}$/.test(id || "") ? { kind: "youtube", id, src: `https://www.youtube.com/embed/${id}` } : null;
  }
  // Direct CDN media can be signed or extensionless; the browser checks the format.
  return { kind: "video", src: source };
}
// Public GridFS streams bypass the deployment proxy, which may cache a 206
// fragment under the same key as the full video. Never rewrite external CDN URLs.
export function routePublicVideo(source, publicOrigin, appOrigin) {
  if (!publicOrigin || !source) return source;
  try {
    const target = new URL(source, appOrigin);
    if (target.origin !== appOrigin || !/^\/api\/videos\/[a-f\d]{24}$/i.test(target.pathname)) return source;
    const origin = new URL(publicOrigin);
    if (origin.protocol !== "https:" || origin.username || origin.password) return source;
    return `${origin.origin}${target.pathname}${target.search}${target.hash}`;
  } catch { return source; }
}
