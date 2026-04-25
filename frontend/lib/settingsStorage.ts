export const EXTRA_PROFILE_KEY = "umurava_settings_profile_extra";
export const NOTIFICATION_PREFS_KEY = "umurava_settings_notifications";
export const AI_PREFS_KEY = "umurava_settings_ai";
export const APPEARANCE_PREFS_KEY = "umurava_settings_appearance";
export const SECURITY_PREFS_KEY = "umurava_settings_security";
export const USER_OVERRIDES_KEY = "umurava_user_overrides";

/**
 * Backend `/auth/me` only persists `{ id, name, email, role }`. Anything the user changes
 * in the settings UI beyond that (display name override, avatar) lives in the browser.
 */
export type UserOverrides = {
  name?: string;
  avatarUrl?: string | null;
};

export function loadUserOverrides(): UserOverrides {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(USER_OVERRIDES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UserOverrides;
  } catch {
    return {};
  }
}

export function saveUserOverrides(next: UserOverrides): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_OVERRIDES_KEY, JSON.stringify(next));
}

export function clearUserOverrides(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_OVERRIDES_KEY);
}

export type ExtraProfile = {
  firstName: string;
  lastName: string;
  phone: string;
  phoneCountryCode: string;
  jobTitle: string;
  company: string;
  location: string;
  emailVerified: boolean;
};

export const defaultExtraProfile = (): ExtraProfile => ({
  firstName: "",
  lastName: "",
  phone: "",
  phoneCountryCode: "+1",
  jobTitle: "",
  company: "",
  location: "",
  emailVerified: true,
});

export function loadExtraProfile(): ExtraProfile {
  if (typeof window === "undefined") return defaultExtraProfile();
  try {
    const raw = localStorage.getItem(EXTRA_PROFILE_KEY);
    if (!raw) return defaultExtraProfile();
    const parsed = JSON.parse(raw) as Partial<ExtraProfile>;
    return { ...defaultExtraProfile(), ...parsed };
  } catch {
    return defaultExtraProfile();
  }
}

export function saveExtraProfile(data: ExtraProfile): void {
  localStorage.setItem(EXTRA_PROFILE_KEY, JSON.stringify(data));
}

export type NotificationPrefs = {
  screeningCompleted: boolean;
  screeningFailed: boolean;
  shortlistReady: boolean;
  jobPublished: boolean;
  jobStatusChanged: boolean;
  jobClosed: boolean;
  applicantsUploaded: boolean;
  applicantStatusChanged: boolean;
  loginActivity: boolean;
  accountChanges: boolean;
};

export const defaultNotificationPrefs = (): NotificationPrefs => ({
  screeningCompleted: true,
  screeningFailed: true,
  shortlistReady: true,
  jobPublished: true,
  jobStatusChanged: true,
  jobClosed: true,
  applicantsUploaded: true,
  applicantStatusChanged: true,
  loginActivity: true,
  accountChanges: true,
});

export function loadNotificationPrefs(): NotificationPrefs {
  if (typeof window === "undefined") return defaultNotificationPrefs();
  try {
    const raw = localStorage.getItem(NOTIFICATION_PREFS_KEY);
    if (!raw) return defaultNotificationPrefs();
    return { ...defaultNotificationPrefs(), ...JSON.parse(raw) };
  } catch {
    return defaultNotificationPrefs();
  }
}

export function saveNotificationPrefs(p: NotificationPrefs): void {
  localStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(p));
}

export type AiPrefs = {
  shortlistSize: 10 | 20;
  weightSkills: number;
  weightExperience: number;
  weightEducation: number;
  explanationLevel: "brief" | "detailed" | "executive";
  autoRunScreening: boolean;
};

export const defaultAiPrefs = (): AiPrefs => ({
  shortlistSize: 20,
  weightSkills: 50,
  weightExperience: 30,
  weightEducation: 20,
  explanationLevel: "detailed",
  autoRunScreening: false,
});

export function loadAiPrefs(): AiPrefs {
  if (typeof window === "undefined") return defaultAiPrefs();
  try {
    const raw = localStorage.getItem(AI_PREFS_KEY);
    if (!raw) return defaultAiPrefs();
    return { ...defaultAiPrefs(), ...JSON.parse(raw) };
  } catch {
    return defaultAiPrefs();
  }
}

export function saveAiPrefs(p: AiPrefs): void {
  localStorage.setItem(AI_PREFS_KEY, JSON.stringify(p));
}

export type AppearancePrefs = {
  compactSidebar: boolean;
  dateFormat: "mdy" | "dmy" | "ymd";
  timeFormat: "12" | "24";
};

export const defaultAppearancePrefs = (): AppearancePrefs => ({
  compactSidebar: false,
  dateFormat: "mdy",
  timeFormat: "12",
});

export function loadAppearancePrefs(): AppearancePrefs {
  if (typeof window === "undefined") return defaultAppearancePrefs();
  try {
    const raw = localStorage.getItem(APPEARANCE_PREFS_KEY);
    if (!raw) return defaultAppearancePrefs();
    return { ...defaultAppearancePrefs(), ...JSON.parse(raw) };
  } catch {
    return defaultAppearancePrefs();
  }
}

export function saveAppearancePrefs(p: AppearancePrefs): void {
  localStorage.setItem(APPEARANCE_PREFS_KEY, JSON.stringify(p));
}

export type SecurityPrefs = {
  otpRequired: boolean;
};

export const defaultSecurityPrefs = (): SecurityPrefs => ({
  otpRequired: true,
});

export function loadSecurityPrefs(): SecurityPrefs {
  if (typeof window === "undefined") return defaultSecurityPrefs();
  try {
    const raw = localStorage.getItem(SECURITY_PREFS_KEY);
    if (!raw) return defaultSecurityPrefs();
    return { ...defaultSecurityPrefs(), ...JSON.parse(raw) };
  } catch {
    return defaultSecurityPrefs();
  }
}

export function saveSecurityPrefs(p: SecurityPrefs): void {
  localStorage.setItem(SECURITY_PREFS_KEY, JSON.stringify(p));
}
