import {
  Navbar,
  HeroSection,
  TrustBar,
  FeaturesSection,
  HowItWorksSection,
  PricingSection,
  TestimonialsSection,
  CtaSection,
  LoginSection,
  Footer,
} from "../components/landing";

export default function LandingPage() {
  return (
    <main>
      <Navbar />
      <HeroSection />
      <TrustBar />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <CtaSection />
      <LoginSection />
      <Footer />
    </main>
  );
}
