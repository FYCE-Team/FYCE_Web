import mongoose from "mongoose";
// Optional editorial translations. No migration or machine-generated DB writes.
export const contentTranslation = new mongoose.Schema(Object.fromEntries([
  ["eyebrow", 100], ["title", 200], ["subtitle", 300], ["description", 1500],
  ["primaryButtonText", 100], ["secondaryButtonText", 100], ["buttonText", 100],
  ["imageAlt", 200]
].map(([key, maxlength]) => [key, { type: String, trim: true, maxlength, default: "" }])), { _id: false });
