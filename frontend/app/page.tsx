import {
  Navbar,
  HeroSection,
  TrustBar,
  FeaturesSection,
  HowItWorksSection,
  ProductTourSection,
  PricingSection,
  TestimonialsSection,
  CtaSection,
  Footer,
  WatchDemoBar,
} from "../components/landing";

export default function LandingPage() {
  return (
    <div className="heron-landing">
      <div className="page-bg" aria-hidden="true" />
      <Navbar />
      <main>
        <HeroSection />
        <TrustBar />
        <FeaturesSection />
        <HowItWorksSection />
        <ProductTourSection />
        <PricingSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer />
      <WatchDemoBar />
    </div>
  );
}
