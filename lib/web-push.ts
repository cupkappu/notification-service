// Server-only web-push configuration
// This file is only used in API routes (server-side)
import webPush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const email = process.env.VAPID_EMAIL;

if (!publicKey || !privateKey || !email) {
  console.warn('Warning: VAPID keys not configured. Run `npm run generate-vapid`');
} else {
  webPush.setVapidDetails(email, publicKey, privateKey);
}

export { webPush };

