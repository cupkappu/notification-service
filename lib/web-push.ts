// Server-only web-push configuration
// This file is only used in API routes (server-side)
import webPush from 'web-push';

if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_EMAIL) {
  console.warn('Warning: VAPID keys not configured. Run `npm run generate-vapid`');
}

webPush.setVapidDetails(
  process.env.VAPID_EMAIL || 'mailto:admin@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

export { webPush };

