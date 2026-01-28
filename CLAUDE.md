# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A self-hosted, multi-device web push notification service built with Next.js 15, SQLite, and web-push. Users can register multiple devices and receive push notifications via VAPID authentication.

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Start development server at http://localhost:3000
npm run build            # Build production application
npm run start            # Start production server (after build)
npm run lint             # Run Next.js linting
npm run generate-vapid   # Generate VAPID key pair to lib/vapid.js
docker compose up -d     # Run via Docker with persistent SQLite volume
```

## Architecture

**Framework**: Next.js 15 (App Router) with React 19

**Database**: SQLite via `better-sqlite3` at `lib/store.ts` - stores device subscriptions keyed by userId

**Push Protocol**: Web Push with VAPID authentication (`lib/web-push.ts`)

**Key Components**:
- `app/page.tsx` - React UI for device management and push testing
- `app/api/push/[userId]/route.ts` - POST sends notifications, DELETE removes devices
- `app/api/subscribe/route.ts` - GET lists devices, POST registers new device
- `public/sw.js` - Service worker for handling incoming push events

## Configuration

VAPID keys must be generated before running:

```bash
npm run generate-vapid
```

Configure `.env.local`:
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...     # Exposed to client
VAPID_PRIVATE_KEY=...                 # Server-only
VAPID_EMAIL=mailto:admin@example.com  # VAPID subject
API_KEY=your-secret-key               # Optional: for API authorization
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/push/:userId` | Send to all user devices |
| POST | `/api/push/:userId?subscriptionId=xxx` | Send to specific device |
| DELETE | `/api/push/:userId?subscriptionId=xxx` | Remove a device |
| GET | `/api/subscribe?id=:userId` | List user devices |
| PUT | `/api/subscribe` | Admin: List all subscriptions |

## Requirements

- Node.js 18+
- Native modules: `better-sqlite3` requires compilation
