import english from "./en.js";
const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const templates = Object.entries(english)
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([key, value]) => ({
    pattern: new RegExp(
      "^" +
        key
          .split(/\{\d+\}/)
          .map(escape)
          .join("(.*?)") +
        "$",
      "u",
    ),
    value,
  }));
export function translate(value, language = "vi") {
  if (language !== "en" || typeof value !== "string") return value;
  const key = value.trim().replace(/\s+/g, " ");
  if (Object.hasOwn(english, key)) return english[key];
  for (const { pattern, value: translation } of templates) {
    const match = key.match(pattern);
    if (match)
      return translation.replace(
        /\{(\d+)\}/g,
        (_, i) => match[Number(i) + 1] || "",
      );
  }
  return value;
}
