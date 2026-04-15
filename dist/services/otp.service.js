"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyOtp = exports.issueOtp = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const node_crypto_1 = require("node:crypto");
const env_1 = require("../config/env");
const Otp_model_1 = require("../models/Otp.model");
const email_service_1 = require("./email.service");
const emailTemplates_service_1 = require("./emailTemplates.service");
const createCode = () => String((0, node_crypto_1.randomInt)(100000, 999999));
const issueOtp = async (userId, email, purpose) => {
    const code = createCode();
    const codeHash = await bcrypt_1.default.hash(code, 10);
    const expiresAt = new Date(Date.now() + env_1.env.OTP_EXPIRES_MINUTES * 60_000);
    await Otp_model_1.OtpModel.create({ userId, email, codeHash, purpose, expiresAt });
    await (0, email_service_1.sendMail)(email, "Umurava AI HR OTP Code", (0, emailTemplates_service_1.renderOtpTemplate)({ code, minutes: env_1.env.OTP_EXPIRES_MINUTES }));
};
exports.issueOtp = issueOtp;
const verifyOtp = async (userId, code, purpose) => {
    const otp = await Otp_model_1.OtpModel.findOne({ userId, purpose, usedAt: { $exists: false }, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (!otp)
        return false;
    const ok = await bcrypt_1.default.compare(code, otp.codeHash);
    if (!ok)
        return false;
    otp.usedAt = new Date();
    await otp.save();
    return true;
};
exports.verifyOtp = verifyOtp;
