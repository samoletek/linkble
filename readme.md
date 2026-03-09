# Linkble

Linkble is a local-events mobile app for finding, creating, and joining real-world activities nearby. The repository includes the React Native app, the marketing website, and Supabase backend assets.

Website: `https://linkble-app.com`
App version: `1.0.9`
iOS build: `12`
Android versionCode: `12`

## What Is In This Repo

- `src/`: app screens, components, services, stores, and navigation
- `website/`: landing page plus legal pages
- `supabase/`: migrations and Edge Functions
- `ios/`, `android/`: native projects for local builds
- `CHECKLIST.md`: delivery status and Phase 2 proposal

## Current App Scope

- Email/password auth plus Apple Sign In and Google Sign In
- Profile setup, avatar upload, interests, username changes, account deletion
- Event discovery in feed and on map
- Event creation with category, schedule, address search, and participant limits
- Public/private events, join requests, auto-accept flow, leave/cancel rules
- Event group chat and basic direct messages
- Report/block safety flows
- OneSignal-based push notification pipeline and event-time notification functions

## Stack

- React Native `0.81.5`
- React `19`
- Expo `54` (bare/native workflow)
- TypeScript
- Supabase Auth, Postgres, Realtime, Storage, Edge Functions
- Mapbox for map rendering/geocoding
- OneSignal for push notifications
- Vercel for the website

## Project Structure

```text
linkble/
├── src/
│   ├── components/
│   ├── navigation/
│   ├── screens/
│   ├── services/
│   ├── stores/
│   └── utils/
├── supabase/
│   ├── functions/
│   └── migrations/
├── website/
├── ios/
├── android/
├── app.json
├── package.json
└── CHECKLIST.md
```

## Local Setup

Requirements:

- Node.js `18+`
- npm
- Xcode + CocoaPods for iOS
- Android Studio for Android
- Supabase CLI if you need to push migrations/functions

Install dependencies:

```bash
npm install
npx pod-install
```

Run the app:

```bash
npm run ios
npm run android
npm run start
```

## Environment And Config

The app currently expects:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
GOOGLE_MAPS_API_KEY=
MAPBOX_ACCESS_TOKEN=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

Additional config locations:

- Android Firebase config: `google-services.json`
- Mapbox token fallback: `src/config/mapbox.ts`
- OneSignal App ID: `src/config/onesignal.ts`

## Supabase

Database changes are tracked in `supabase/migrations/`.
Edge Functions currently included:

- `send-push`
- `check-event-times`
- `delete-user`

Typical workflow:

```bash
npx supabase db push
```

## Website

The marketing site and legal pages live in `website/`:

- `index.html`
- `privacy.html`
- `terms.html`
- `child-safety.html`

## Status

This repository is actively used for production builds from Xcode and Android Studio. Detailed delivery tracking, deployment notes, and the proposed Phase 2 scope live in `CHECKLIST.md`.
