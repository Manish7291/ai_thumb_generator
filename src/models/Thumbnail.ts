import mongoose, { Document, Model, Schema } from "mongoose";

export interface IThumbnail extends Document {
  userId: mongoose.Types.ObjectId;
  originalPrompt: string;
  enhancedPrompt: string;
  imageUrl: string;
  size: string;
  layout: string;
  style: string;
  createdAt: Date;
}

const ThumbnailSchema = new Schema<IThumbnail>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    originalPrompt: { type: String, required: true },
    enhancedPrompt: { type: String, required: true },
    imageUrl: { type: String, required: true },
    size: { type: String, default: "1280x720" },
    layout: { type: String, default: "landscape" },
    style: { type: String, default: "default" },
  },
  { timestamps: true }
);

const Thumbnail: Model<IThumbnail> =
  mongoose.models.Thumbnail || mongoose.model<IThumbnail>("Thumbnail", ThumbnailSchema);

export default Thumbnail;
