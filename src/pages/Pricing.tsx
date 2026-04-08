import { Check, Sparkles, X, Crown, Zap, MapPin, Infinity, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription, STRIPE_CONFIG } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";

const PricingPage = () => {
  const { user } = useAuth();
  const { isPro, subscribed, openCheckout, openPortal } = useSubscription();
  const navigate = useNavigate();

  const plans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for casual explorers",
      features: [
        { text: "5 vibe searches per day", included: true },
        { text: "1 trip plan per month", included: true },
        { text: "Save unlimited spots", included: true },
        { text: "Share trips with friends", included: true },
        { text: "Unlimited searches", included: false },
        { text: "Unlimited trip plans", included: false },
        { text: "Priority AI results", included: false },
        { text: "Early access features", included: false },
      ],
      current: !subscribed,
      cta: subscribed ? "Current basics" : "Your current plan",
    },
    {
      name: "Pro",
      price: "$5.99",
      period: "per month",
      description: "For serious travelers & trip planners",
      features: [
        { text: "Unlimited vibe searches", included: true },
        { text: "Unlimited trip plans", included: true },
        { text: "Save unlimited spots", included: true },
        { text: "Share trips with friends", included: true },
        { text: "Priority AI results", included: true },
        { text: "Faster response times", included: true },
        { text: "Early access features", included: true },
        { text: "Priority support", included: true },
      ],
      current: isPro,
      cta: isPro ? "Manage plan" : "Upgrade to Pro",
      highlighted: true,
    },
  ];

  const handleCTA = (plan: typeof plans[0]) => {
    if (plan.name === "Pro") {
      if (isPro) {
        openPortal();
      } else if (!user) {
        navigate("/auth");
      } else {
        openCheckout();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Back button */}
        <button onClick={() => navigate(-1)} className="text-sm text-muted-foreground hover:text-foreground mb-8 flex items-center gap-1">
          ← Back
        </button>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Crown className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Choose your plan</h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Unlock unlimited discoveries and trip planning with SweetSpots Pro
          </p>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl border-2 p-6 transition-all ${
                plan.highlighted
                  ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                  : "border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  Most Popular
                </div>
              )}

              {plan.current && (
                <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                  Current
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">/{plan.period}</span>
                </div>
              </div>

              <div className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <div key={feature.text} className="flex items-center gap-3">
                    {feature.included ? (
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <X className="w-3 h-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className={`text-sm ${feature.included ? "text-foreground" : "text-muted-foreground"}`}>
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => handleCTA(plan)}
                variant={plan.highlighted ? "default" : "outline"}
                className={`w-full h-12 rounded-2xl text-base font-semibold ${
                  plan.highlighted ? "gap-2" : ""
                }`}
                disabled={plan.name === "Free" && !subscribed}
              >
                {plan.highlighted && <Sparkles className="w-4 h-4" />}
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Cancel anytime. No questions asked. All subscriptions are handled securely via Stripe.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
