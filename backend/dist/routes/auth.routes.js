"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRoutes = void 0;
const auth_controller_1 = require("../controllers/auth.controller");
const authRoutes = async (app) => {
    app.post("/register", { config: { rateLimit: { max: 20, timeWindow: "15 minutes" } } }, auth_controller_1.register);
    app.post("/login", { config: { rateLimit: { max: 10, timeWindow: "15 minutes" } } }, auth_controller_1.login);
    app.post("/otp/send", auth_controller_1.sendOtp);
    app.post("/otp/verify", auth_controller_1.verifyAuthOtp);
    app.post("/refresh", auth_controller_1.refresh);
    app.get("/me", { preHandler: app.authenticate }, auth_controller_1.me);
};
exports.authRoutes = authRoutes;
