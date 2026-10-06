import mongoose from "mongoose";
export const eventTranslation = new mongoose.Schema(Object.fromEntries([
  ["title", 200], ["subtitle", 300], ["shortDescription", 500], ["description", 10000], ["venueDescription", 3000]
].map(([key, maxlength]) => [key, { type: String, trim: true, maxlength, default: "" }])), { _id: false });
