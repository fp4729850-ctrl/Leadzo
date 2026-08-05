import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4 font-sans max-w-4xl mx-auto">
      <Link to="/">
        <Button variant="ghost" className="mb-8 gap-2">
          <ArrowLeft size={16} /> Back to Home
        </Button>
      </Link>
      
      <h1 className="text-4xl font-bold tracking-tight mb-4 font-serif">Terms of Service</h1>
      <p className="text-muted-foreground text-sm mb-8">Last Updated: August 5, 2026</p>
      
      <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">1. Agreement to Terms</h2>
          <p>
            By accessing or using Leadzo AI ("we," "us," or "our"), you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not access or use our SaaS platform, marketing automation scripts, or integrations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">2. Description of Service</h2>
          <p>
            Leadzo AI is a software-as-a-service (SaaS) platform that provides autonomous CRM follow-ups, dynamic search visibility auditing, and automated marketing campaign deployment across third-party networks (Google Ads, Meta Ads).
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">3. Account Registration & Security</h2>
          <p>
            To use our services, you must register for an account and connect necessary API credentials. You are solely responsible for maintaining the confidentiality of your account password, API tokens, and all activities that occur under your account. You agree to notify us immediately of any unauthorized use or security breach.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">4. Fees, Billing & Subscription Cancellations</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Billing:</strong> Subscriptions are billed on a recurring monthly cycle as defined in your selected plan (Starter, Pro, Agency). All card transactions are processed securely via our merchant of record, Paddle.</li>
            <li><strong>Cancellations:</strong> You can cancel your subscription at any time through the billing dashboard. Your access will remain active until the end of the current paid billing cycle, and no further recurring charges will be initiated.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">5. User Restrictions & Acceptable Use</h2>
          <p className="mb-2">You agree NOT to use Leadzo AI to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Deploy spam, bulk unsolicited messages (WhatsApp/SMS/Email), or deceptive marketing material.</li>
            <li>Infect or compromise third-party networks or violate Google API and Meta Developer policies.</li>
            <li>Attempt to reverse-engineer, exploit, or duplicate our proprietary autonomous agent architectures.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">6. Limitation of Liability</h2>
          <p>
            In no event shall Leadzo AI, its developers, or its partners be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, advertising spend budget errors, Google/Meta ad account suspensions, or data breaches resulting from account credential leaks.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">7. Governing Law</h2>
          <p>
            These Terms of Service shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law principles.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">8. Changes to Terms</h2>
          <p>
            We reserve the right to modify these terms at any time. We will alert users to modifications by updating the "Last Updated" date at the top of this document. Continued use of the platform constitutes agreement to the updated terms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">9. Contact</h2>
          <p>
            For legal inquiries, terms compliance questions, or account concerns, reach out to us at: <strong>leadzoai@gmail.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
