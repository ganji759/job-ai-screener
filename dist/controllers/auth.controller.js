"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.me = exports.refresh = exports.sendOtp = exports.verifyAuthOtp = exports.login = exports.register = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const env_1 = require("../config/env");
const User_model_1 = require("../models/User.model");
const otp_service_1 = require("../services/otp.service");
const notification_service_1 = require("../services/notification.service");
const RegisterSchema = zod_1.z.object({ name: zod_1.z.string().min(2), email: zod_1.z.string().email(), password: zod_1.z.string().min(8) }).strip();
const LoginSchema = zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(1) }).strip();
const VerifyOtpSchema = zod_1.z.object({ email: zod_1.z.string().email(), code: zod_1.z.string().length(6), purpose: zod_1.z.enum(["verify_email", "login_2fa", "password_reset"]).default("verify_email") }).strip();
const SendOtpSchema = zod_1.z.object({ email: zod_1.z.string().email(), purpose: zod_1.z.enum(["verify_email", "login_2fa", "password_reset"]).default("verify_email") }).strip();
const signToken = (userId, email, role) => jsonwebtoken_1.default.sign({ userId, email, role }, env_1.env.JWT_SECRET, {
    expiresIn: env_1.env.JWT_EXPIRES_IN,
});
const register = async (request, reply) => {
    const body = RegisterSchema.parse(request.body);
    const exists = await User_model_1.UserModel.findOne({ email: body.email }).lean();
    if (exists)
        return void reply.code(409).send({ error: "Email already exists" });
    const user = await User_model_1.UserModel.create(body);
    let otpSent = true;
    try {
        await (0, otp_service_1.issueOtp)(String(user._id), user.email, "verify_email");
    }
    catch {
        otpSent = false;
    }
    await (0, notification_service_1.notifyUser)({
        userId: String(user._id),
        title: "Account created",
        message: "Welcome to Umurava AI HR. Verify your email with OTP.",
        type: "success",
        sendEmail: true,
    });
    const token = signToken(String(user._id), user.email, user.role);
    reply.send({
        token,
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        otpSent,
        warning: otpSent ? undefined : "Account created, but OTP email was not delivered. Check SMTP TLS settings.",
    });
};
exports.register = register;
const login = async (request, reply) => {
    const body = LoginSchema.parse(request.body);
    const user = await User_model_1.UserModel.findOne({ email: body.email });
    if (!user)
        return void reply.code(401).send({ error: "Invalid credentials" });
    const ok = await user.comparePassword(body.password);
    if (!ok)
        return void reply.code(401).send({ error: "Invalid credentials" });
    try {
        await (0, otp_service_1.issueOtp)(String(user._id), user.email, "login_2fa");
    }
    catch {
        return void reply.code(503).send({
            error: "OTP email could not be sent. Please verify SMTP configuration and try again.",
        });
    }
    reply.send({ requiresOtp: true, message: "OTP sent to your email" });
};
exports.login = login;
const verifyAuthOtp = async (request, reply) => {
    const body = VerifyOtpSchema.parse(request.body);
    const user = await User_model_1.UserModel.findOne({ email: body.email });
    if (!user)
        return void reply.code(404).send({ error: "User not found" });
    const valid = await (0, otp_service_1.verifyOtp)(String(user._id), body.code, body.purpose);
    if (!valid)
        return void reply.code(400).send({ error: "Invalid or expired OTP" });
    const token = signToken(String(user._id), user.email, user.role);
    await (0, notification_service_1.notifyUser)({
        userId: String(user._id),
        title: "Login successful",
        message: "You logged in securely with OTP.",
        type: "success",
        sendEmail: true,
    });
    reply.send({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
};
exports.verifyAuthOtp = verifyAuthOtp;
const sendOtp = async (request, reply) => {
    const body = SendOtpSchema.parse(request.body);
    const user = await User_model_1.UserModel.findOne({ email: body.email });
    if (!user)
        return void reply.code(404).send({ error: "User not found" });
    try {
        await (0, otp_service_1.issueOtp)(String(user._id), user.email, body.purpose);
    }
    catch {
        return void reply.code(503).send({
            error: "OTP email could not be sent. Please verify SMTP configuration and try again.",
        });
    }
    reply.send({ sent: true });
};
exports.sendOtp = sendOtp;
const refresh = async (request, reply) => {
    const cookieHeader = request.headers.cookie ?? "";
    const refreshToken = cookieHeader
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("refreshToken="))
        ?.split("=")[1];
    if (!refreshToken)
        return void reply.code(401).send({ error: "Missing refresh token" });
    const payload = jsonwebtoken_1.default.verify(refreshToken, env_1.env.JWT_SECRET);
    const token = signToken(payload.userId, payload.email, payload.role);
    reply.send({ token });
};
exports.refresh = refresh;
const me = async (request, reply) => {
    const userId = request.user?.userId;
    const user = await User_model_1.UserModel.findById(userId).select("name email role").lean();
    if (!user)
        return void reply.code(404).send({ error: "User not found" });
    reply.send(user);
};
exports.me = me;
