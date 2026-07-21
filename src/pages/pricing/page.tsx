import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Bitcoin, CreditCard } from "lucide-react";
import { supabase } from "@/lib/supabase.ts";

const PLANS = [
  {
    id: "basic",
    name: "Starter",
    price: 23,
    paddlePriceId: "pri_01ky23fy2gnmjfwypga2make39", // Starter Plan
    features: [
      "500 AI Messages / month",
      "Live Inbox",
      "Basic Analytics",
      "Email Support"
    ]
  },
  {
    id: "pro",
    name: "Professional",
    price: 55,
    popular: true,
    paddlePriceId: "pri_01ky23sneq97rgq7wa3324bpyv", // Pro Plan
    features: [
      "5,000 AI Messages / month",
      "Advanced Auto-reply",
      "CRM Integration",
      "Meta/Google Ads API",
      "Priority Support"
    ]
  },
  {
    id: "agency",
    name: "Agency",
    price: 135,
    paddlePriceId: "pri_01ky23y9a508n40enht0pfxwga", // Agency Plan
    features: [
      "Unlimited AI Messages",
      "Multiple Workspaces",
      "White-label Reports",
      "Dedicated Account Manager",
      "Custom AI Training"
    ]
  }
];

export default function PricingPage() {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    // Load Paddle.js
    const script = document.createElement("script");
    script.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
    script.onload = () => {
      if (window.Paddle) {
        window.Paddle.Initialize({ 
          token: "live_cdf89449c38330915fa2d5c8858" // Paddle Client Token
        });
      }
    };
    document.body.appendChild(script);
  }, []);

  const handlePaddleCheckout = async (plan: any) => {
    if (!user) return toast.error("Please login to subscribe");
    if (!window.Paddle) return toast.error("Payment system is initializing, please wait");
    
    setLoadingPlan(plan.id);
    try {
      const res = await supabase.functions.invoke('create-checkout', {
        body: { planId: plan.id, priceId: plan.paddlePriceId, gateway: 'paddle' }
      });
      if (res.error) throw res.error;
      
      if (res.data?.transactionId) {
        // Open Paddle Checkout Overlay
        window.Paddle.Checkout.open({
          transactionId: res.data.transactionId
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to initiate Paddle checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCryptoCheckout = async (planId: string) => {
    if (!user) return toast.error("Please login to subscribe");
    setLoadingPlan(planId);
    try {
      const res = await supabase.functions.invoke('create-checkout', {
        body: { planId, gateway: 'nowpayments' }
      });
      if (res.error) throw res.error;
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to initiate Crypto checkout");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="text-center mb-16">
        <h1 className="text-4xl font-bold tracking-tight mb-4">Simple, transparent pricing</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Choose the right plan for your business. Pay securely with Credit Card (via Paddle) or Crypto (USDT/BTC).
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {PLANS.map((plan) => (
          <div key={plan.id} className={`relative flex flex-col p-8 rounded-2xl border bg-card ${plan.popular ? 'border-primary shadow-lg scale-105 z-10' : 'border-border'}`}>
            {plan.popular && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider py-1 px-3 rounded-full">
                Most Popular
              </div>
            )}
            <div className="mb-8">
              <h3 className="text-2xl font-bold">{plan.name}</h3>
              <div className="mt-4 flex items-baseline text-5xl font-extrabold">
                ${plan.price}
                <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
              </div>
            </div>
            
            <ul className="flex-1 space-y-4 mb-8">
              {plan.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mr-3" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="space-y-3">
              <Button 
                onClick={() => handlePaddleCheckout(plan)} 
                disabled={loadingPlan === plan.id}
                className={`w-full ${plan.popular ? '' : 'variant-outline'}`}
              >
                {loadingPlan === plan.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
                Subscribe with Card
              </Button>
              
              <Button 
                onClick={() => handleCryptoCheckout(plan.id)} 
                disabled={loadingPlan === plan.id}
                variant="secondary"
                className="w-full bg-slate-800 hover:bg-slate-700 text-white"
              >
                {loadingPlan === plan.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bitcoin className="mr-2 h-4 w-4" />}
                Pay with Crypto
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
