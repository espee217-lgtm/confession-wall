const mongoose = require("mongoose");

const weeklyRewardSchema = new mongoose.Schema(
  {
    weekKey: { type: String, required: true, trim: true },
    eventKey: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["most_watered_seeds", "most_burned_override"],
      required: true,
    },
    confessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Confession",
      default: null,
    },
    grantedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: null },
  },
  { _id: false }
);

const temporaryCosmeticOverrideSchema = new mongoose.Schema(
  {
    source: { type: String, default: "", trim: true },
    frameId: { type: String, default: "", trim: true },
    postThemeId: { type: String, default: "", trim: true },
    grantedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    eventKey: { type: String, default: "", trim: true },
    weekKey: { type: String, default: "", trim: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    profilePicture: {
      type: String,
      default: null,
    },

    bio: {
      type: String,
      default: "",
      maxlength: 200,
    },

    isAdmin: {
      type: Boolean,
      default: false,
    },

    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },

    linkedAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },

    isSuspended: {
      type: Boolean,
      default: false,
    },

    suspendReason: {
      type: String,
      default: "",
      maxlength: 300,
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    isBanned: {
      type: Boolean,
      default: false,
    },

    banReason: {
      type: String,
      default: "",
      maxlength: 300,
    },

    bannedAt: {
      type: Date,
      default: null,
    },

    seeds: {
      type: Number,
      default: 0,
      min: 0,
    },

    showSeedsOnProfile: {
  type: Boolean,
  default: true,
},

    seedDailyStats: {
      dateKey: { type: String, default: "" },
      loginRewards: { type: Number, default: 0 },
      postRewards: { type: Number, default: 0 },
      commentRewards: { type: Number, default: 0 },
      reactionRewards: { type: Number, default: 0 },
      acceptedReportRewards: { type: Number, default: 0 },
    },

    ownedCosmetics: {
      type: [
        {
          itemId: { type: String, required: true },
          purchasedAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    equippedCosmetics: {
      badge: { type: String, default: "" },
      frame: { type: String, default: "" },
      title: { type: String, default: "" },
      postTheme: { type: String, default: "" },
      reactionStyle: { type: String, default: "" },
      visualEffect: { type: String, default: "" },
    },

    savedConfessions: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Confession" }],
      default: [],
    },

    temporaryCosmeticOverride: {
      type: temporaryCosmeticOverrideSchema,
      default: () => ({}),
    },

    weeklyRewards: {
      type: [weeklyRewardSchema],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.index({ createdAt: -1 });
userSchema.index({ isBanned: 1, isSuspended: 1 });
userSchema.index({ role: 1, createdAt: -1 });
userSchema.index({ seeds: -1 });
userSchema.index({ "ownedCosmetics.itemId": 1 });
userSchema.index({ savedConfessions: 1 });
userSchema.index({ "weeklyRewards.weekKey": 1, "weeklyRewards.type": 1 });
userSchema.index({ "temporaryCosmeticOverride.expiresAt": 1 });

module.exports = mongoose.model("User", userSchema);
