const brandBlue = "#2563eb";

export const renderBaseEmailTemplate = (params: {
  title: string;
  greeting?: string;
  message: string;
  accent?: string;
  footer?: string;
}): string => {
  const accent = params.accent ?? brandBlue;
  const footer = params.footer ?? "Regards,<br/>Umurava AI HR";
  return `
  <div style="margin:0;padding:24px;background:#f8fbff;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dbeafe;border-radius:16px;overflow:hidden;">
      <div style="background:${accent};padding:18px 22px;color:#ffffff;">
        <h2 style="margin:0;font-size:20px;line-height:1.3;">${params.title}</h2>
      </div>
      <div style="padding:22px;">
        ${params.greeting ? `<p style="margin:0 0 12px;">${params.greeting}</p>` : ""}
        <p style="margin:0 0 14px;line-height:1.6;color:#334155;">${params.message}</p>
        <p style="margin:20px 0 0;line-height:1.5;color:#475569;">${footer}</p>
      </div>
    </div>
  </div>`;
};

export const renderOtpTemplate = (params: { code: string; minutes: number }): string =>
  renderBaseEmailTemplate({
    title: "Your OTP Code",
    greeting: "Hello Recruiter,",
    message: `Use this one-time code to continue: <b style="font-size:20px;color:${brandBlue};letter-spacing:2px;">${params.code}</b><br/>This code expires in ${params.minutes} minutes.`,
  });
