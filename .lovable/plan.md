

## Problem

There are two separate subscription UIs causing confusion:
1. **Settings page** — has a "Subscription" section with Free/Pro status and "Upgrade to Pro" button that links to /pricing
2. **Pricing page** — full plan comparison with Free vs Pro cards

The user clicks "Subscription" from the profile menu → goes to /pricing. But Settings also shows subscription info. Two places = confusing.

## Plan

### 1. Consolidate: Profile menu "Subscription" → /pricing (already done, no change needed)

### 2. Remove the Subscription section from Settings page
- Delete the `SubscriptionSection` component from `src/pages/Settings.tsx` (lines 60-175)
- Remove the Subscription `<section>` block (lines 429-435)
- Remove unused imports (`Crown`, `CreditCard`, `Sparkles`, `useSubscription`, `format`, `Badge`)

### 3. Enhance the Pricing page to be the single subscription hub
- Add current plan status prominently at the top (badge showing "Your current plan" on the active tier)
- For Pro users: add "Manage billing" and "Cancel subscription" actions directly on the Pro card (move that logic from Settings into Pricing page)
- Keep the plan comparison cards but make the active plan more visually distinct
- Add renewal date display for Pro subscribers

This means `/pricing` becomes the one-stop subscription page — accessible from both the profile slide menu and anywhere else. Settings stays focused on account, notifications, and privacy.

### Files to modify
- `src/pages/Settings.tsx` — remove SubscriptionSection component and its section
- `src/pages/Pricing.tsx` — add manage billing / cancel subscription buttons for Pro users

