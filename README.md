# SweetSpots

AI-powered place discovery app. Tell us your mood, and we'll find places that match your vibe.

**Live:** https://www.findyoursweetspots.com

## Tech Stack

- React + TypeScript + Vite
- Tailwind CSS + shadcn/ui
- Supabase (auth, database, edge functions)
- Google Places API + Gemini AI

## Local Development

Requirements: Node.js & npm ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))

```sh
# Install dependencies
npm install

# Start dev server (port 8080)
npm run dev
```

## Deployment

Frontend is deployed via Vercel. Edge functions are deployed via Supabase CLI:

```sh
supabase functions deploy
```
