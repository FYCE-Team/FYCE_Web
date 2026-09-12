import mongoose from "mongoose";

const featureSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500
    },

    icon: {
      type: String,
      trim: true,
      default: ""
    },

    sortOrder: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  {
    _id: true
  }
);

const aboutSectionSchema = new mongoose.Schema(
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
      required: true,
      trim: true,
      maxlength: 1500
    },

    image: {
      type: String,
      trim: true,
      default: ""
    },

    imageAlt: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200
    },

    features: {
      type: [featureSchema],
      default: []
    },

    buttonText: {
      type: String,
      trim: true,
      default: "",
      maxlength: 100
    },

    buttonLink: {
      type: String,
      trim: true,
      default: ""
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

aboutSectionSchema.index({
  isActive: 1,
  sortOrder: 1
});

aboutSectionSchema.pre("validate", function () {
  const featureOrders = this.features.map(
    (feature) => feature.sortOrder
  );

  const uniqueFeatureOrders =
    new Set(featureOrders);

  if (
    uniqueFeatureOrders.size !==
    featureOrders.length
  ) {
    throw new Error(
      "ABOUT_FEATURE_ORDER_DUPLICATE"
    );
  }
});

export default mongoose.model(
  "AboutSection",
  aboutSectionSchema
);