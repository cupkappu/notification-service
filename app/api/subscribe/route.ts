import { NextRequest, NextResponse } from 'next/server';
import { addSubscription, getUserSubscriptions, getAllSubscriptions, getSubscriptionCount, getUserCount } from '@/lib/store';

interface SubscribeRequest {
  userId: string;
  subscription: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
  deviceName?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('id');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const subscriptions = getUserSubscriptions(userId);
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';

  return NextResponse.json({
    hasSubscription: subscriptions.length > 0,
    subscriptions: subscriptions.map((sub) => ({
      subscriptionId: sub.subscription_id,
      deviceName: sub.deviceName,
      createdAt: sub.createdAt,
      pushUrl: `${protocol}://${host}/api/push/${userId}?subscriptionId=${sub.subscription_id}`,
    })),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body: SubscribeRequest = await request.json();
    const { userId, subscription, deviceName } = body;

    if (!userId || !subscription) {
      return NextResponse.json(
        { error: 'userId and subscription are required' },
        { status: 400 }
      );
    }

    const subscriptionId = addSubscription(userId, subscription, deviceName);

    return NextResponse.json({
      success: true,
      subscriptionId,
      message: 'Device registered successfully',
    });
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}

// Debug endpoint to list all subscriptions
export async function PUT() {
  const allSubs = getAllSubscriptions();
  const deviceCount = getSubscriptionCount();
  const userCount = getUserCount();

  return NextResponse.json({
    totalDevices: deviceCount,
    totalUsers: userCount,
    subscriptions: allSubs.map((s: any) => ({
      subscriptionId: s.subscription_id,
      userId: s.userId,
      deviceName: s.deviceName,
      createdAt: s.createdAt,
    })),
  });
}
