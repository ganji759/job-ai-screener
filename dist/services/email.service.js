"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMailSafe = exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const transporter = nodemailer_1.default.createTransport({
    host: env_1.env.SMTP_HOST,
    port: env_1.env.SMTP_PORT,
    secure: env_1.env.SMTP_SECURE,
    tls: {
        rejectUnauthorized: env_1.env.SMTP_TLS_REJECT_UNAUTHORIZED,
    },
    auth: {
        user: env_1.env.SMTP_USER,
        pass: env_1.env.SMTP_PASS,
    },
});
const sendMail = async (to, subject, html) => {
    const mailPayload = {
        from: env_1.env.SMTP_FROM,
        to,
        subject,
        html,
    };
    try {
        await transporter.sendMail(mailPayload);
    }
    catch (error) {
        const message = String(error?.message ?? "");
        const tlsIssue = message.toLowerCase().includes("self-signed certificate");
        if (!tlsIssue || env_1.env.NODE_ENV === "production") {
            throw error;
        }
        const insecureTransporter = nodemailer_1.default.createTransport({
            host: env_1.env.SMTP_HOST,
            port: env_1.env.SMTP_PORT,
            secure: env_1.env.SMTP_SECURE,
            tls: {
                rejectUnauthorized: false,
            },
            auth: {
                user: env_1.env.SMTP_USER,
                pass: env_1.env.SMTP_PASS,
            },
        });
        await insecureTransporter.sendMail(mailPayload);
    }
};
exports.sendMail = sendMail;
const sendMailSafe = async (to, subject, html) => {
    try {
        await (0, exports.sendMail)(to, subject, html);
        return true;
    }
    catch {
        return false;
    }
};
exports.sendMailSafe = sendMailSafe;
