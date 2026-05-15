import {
  Navbar,
  HeroSection,
  FeaturesSection,
  HowItWorksSection,
  ProductTourSection,
  PricingSection,
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
        <FeaturesSection />
        <HowItWorksSection />
        <ProductTourSection />
        <PricingSection />
        <CtaSection />
      </main>
      <Footer />
      <WatchDemoBar />
    </div>
  );
}
