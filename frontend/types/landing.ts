export interface Feature {
  iconBg: string;
  emoji: string;
  title: string;
  description: string;
}

export interface Step {
  number: number;
  title: string;
  description: string;
}

export interface PricingFeature {
  included: boolean;
  text: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: PricingFeature[];
  cta: string;
  ctaStyle: "outline" | "filled" | "dark";
  featured?: boolean;
}

export interface Testimonial {
  stars: number;
  quote: string;
  name: string;
  role: string;
  initials: string;
  avatarGradient: string;
}

export interface DemoFeature {
  emoji: string;
  title: string;
  description: string;
}
