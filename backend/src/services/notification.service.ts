import { NotificationModel } from "../models/Notification.model";
import { UserModel } from "../models/User.model";
import { sendMailSafe } from "./email.service";
import { renderBaseEmailTemplate } from "./emailTemplates.service";
import { pushRealtimeEvent } from "./realtime.service";

interface NotifyInput {
  userId: string;
  title: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  sendEmail?: boolean;
  metadata?: Record<string, unknown>;
}

export const notifyUser = async (input: NotifyInput): Promise<void> => {
  const notification = await NotificationModel.create({
    userId: input.userId,
    title: input.title,
    message: input.message,
    type: input.type ?? "info",
    channel: "in_app",
    metadata: input.metadata,
  });

  try {
    pushRealtimeEvent(input.userId, "notification:new", {
      id: String(notification._id),
      title: notification.title,
      message: notification.message,
      type: notification.type,
      createdAt: notification.createdAt,
    });
  } catch {
    /* avoid 500 if websocket payload fails to serialize */
  }

  if (input.sendEmail) {
    // Fire-and-forget to keep API responses fast.
    void (async () => {
      const user = await UserModel.findById(input.userId).select("email name").lean();
      if (user?.email) {
        await sendMailSafe(
          user.email,
          `[Umurava AI HR] ${input.title}`,
          renderBaseEmailTemplate({
            title: input.title,
            greeting: `Hello ${user.name ?? "Recruiter"},`,
            message: input.message,
          }),
        );
      }
    })();
  }
};
