import mongoose from "mongoose";

const heroSectionSchema = new mongoose.Schema(
  {
    eyebrow: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200
    },

    subtitle: {
      type: String,
      trim: true,
      default: "",
      maxlength: 300
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 1000
    },

    primaryButtonText: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },

    primaryButtonLink: {
      type: String,
      trim: true,
      default: ""
    },

    secondaryButtonText: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },

    secondaryButtonLink: {
      type: String,
      trim: true,
      default: ""
    },

    backgroundImage: {
      type: String,
      trim: true,
      default: ""
    },

    backgroundVideoUrl: {
      type: String,
      trim: true,
      default: ""
    },

    overlayOpacity: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.35
    },

    featuredEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true
    },

    sortOrder: {
      type: Number,
      min: 0,
      default: 0
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

heroSectionSchema.index({
  isActive: 1,
  sortOrder: 1
});

heroSectionSchema.pre("validate", function () {
  if (
    this.backgroundImage &&
    this.backgroundVideoUrl
  ) {
    throw new Error(
      "HERO_BACKGROUND_SOURCE_CONFLICT"
    );
  }
});

export default mongoose.model(
  "HeroSection",
  heroSectionSchema
);