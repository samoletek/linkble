# Linkble

Linkble is a local-events product with:
- mobile app (React Native + Expo bare workflow)
- marketing/legal website
- Supabase backend migrations and Edge Functions

Production website: `https://linkble-app.com`

## Repository Layout

- `src/` - mobile app screens, services, stores, navigation
- `android/`, `ios/` - native projects for release builds
- `website/` - landing and legal pages
- `supabase/` - SQL migrations and Edge Functions
- `CHECKLIST.md` - delivery status and next-phase scope

## Stack

- React Native 0.81
- Expo SDK 54 (native workflow)
- TypeScript
- Supabase (Auth/Postgres/Realtime/Storage/Functions)
- Mapbox
- OneSignal
- Vercel (website)

## Local Setup

### Requirements

- Node.js 18+
- npm
- Xcode + CocoaPods (iOS)
- Android Studio (Android)

### Install

```bash
npm install
npx pod-install
```

### Run

```bash
npm run start
npm run ios
npm run android
```

## Environment Variables

Create `.env` with:

```env
SUPABASE_URL=
SUPABASE_ANON_KEY=
GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
```

For Android native builds, set Mapbox downloads token only in your shell/CI env:

```bash
export RNMAPBOX_MAPS_DOWNLOAD_TOKEN=...
```

## Platform Config Files

- Android Firebase config: `google-services.json`
- iOS Firebase config: `GoogleService-Info.plist`

Both files are ignored by git and must be stored locally.

## Supabase Workflow

Apply DB migrations/functions from this repo:

```bash
npx supabase db push
```

## Release

- iOS: archive from Xcode (`ios/` project)
- Android: Generate Signed App Bundle from Android Studio (`android/` project)
