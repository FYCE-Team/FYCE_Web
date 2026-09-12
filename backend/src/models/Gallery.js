import mongoose from "mongoose";

const gallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: 150
    },

    image: {
      type: String,
      required: true,
      trim: true
    },

    altText: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200
    },

    caption: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300
    },

    category: {
      type: String,
      enum: [
        "rehearsal",
        "backstage",
        "workshop",
        "community",
        "concert",
        "general"
      ],
      default: "general",
      index: true
    },

    sortOrder: {
      type: Number,
      min: 0,
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

gallerySchema.index({
  isActive: 1,
  sortOrder: 1
});

gallerySchema.index({
  category: 1,
  isActive: 1,
  sortOrder: 1
});

export default mongoose.model(
  "Gallery",
  gallerySchema
);