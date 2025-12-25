# Linkble

> Connect. Discover. Experience.

A mobile application that connects people through local activities and events. Users can create, discover, and join events happening nearby, coordinate through group chats, and build meaningful connections with people who share their interests.

**Website:** https://linkble-app.com
**Contact:** not created

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Features](#2-features)
3. [Design System & Branding](#3-design-system--branding)
4. [Technical Stack](#4-technical-stack)
5. [Architecture](#5-architecture)
6. [Database Schema](#6-database-schema)
7. [API Specification](#7-api-specification)
8. [Business Logic](#8-business-logic)
9. [Setup & Development](#9-setup--development)
10. [Deployment](#10-deployment)
11. [Project Status](#11-project-status)

---

## 1. Project Overview

### Vision
Linkble solves a common problem: people want to do activities but don't have anyone available to join, or find it hard to discover spontaneous local experiences beyond their existing friend groups. Unlike other social platforms, Linkble focuses specifically on in-person engagement.

### Target Audience
- Casual users looking for local activities
- Students seeking study groups or social events
- Professionals interested in networking events
- Travelers wanting to meet locals
- Anyone looking for shared interest activities

### Core Value Proposition
- **For Event Hosts:** Easy way to organize activities and find participants
- **For Participants:** Discover local events matching your interests
- **For Everyone:** Safe, moderated platform for real-world connections

---

## 2. Features

### 2.1 User Management

#### Registration & Authentication
- Email/phone registration with password
- Date of birth verification (16+ required)
- Email verification flow
- Password reset functionality
- Secure session management

#### Profile
- Mandatory profile photo
- Interest selection (3-5 categories)
- Username (changeable every 30 days)
- Past events history
- Account deletion option

### 2.2 Event Discovery

#### Map View
- Interactive Google Maps integration
- Event markers with clustering
- Current location detection
- Adjustable search radius (default 10km)
- Tap-to-preview functionality

#### Feed View
- List of nearby events
- Category filtering (7 preset categories)
- Sort by: distance, date, category preference
- Events starting soonest appear first
- Pull-to-refresh

#### Categories
1. Sports/Hobbies
2. Parties
3. Business
4. Free Time Activities
5. Studies
6. Concerts
7. Private Events

### 2.3 Event Creation

#### Event Details
- Title (required)
- Description (required, max 2000 characters)
- Category (select from presets)
- Date & time (min 1 hour, max 1 year ahead)
- Location (address search or map pin)
- Participant limit (2-50)
- Public/Private toggle
- Auto-accept toggle (public events only)

#### Event Lifecycle
1. Created by host
2. Visible to users within search radius
3. Users request to join
4. Host approves/rejects (or auto-accept)
5. Event occurs
6. Removed from feed 24h after end
7. Chat archived

### 2.4 Join System

#### Request Flow
- User sends join request
- Host receives notification
- Host approves or rejects
- User notified of decision

#### Constraints
- Users can join only ONE event at a time
- Leave policy:
  - Public events: up to 1 hour before start
  - Private events: up to 24 hours before start
- Host can cancel events 24+ hours before start

### 2.5 Messaging

#### Event Group Chat
- Created when event is created
- Host sees chat immediately
- Participants see chat after acceptance
- Text messages only
- Host controls: delete messages, pin messages, kick users
- Archived 24 hours after event ends
- Users can delete their archived chats

#### Direct Messages (Basic)
- Text only (no media)
- Start conversation from event participant profile
- No username search (Phase 2)
- No read receipts (Phase 2)
- Real-time updates via Supabase

### 2.6 Notifications

| Notification Type | Recipient |
|-------------------|-----------|
| Join request received | Host |
| Request accepted | Participant |
| Request denied | Participant |
| New message (event chat) | Participants |
| New message (DM) | User |
| New event near you | Users in radius |
| Event cancelled | Participants |
| Event starting (1hr) | Participants |
| Event starting (30min) | Participants |
| Event started | Participants |
| Kicked from event | User |
| Event is full | Host |

### 2.7 Safety Features

#### Blocking
- Block any user
- Blocked users cannot:
  - See your events
  - See your profile
  - Message you
- Manage blocked list in settings

#### Reporting
- Report users for violations
- Report inappropriate events
- Manual review by administrators
- Actions: warning, suspension, ban

---

## 3. Design System & Branding

### 3.1 Theme
The app supports both dark and light modes, with **dark mode as primary**.

### 3.2 Colors

| Token | Dark Mode | Light Mode | Usage |
|-------|-----------|------------|-------|
| Background | #000814 | #FFFFFF | Main app background |
| Card Background | #0A0F1A | #F5F5F5 | Cards, bottom sheets |
| Primary (Neon Blue) | #00A8FF | #00A8FF | Buttons, active states, glow effects |
| Text Primary | #FFFFFF | #1A1A1A | Main text |
| Text Secondary | #B3B3B3 | #666666 | Secondary text |
| Error | #FF4D4D | #FF4D4D | Error states |
| Success | #34C759 | #34C759 | Success states |

### 3.3 Visual Style
- Neon blue glow effects on interactive elements
- Smooth 60fps animations
- Modern, clean, community-focused UI
- Logo: Two people icon in neon blue inside a magnifying glass

### 3.4 Animation Guidelines

| Element | Animation | Duration |
|---------|-----------|----------|
| Button tap | Scale 1 -> 0.96 -> 1 | 100ms each way |
| Tab icon | Scale 1 -> 1.15 -> 1 | 120ms |
| Card appear | Fade + Slide up 20px | 200ms, stagger 50ms |
| Card tap | Scale 1 -> 0.97 -> 1 | 150-200ms |
| Bottom sheet | Slide up + Fade content | 250ms |
| Map pin drop | Fall from -30px + bounce | 250ms |
| Message appear | Slide up 10px + Fade | 120ms |
| Badge pop | Scale 0 -> 1.2 -> 1 | 160ms |

**Motion Rules:**
- Use `transform` + `opacity` only for smooth 60fps
- Transitions: 180-260ms
- Tap feedback: 80-120ms
- Easing: easeOutCubic
- List stagger: 40-70ms between items

### 3.5 Typography
- System fonts (San Francisco on iOS, Roboto on Android)
- Clean, readable hierarchy
- No emojis in UI

---

## 4. Technical Stack

### 4.1 Mobile Application
| Component | Technology |
|-----------|------------|
| Framework | React Native 0.73+ |
| Build System | Expo (bare workflow) |
| Language | TypeScript |
| Navigation | React Navigation v6 |
| State Management | Zustand (or Context) |
| Maps | react-native-maps + Google Maps SDK |
| Notifications | expo-notifications + FCM |

### 4.2 Backend & Database
| Component | Technology |
|-----------|------------|
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Real-time | Supabase Realtime |
| Push Notifications | Firebase Cloud Messaging |
| Email Service | Resend |

### 4.3 Infrastructure
| Component | Technology |
|-----------|------------|
| Website Hosting | Vercel |
| iOS Builds | Xcode (local) |
| Android Builds | Android Studio (local) |
| Domain | linkble-app.com |

### 4.4 External APIs
| Service | Purpose |
|---------|---------|
| Google Maps SDK | Map display, location search |
| Google Places API | Address autocomplete |
| Google Geocoding API | Coordinate conversion |
| Firebase Cloud Messaging | Push notifications |

---

## 5. Architecture

### 5.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile App                                │
│                   (React Native + Expo)                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Supabase                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  PostgreSQL │  │    Auth     │  │   Storage   │              │
│  │  (Database) │  │  (JWT/SSO)  │  │  (Avatars)  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│  ┌─────────────┐                                                 │
│  │  Realtime   │ ◄── WebSocket subscriptions                    │
│  │  (Chat/Updates)                                               │
│  └─────────────┘                                                 │
└─────────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌──────────┐   ┌──────────┐   ┌──────────┐
    │  Google  │   │ Firebase │   │  Resend  │
    │   Maps   │   │   FCM    │   │  (Email) │
    └──────────┘   └──────────┘   └──────────┘
```

### 5.2 Data Flow

#### Event Discovery
```
User opens app
    → Request location permission
    → Get current coordinates
    → Query Supabase for events within radius
    → Filter by category preferences
    → Sort by distance/date
    → Display on map + feed
```

#### Real-time Chat
```
User sends message
    → Insert into Supabase messages table
    → Supabase Realtime broadcasts to subscribers
    → All participants receive message instantly
    → Push notification sent via FCM
```

#### Join Request
```
User requests to join
    → Insert into event_participants (status: pending)
    → Supabase trigger sends notification
    → Host approves/rejects
    → Update participant status
    → Notify user of decision
```

---

## 6. Database Schema

### 6.1 Tables

#### profiles
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  date_of_birth DATE NOT NULL,
  interests TEXT[], -- Array of category IDs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_username_change TIMESTAMPTZ
);
```

#### categories
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preset data
INSERT INTO categories (name, icon) VALUES
  ('sports_hobbies', 'sports'),
  ('parties', 'party'),
  ('business', 'briefcase'),
  ('free_time', 'coffee'),
  ('studies', 'book'),
  ('concerts', 'music'),
  ('private_events', 'lock');
```

#### events
```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID REFERENCES profiles(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id INT REFERENCES categories(id) NOT NULL,
  location_lat FLOAT NOT NULL,
  location_lng FLOAT NOT NULL,
  location_address TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  max_participants INT DEFAULT 10 CHECK (max_participants >= 2 AND max_participants <= 50),
  is_private BOOLEAN DEFAULT FALSE,
  auto_accept BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### event_participants
```sql
CREATE TABLE event_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'left', 'kicked')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(event_id, user_id)
);
```

#### messages (Event Chat)
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### conversations (Direct Messages)
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID REFERENCES profiles(id),
  user2_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);
```

#### direct_messages
```sql
CREATE TABLE direct_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### blocked_users
```sql
CREATE TABLE blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID REFERENCES profiles(id),
  blocked_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);
```

#### reports
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES profiles(id),
  reported_user_id UUID REFERENCES profiles(id),
  reported_event_id UUID REFERENCES events(id),
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 6.2 Row Level Security (RLS)

All tables have RLS enabled. Key policies:

```sql
-- Profiles: Users can read all, update own
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Events: Visible unless blocked
CREATE POLICY "Events visible if not blocked"
  ON events FOR SELECT USING (
    NOT EXISTS (
      SELECT 1 FROM blocked_users
      WHERE (blocker_id = auth.uid() AND blocked_id = events.host_id)
         OR (blocker_id = events.host_id AND blocked_id = auth.uid())
    )
  );

-- Messages: Only participants can see
CREATE POLICY "Event messages visible to participants"
  ON messages FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM event_participants
      WHERE event_id = messages.event_id
        AND user_id = auth.uid()
        AND status = 'accepted'
    )
    OR EXISTS (
      SELECT 1 FROM events
      WHERE id = messages.event_id
        AND host_id = auth.uid()
    )
  );
```

---

## 7. API Specification

### 7.1 Authentication

All authenticated endpoints require:
```
Authorization: Bearer <supabase_access_token>
```

Supabase handles:
- `/auth/v1/signup` - Register
- `/auth/v1/token?grant_type=password` - Login
- `/auth/v1/token?grant_type=refresh_token` - Refresh
- `/auth/v1/logout` - Logout
- `/auth/v1/recover` - Password reset

### 7.2 Supabase Queries

All data operations use Supabase client SDK:

```typescript
// Get nearby events
const { data: events } = await supabase
  .from('events')
  .select(`
    *,
    host:profiles(*),
    participants:event_participants(count)
  `)
  .eq('status', 'active')
  .gte('start_time', new Date().toISOString())
  .order('start_time', { ascending: true });

// Create event
const { data: event } = await supabase
  .from('events')
  .insert({
    host_id: userId,
    title,
    description,
    category_id,
    location_lat,
    location_lng,
    location_address,
    start_time,
    max_participants,
    is_private,
    auto_accept
  })
  .select()
  .single();

// Join event
const { data } = await supabase
  .from('event_participants')
  .insert({
    event_id,
    user_id,
    status: event.auto_accept ? 'accepted' : 'pending'
  });
```

### 7.3 Real-time Subscriptions

```typescript
// Subscribe to event chat
const subscription = supabase
  .channel(`event_chat:${eventId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `event_id=eq.${eventId}`
    },
    (payload) => {
      addMessage(payload.new);
    }
  )
  .subscribe();

// Subscribe to DMs
const dmSubscription = supabase
  .channel(`dm:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'direct_messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      addDirectMessage(payload.new);
    }
  )
  .subscribe();
```

---

## 8. Business Logic

### 8.1 Event Rules

| Rule | Value |
|------|-------|
| Minimum advance notice | 1 hour |
| Maximum advance notice | 1 year |
| Minimum participants | 2 (host + 1) |
| Maximum participants | 50 |
| Description limit | 2000 characters |
| Host cancellation deadline | 24 hours before |
| Leave deadline (public) | 1 hour before |
| Leave deadline (private) | 24 hours before |
| Chat archive time | 24 hours after event end |

### 8.2 User Rules

| Rule | Value |
|------|-------|
| Minimum age | 16 years |
| Maximum interests | 5 |
| Minimum interests | 3 (recommended) |
| Username change frequency | Every 30 days |
| Concurrent events | 1 at a time |

### 8.3 Discovery Rules

| Rule | Value |
|------|-------|
| Default search radius | 10 km |
| Radius options | 10, 20, 30+ km |
| Event visibility | Until start time (except for participants) |
| Sorting default | Category preference, distance, soonest |

### 8.4 Privacy & Blocking

When User A blocks User B:
- A cannot see B's events
- B cannot see A's events
- Neither can message the other
- Existing conversations hidden
- No notifications between them

---

## 9. Setup & Development

### 9.1 Prerequisites

- Node.js 18+ LTS
- npm or yarn
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- Supabase account
- Google Cloud account
- Firebase account

### 9.2 Environment Variables

Create `.env` in project root:

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
GOOGLE_MAPS_API_KEY=xxx
```

### 9.3 Installation

```bash
# Clone repository
git clone https://github.com/YOUR_USERNAME/linkble.git
cd linkble

# Install dependencies
npm install

# iOS setup
cd ios && pod install && cd ..

# Run on iOS
npx react-native run-ios
# OR open ios/Linkble.xcworkspace in Xcode

# Run on Android
npx react-native run-android
```

### 9.4 Project Structure

```
linkble/
├── src/
│   ├── screens/
│   │   ├── auth/
│   │   │   └── WelcomeScreen.tsx      # Onboarding with bottom sheet auth modal
│   │   ├── feed/
│   │   │   └── FeedScreen.tsx         # Event cards list
│   │   ├── map/
│   │   │   └── MapScreen.tsx          # Map view with event pins
│   │   ├── create/
│   │   │   └── CreateEventScreen.tsx  # Bottom sheet event creation
│   │   ├── chat/
│   │   │   ├── ChatListScreen.tsx     # Conversations list
│   │   │   ├── EventChatScreen.tsx    # Group event chat
│   │   │   └── DirectChatScreen.tsx   # Direct messages
│   │   ├── profile/
│   │   │   ├── ProfileScreen.tsx      # User profile
│   │   │   ├── EditProfileScreen.tsx  # Edit profile
│   │   │   └── SettingsScreen.tsx     # App settings
│   │   └── event/
│   │       └── EventDetailScreen.tsx  # Event details view
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx             # Primary/secondary buttons with glow
│   │   │   ├── Card.tsx               # Event card component
│   │   │   └── BottomSheet.tsx        # Reusable bottom sheet
│   │   ├── auth/
│   │   │   └── AuthModal.tsx          # Auth options modal
│   │   ├── feed/
│   │   │   └── EventCard.tsx          # Event list card
│   │   ├── map/
│   │   │   └── MapMarker.tsx          # Animated map pin
│   │   └── chat/
│   │       └── MessageBubble.tsx      # Chat message bubble
│   ├── constants/
│   │   ├── colors.ts                  # Theme colors (dark/light)
│   │   ├── typography.ts              # Font styles
│   │   ├── spacing.ts                 # Spacing values
│   │   ├── animations.ts              # Animation constants
│   │   └── index.ts                   # Exports
│   ├── contexts/
│   │   ├── ThemeContext.tsx           # Dark/Light theme provider
│   │   └── AuthContext.tsx            # Auth state provider
│   ├── navigation/
│   │   ├── RootNavigator.tsx          # Auth/Main switch
│   │   ├── AuthNavigator.tsx          # Auth stack
│   │   └── MainNavigator.tsx          # Bottom tabs (Feed, Map, Create, Chat, Profile)
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTheme.ts
│   │   └── useLocation.ts
│   ├── services/
│   │   ├── supabase.ts
│   │   └── notifications.ts
│   ├── stores/
│   │   └── authStore.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   └── responsive.ts
│   └── config/
│       └── supabase.ts
├── assets/
│   ├── logo.png
│   └── icons/
├── ios/
├── android/
├── website/
│   ├── index.html
│   ├── privacy.html
│   └── terms.html
├── app.json
├── package.json
├── tsconfig.json
├── CHECKLIST.md
├── CLAUDE.md
└── README.md
```

**Bottom Tab Navigation (5 tabs):**
1. **Feed** - Event cards list with category filters
2. **Map** - Interactive map with event pins
3. **Create** - Event creation (opens bottom sheet)
4. **Chat** - Conversations list (event chats + DMs)
5. **Profile** - User profile and settings

---

## 10. Deployment

### 10.1 Website (Vercel)

```bash
# Deploy to Vercel
cd web
vercel --prod

# Connect domain in Vercel dashboard
# Add DNS records for linkble-app.com
```

### 10.2 iOS (App Store)

1. Create production build in Xcode
2. Archive and upload to App Store Connect
3. Complete App Store listing
4. Submit for review

Required assets:
- App icons (all sizes)
- Screenshots (6.7", 6.5", 5.5")
- Privacy Policy URL
- Terms of Service URL

### 10.3 Android (Play Store)

1. Generate signed AAB in Android Studio
2. Upload to Google Play Console
3. Complete store listing
4. Set up closed testing (12+ testers, 14 days)
5. Submit for production review

Required assets:
- App icons
- Feature graphic (1024x500)
- Screenshots
- Data safety declaration

---

## 11. Project Status

### Current Phase: MVP Development

**Timeline:** 4-5 weeks

| Milestone | Status | Deadline |
|-----------|--------|----------|
| Infrastructure Setup | In Progress | Week 1 |
| Core Development | Not Started | Weeks 2-3 |
| iOS Deployment | Not Started | Week 4 |
| Android Deployment | Not Started | Week 5 |

### Out of Scope (Phase 2)

- ID/Age verification system
- Voice/Video calls
- Unlimited participants
- Username search for DMs
- Media sharing in chats
- Read receipts
- Typing indicators
- Monetization features

---

## References

- [CHECKLIST.md](./CHECKLIST.md) - Development tasks and progress
- [Supabase Docs](https://supabase.com/docs)
- [React Native Docs](https://reactnative.dev/docs)
- [Expo Docs](https://docs.expo.dev)