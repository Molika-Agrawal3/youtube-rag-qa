import { Schema, model, models } from "mongoose";

// One timestamped transcript excerpt the AI used to answer a question.
const SourceSchema = new Schema(
  {
    text: { type: String, required: true },
    startSeconds: { type: Number, required: true },
  },
  { _id: false }
);

const MessageSchema = new Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    // Only assistant messages have sources.
    sources: {
      type: [SourceSchema],
      default: undefined,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const ChatSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // The 11-character YouTube ID (e.g. "dQw4w9WgXcQ"). We store the ID, not
    // the full URL, because the same video has many URL forms
    // (youtube.com/watch?v=..., youtu.be/..., with or without &t=30s).
    videoId: {
      type: String,
      required: true,
    },
    videoTitle: {
      type: String,
    },
    channelName: {
      type: String,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Each user has at most ONE chat per video, and we often look chats up by
// (userId, videoId), so this index makes that lookup fast and enforces it.
ChatSchema.index({ userId: 1, videoId: 1 }, { unique: true });

const Chat = models.Chat || model("Chat", ChatSchema);

export default Chat;
