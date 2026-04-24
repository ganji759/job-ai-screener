const brandBlue = "#2563eb";

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const nl2br = (s: string): string => escapeHtml(s).replace(/\r\n/g, "\n").split("\n").join("<br/>");

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

export const renderScreeningRejectionEmail = (params: { firstName: string; jobTitle: string }): string =>
  renderBaseEmailTemplate({
    title: "Application update",
    greeting: `Hello ${escapeHtml(params.firstName)},`,
    message: `Thank you for your interest in the <b>${escapeHtml(params.jobTitle)}</b> role and for the time you invested in our process.<br/><br/>After careful review, we will not be moving forward with your application at this time. This decision reflects the strength of the overall applicant pool and specific role needs, not a judgment of your abilities.<br/><br/>We appreciate your understanding and wish you success in your search.`,
    accent: "#64748b",
  });

export const renderScreeningAcceptanceEmail = (params: {
  firstName: string;
  jobTitle: string;
  recruiterMessage: string;
}): string =>
  renderBaseEmailTemplate({
    title: "Great news",
    greeting: `Congratulations ${escapeHtml(params.firstName)},`,
    message: `Following our screening for <b>${escapeHtml(params.jobTitle)}</b>, we are pleased to share the message below from the hiring team:<br/><br/><span style="display:block;padding:14px 16px;background:#f1f5f9;border-radius:12px;border-left:4px solid ${brandBlue};line-height:1.6;">${nl2br(params.recruiterMessage)}</span><br/>We will follow up with any next steps separately.`,
    accent: brandBlue,
  });
