import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4 font-sans max-w-4xl mx-auto">
      <Link to="/">
        <Button variant="ghost" className="mb-8 gap-2">
          <ArrowLeft size={16} /> Back to Home
        </Button>
      </Link>
      
      <h1 className="text-4xl font-bold tracking-tight mb-4 font-serif">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm mb-8">Last Updated: August 5, 2026</p>
      
      <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">1. Introduction</h2>
          <p>
            Welcome to Leadzo AI. We value your privacy and are committed to protecting your personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our autonomous CRM, marketing automation platform, and related APIs.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">2. Data We Collect</h2>
          <p className="mb-2">We collect information to provide better services to all our users. This includes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Personal Information:</strong> Name, email address, billing address, and contact details.</li>
            <li><strong>Connected Account Data:</strong> Access tokens and permissions granted when integrating third-party APIs (such as Google Ads, Google Search Console, or Meta Business Suite).</li>
            <li><strong>Usage Logs:</strong> Information about how you interact with our dashboards, campaigns, and tools.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">3. Google Ads & Google Search Console API Data Usage</h2>
          <p className="mb-2">
            Leadzo AI integrates with Google APIs using OAuth 2.0. This integration allows us to act on your behalf to manage and optimize ad campaigns and view search analytics. We comply strictly with the Google API Services User Data Policy, including the Limited Use requirements:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>We only use access tokens to retrieve search analytics data and publish/manage ad campaigns as explicitly requested by you.</li>
            <li>We do not transfer Google API user data to third parties unless required for security, legal compliance, or to provide/improve our core features.</li>
            <li>We do not use Google API data for serving ads or tracking user behavior outside of the Leadzo AI dashboard.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">4. How We Use Your Data</h2>
          <p className="mb-2">We use the collected information for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provision, maintain, and improve the Leadzo AI platform and its autonomous agents.</li>
            <li>To process your subscription payments securely via Paddle (our payment processor).</li>
            <li>To analyze performance metrics and provide search visibility diagnostics.</li>
            <li>To communicate platform updates, system alerts, and customer support resolutions.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">5. Data Retention & Security</h2>
          <p>
            We deploy standard encryption protocols (SSL/TLS) to secure all data transfers. Connected access tokens are stored securely in encrypted vaults. We only retain personal and API data for as long as necessary to fulfill the services outlined in this policy. You can revoke token access at any time through your Google Account security panel or within the Leadzo settings dashboard.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">6. Your Rights</h2>
          <p>
            Depending on your location, you may have rights under GDPR, CCPA, or other local data privacy laws. These rights include accessing, correcting, or deleting your personal information, as well as restricting or objecting to certain processing practices.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">7. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy, please contact our privacy compliance officer at: <strong>leadzoai@gmail.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
