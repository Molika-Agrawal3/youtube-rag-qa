import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Name is required"],
    },
    image: {
      type: String,
    },
  },
  // Adds createdAt and updatedAt fields automatically.
  { timestamps: true }
);

// In development, hot reload re-runs this file. Reusing the existing model
// avoids the "Cannot overwrite model once compiled" error.
const User = models.User || model("User", UserSchema);

export default User;
