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
  LeadModalProvider,
} from "../components/landing";

export default function LandingPage() {
  return (
    <div className="heron-landing">
      <div className="page-bg" aria-hidden="true" />
      <LeadModalProvider>
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
      </LeadModalProvider>
    </div>
  );
}
