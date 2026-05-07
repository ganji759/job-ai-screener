import bcrypt from "bcrypt";
import { Schema, model, type HydratedDocument, type Types } from "mongoose";

export interface IGoogleTokens {
  accessToken: string;  // AES-256-GCM encrypted
  refreshToken: string; // AES-256-GCM encrypted
  expiresAt: number;
}

export interface IUser {
  email: string;
  password: string;
  name: string;
  role: "recruiter" | "admin";
  organizationId?: Types.ObjectId | string;
  orgRole: "owner" | "admin" | "recruiter" | "viewer";
  googleTokens?: IGoogleTokens;
  comparePassword(plain: string): Promise<boolean>;
}

type UserDocument = HydratedDocument<IUser>;

const GoogleTokensSchema = new Schema<IGoogleTokens>(
  {
    accessToken:  { type: String, required: true },
    refreshToken: { type: String, required: true },
    expiresAt:    { type: Number, required: true },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    email:          { type: String, required: true, unique: true, trim: true, lowercase: true },
    password:       { type: String, required: true },
    name:           { type: String, required: true, trim: true },
    role:           { type: String, enum: ["recruiter", "admin"], default: "recruiter" },
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", index: true },
    orgRole:        { type: String, enum: ["owner", "admin", "recruiter", "viewer"], default: "owner" },
    googleTokens:   { type: GoogleTokensSchema, required: false },
  },
  { timestamps: true },
);

UserSchema.pre("save", async function userPreSave() {
  const doc = this as UserDocument;
  if (!doc.isModified("password")) {
    return;
  }
  doc.password = await bcrypt.hash(doc.password, 12);
});

UserSchema.methods.comparePassword = async function comparePassword(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, this.password);
};

export const UserModel = model<IUser>("User", UserSchema);
