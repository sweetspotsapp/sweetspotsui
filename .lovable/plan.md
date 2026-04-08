

# Pro Subscriber Experience + Subscription Management

## Current State
The Pricing page already toggles text ("Manage plan" vs "Upgrade to Pro") based on `isPro`, but there's no rich "you're a Pro member" experience, and no cancel/downgrade flow. The Settings page has no subscription section at all.

## Plan

### 1. Enhance Pricing page for Pro subscribers
- When `isPro`: show a **green "Active" badge** on the Pro card instead of just "Current"
- Add subscription end date text below the price (e.g. "Renews on Jul 15, 2026")
- Change the Free card CTA from disabled "Your current plan" to **"Downgrade to Free"** which opens the Stripe customer portal (where they can cancel)
- Keep "Manage plan" on Pro card → opens Stripe portal

### 2. Add Subscription section to Settings page
- New section between "Account" and "Notifications" called **"Subscription"**
- Shows current plan name (Free / Pro) with a colored badge
- If Pro: shows renewal date, and two actions:
  - "Manage billing" → opens Stripe customer portal
  - "Cancel subscription" → confirmation dialog, then opens Stripe portal's cancellation flow
- If Free: shows "Upgrade to Pro" button → navigates to `/pricing`
- This is the natural place users expect to find subscription management (like Spotify, Netflix settings)

### Files to modify
- `src/pages/Pricing.tsx` — enhance Pro subscriber UI (active badge, renewal date, downgrade CTA)
- `src/pages/Settings.tsx` — add Subscription section with plan status, manage/cancel actions

### No database changes needed
All subscription data comes from the existing `useSubscription` hook which queries Stripe.

