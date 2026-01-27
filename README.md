# Push Notification Service

A self-hosted, multi-device web push notification service built with Next.js, SQLite, and web-push.

![Screenshot](screenshot.png)

## Features

- **Multi-Device Support**: One user can register multiple devices
- **Device Management**: View, copy push URLs, and remove devices
- **Easy Sharing**: URL automatically includes user ID for easy device sync
- **Modern UI**: Clean, responsive interface
- **Self-Hosted**: Complete control over your notification infrastructure

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/cupkappu/notification-service.git
cd notification-service
npm install
```

### 2. Generate VAPID Keys

```bash
npm run generate-vapid
```

This creates `lib/vapid.js` with your public/private key pair.

### 3. Configure Environment

Update `.env.local` with your info:

```env
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
SUBJECT=mailto:you@example.com
# API_KEY=your-secret-key  # optional
```

### 4. Run

```bash
npm run dev
```

Visit `http://localhost:3000` and enable notifications.

## Usage

### Register a Device

1. Open the page
2. Click "Enable Notifications"
3. Allow browser permissions

The page URL now includes your user ID: `http://localhost:3000/?id=YOUR_UUID`

Share this URL across your devices to subscribe all of them to the same user.

### Send a Push Notification

```bash
curl -X POST "http://localhost:3000/api/push/YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -d '{"title": "Hello!", "body": "This is a test notification"}'
```

### API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/push/:userId` | Send to all user devices |
| POST | `/api/push/:userId?subscriptionId=xxx` | Send to specific device |
| DELETE | `/api/push/:userId?subscriptionId=xxx` | Remove a device |
| GET | `/api/subscribe?id=:userId` | List user devices |
| PUT | `/api/subscribe` | Admin: List all subscriptions |

With API key:

```bash
curl -X POST "http://localhost:3000/api/push/YOUR_USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-key" \
  -d '{"title": "Hello!"}'
```

## Deploy

### Vercel (Recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/cupkappu/notification-service)

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Other Platforms

Build and deploy the Next.js app to your preferred hosting:

```bash
npm run build
# Deploy .next/ and public/ to your host
```

## License

MIT
