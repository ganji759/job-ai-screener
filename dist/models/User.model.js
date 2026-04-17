"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ["recruiter", "admin"], default: "recruiter" },
}, { timestamps: true });
UserSchema.pre("save", async function userPreSave() {
    const doc = this;
    if (!doc.isModified("password")) {
        return;
    }
    doc.password = await bcrypt_1.default.hash(doc.password, 12);
});
UserSchema.methods.comparePassword = async function comparePassword(plain) {
    return bcrypt_1.default.compare(plain, this.password);
};
exports.UserModel = (0, mongoose_1.model)("User", UserSchema);
