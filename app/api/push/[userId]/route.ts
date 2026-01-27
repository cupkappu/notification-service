import { NextRequest, NextResponse } from 'next/server';
import { webPush } from '@/lib/web-push';
import { getUserSubscriptions, getSubscription, removeSubscription } from '@/lib/store';

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  data?: any;
}

async function sendPushToSubscription(subscription: any, payload: string): Promise<{ success: boolean; error?: string }> {
  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      payload
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // Check API key authorization (optional)
  const authHeader = request.headers.get('authorization');
  const apiKey = process.env.API_KEY;

  if (apiKey && apiKey.length > 0) {
    const token = authHeader?.replace('Bearer ', '');
    if (token !== apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const searchParams = request.nextUrl.searchParams;
  const subscriptionId = searchParams.get('subscriptionId');

  try {
    const body: PushPayload = await request.json();
    const { title = 'Notification', body: message = '', icon = '/icon.png', data } = body;

    const payload = JSON.stringify({
      title,
      body: message,
      icon,
      data,
      timestamp: Date.now(),
    });

    // If specific subscriptionId provided, send to that device only
    if (subscriptionId) {
      const subscription = getSubscription(subscriptionId);
      if (!subscription) {
        return NextResponse.json(
          { error: 'Subscription not found' },
          { status: 404 }
        );
      }

      const result = await sendPushToSubscription(subscription, payload);
      if (result.success) {
        return NextResponse.json({ success: true, message: 'Notification sent to device' });
      } else {
        // If subscription expired, remove it
        if (result.error?.includes('410') || result.error?.includes('404')) {
          removeSubscription(subscriptionId);
        }
        return NextResponse.json(
          { error: 'Failed to send notification', details: result.error },
          { status: 500 }
        );
      }
    }

    // Send to all devices for this user
    const subscriptions = getUserSubscriptions(userId);
    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No subscriptions found for this user' },
        { status: 404 }
      );
    }

    const results = await Promise.all(
      subscriptions.map((sub) => sendPushToSubscription(sub, payload))
    );

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // Remove expired subscriptions
    const failedSubIds = subscriptions
      .filter((_, index) => !results[index].success)
      .map((s) => s.subscription_id);

    failedSubIds.forEach((id) => removeSubscription(id));

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${successCount} of ${subscriptions.length} devices`,
      successCount,
      failedCount,
      removedExpired: failedSubIds.length,
    });
  } catch (error) {
    console.error('Push error:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  const searchParams = request.nextUrl.searchParams;
  const subscriptionId = searchParams.get('subscriptionId');

  if (subscriptionId) {
    // Delete specific subscription
    const removed = removeSubscription(subscriptionId);
    if (removed) {
      return NextResponse.json({ success: true, message: 'Device subscription removed' });
    } else {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }
  }

  // Legacy: delete all subscriptions for user
  const subscriptions = getUserSubscriptions(userId);
  if (subscriptions.length === 0) {
    return NextResponse.json(
      { error: 'No subscriptions found for this user' },
      { status: 404 }
    );
  }

  subscriptions.forEach((sub) => removeSubscription(sub.subscription_id));

  return NextResponse.json({
    success: true,
    message: `Removed ${subscriptions.length} device(s) for user`,
  });
}
