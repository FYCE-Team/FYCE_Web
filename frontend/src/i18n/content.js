import { translate } from "./translate.js";
export function localizeContent(record, language) {
  if (!record || language !== "en") return record;
  const localized = { ...record };
  for (const key of ["eyebrow", "title", "subtitle", "description", "primaryButtonText", "secondaryButtonText", "buttonText", "imageAlt"])
    if (typeof record.english?.[key] === "string" && record.english[key].trim()) localized[key] = record.english[key];
    else if (typeof record[key] === "string") localized[key] = translate(record[key], language);
  if (Array.isArray(record.features)) localized.features = record.features.map(feature => localizeContent(feature, language));
  return localized;
}
