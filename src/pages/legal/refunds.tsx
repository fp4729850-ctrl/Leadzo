import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button.tsx";
import { ArrowLeft } from "lucide-react";

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4 font-sans max-w-4xl mx-auto">
      <Link to="/">
        <Button variant="ghost" className="mb-8 gap-2">
          <ArrowLeft size={16} /> Back to Home
        </Button>
      </Link>
      
      <h1 className="text-4xl font-bold tracking-tight mb-4 font-serif">Refund Policy</h1>
      <p className="text-muted-foreground text-sm mb-8">Last Updated: August 5, 2026</p>
      
      <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">1. 14-Day Money Back Guarantee</h2>
          <p>
            We want you to be fully satisfied with Leadzo AI. We offer a **14-day money-back guarantee** on all new subscription plans (Starter, Pro, and Agency). If you decide our platform does not meet your B2B marketing needs, you can request a full refund within 14 calendar days of your initial purchase date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">2. How to Request a Refund</h2>
          <p className="mb-2">To request a refund under the 14-day policy, please follow these steps:</p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Send an email to <strong>leadzoai@gmail.com</strong> from the email address connected to your Leadzo account.</li>
            <li>Include your transaction details or invoice number received from Paddle.</li>
            <li>Give a brief explanation of why the platform did not suit your requirements (this helps us improve).</li>
          </ol>
          <p className="mt-2">
            Once submitted, our billing support team will review and approve your request within 24-48 business hours. Approved refunds are credited back to the original payment method instantly. Depending on your financial institution, the credits will show in your account in 3-7 business days.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">3. Exceptions & Renewals</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Subscription Renewals:</strong> Our 14-day refund policy applies ONLY to the *first* initial subscription month. Subsequent automatic monthly renewals do not qualify for the refund guarantee.</li>
            <li><strong>Usage Exceeded:</strong> If you consume more than 50% of your allocated monthly AI credits (e.g., sending more than 2,500 messages on the Pro Plan) within the first 14 days, we reserve the right to deny or prorate the refund request to prevent platform exploitation.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">4. Plan Upgrades & Downgrades</h2>
          <p>
            If you upgrade or downgrade your plan, the price difference will be prorated automatically by Paddle. Prorated payments for mid-cycle plan upgrades do not qualify for the 14-day refund policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">5. Contact Billing Support</h2>
          <p>
            If you have questions about a charge, payment status, subscription cancel details, or need billing help, contact us directly at: <strong>leadzoai@gmail.com</strong>.
          </p>
        </section>
      </div>
    </div>
  );
}
