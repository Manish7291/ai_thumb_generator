import mongoose from "mongoose";

const ThumbnailSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    originalPrompt: { type: String, required: true },
    enhancedPrompt: { type: String, required: true },
    imageUrl: { type: String, required: true },
    size: { type: String, default: "1280x720" },
    layout: { type: String, default: "landscape" },
    style: { type: String, default: "default" },
  },
  { timestamps: true }
);

export default mongoose.models.Thumbnail || mongoose.model("Thumbnail", ThumbnailSchema);
