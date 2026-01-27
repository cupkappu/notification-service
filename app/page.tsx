'use client';

import { useState, useEffect } from 'react';
import { VAPID_PUBLIC_KEY } from '@/lib/vapid';

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface DeviceSubscription {
  subscriptionId: string;
  deviceName: string | null;
  createdAt: string;
  pushUrl: string;
}

interface ApiResponse {
  hasSubscription: boolean;
  subscriptions: DeviceSubscription[];
}

export default function Home() {
  const [userId, setUserId] = useState<string>('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [devices, setDevices] = useState<DeviceSubscription[]>([]);
  const [notificationStatus, setNotificationStatus] = useState<string>('');
  const [pushTitle, setPushTitle] = useState('Test Notification');
  const [pushBody, setPushBody] = useState('Hello from Push Notification Service!');
  const [pushStatus, setPushStatus] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [editingId, setEditingId] = useState(false);
  const [userIdInput, setUserIdInput] = useState('');

  useEffect(() => {
    // Check URL for userId first
    const urlParams = new URLSearchParams(window.location.search);
    let initialUserId = urlParams.get('id');

    if (initialUserId) {
      // Use ID from URL and save to localStorage
      localStorage.setItem('push_userId', initialUserId);
      setUserId(initialUserId);
      checkSubscriptionStatus(initialUserId);
      setBaseUrl(`${window.location.protocol}//${window.location.host}`);
    } else {
      // Generate or retrieve userId from localStorage
      let storedUserId = localStorage.getItem('push_userId');
      if (!storedUserId) {
        storedUserId = crypto.randomUUID();
        localStorage.setItem('push_userId', storedUserId);
      }
      setUserId(storedUserId);
      setBaseUrl(`${window.location.protocol}//${window.location.host}`);

      // Update URL with userId for easy sharing
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('id', storedUserId);
      window.history.replaceState({}, '', newUrl.toString());

      checkSubscriptionStatus(storedUserId);
    }

    // Get device name from user agent
    const ua = navigator.userAgent;
    let defaultName = 'Device';
    if (ua.includes('Chrome')) defaultName = 'Chrome';
    else if (ua.includes('Firefox')) defaultName = 'Firefox';
    else if (ua.includes('Safari')) defaultName = 'Safari';
    if (ua.includes('Mac')) defaultName += ' (Mac)';
    else if (ua.includes('Windows')) defaultName += ' (Windows)';
    else if (ua.includes('Linux')) defaultName += ' (Linux)';
    else if (ua.includes('Android')) defaultName += ' (Android)';
    else if (ua.includes('iOS')) defaultName += ' (iOS)';
    setDeviceName(defaultName);
  }, []);

  const checkSubscriptionStatus = async (id: string) => {
    try {
      const response = await fetch(`/api/subscribe?id=${id}`);
      if (response.ok) {
        const data: ApiResponse = await response.json();
        setIsSubscribed(data.hasSubscription);
        setDevices(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
    }
  };

  const subscribe = async () => {
    setNotificationStatus('requesting');

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setNotificationStatus('denied');
        return;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });

      // Convert subscription to plain object
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.toJSON().keys?.p256dh || '',
          auth: subscription.toJSON().keys?.auth || '',
        },
      };

      // Send subscription to server
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          subscription: subscriptionData,
          deviceName,
        }),
      });

      if (response.ok) {
        setNotificationStatus('success');
        checkSubscriptionStatus(userId);
      } else {
        setNotificationStatus('error');
      }
    } catch (error) {
      console.error('Subscription failed:', error);
      setNotificationStatus('error');
    }
  };

  const unsubscribe = async (subscriptionId?: string) => {
    try {
      const url = subscriptionId
        ? `/api/push/${userId}?subscriptionId=${subscriptionId}`
        : `/api/push/${userId}`;

      const response = await fetch(url, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotificationStatus('unsubscribed');
        checkSubscriptionStatus(userId);
      }
    } catch (error) {
      console.error('Unsubscription failed:', error);
    }
  };

  const copyToClipboard = (text: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const saveUserId = () => {
    if (userIdInput.trim()) {
      localStorage.setItem('push_userId', userIdInput.trim());
      setUserId(userIdInput.trim());
      setEditingId(false);
      setIsSubscribed(false);
      setDevices([]);

      // Update URL with new userId
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('id', userIdInput.trim());
      window.history.replaceState({}, '', newUrl.toString());

      checkSubscriptionStatus(userIdInput.trim());
    }
  };

  const sendPush = async () => {
    setPushStatus('sending');
    try {
      const pushUrl = `/api/push/${userId}`;
      const response = await fetch(pushUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pushTitle,
          body: pushBody,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setPushStatus(`success: ${data.message}`);
      } else {
        setPushStatus(`error: ${data.error}`);
      }
    } catch (error) {
      setPushStatus('error: Failed to send');
    }
    setTimeout(() => setPushStatus(''), 3000);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.3s ease-out; }
      `}</style>

      <header style={styles.header}>
        <h1 style={styles.title}>Push Notification Service</h1>
        <p style={styles.subtitle}>Multi-device push notifications management</p>
      </header>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📱</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{devices.length}</span>
            <span style={styles.statLabel}>Registered Devices</span>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>👤</div>
          <div style={styles.statInfo}>
            <span style={styles.statValue}>{userId.slice(0, 8)}...</span>
            <span style={styles.statLabel}>Your User ID</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={styles.mainGrid}>
        {/* Left Column - Subscription */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>
            {isSubscribed ? '✅ Subscribed' : '🔔 Enable Notifications'}
          </h2>

          <div style={styles.userIdSection}>
            <div style={styles.userIdHeader}>
              <span style={styles.label}>User ID</span>
              <button
                onClick={() => {
                  setUserIdInput(userId);
                  setEditingId(true);
                }}
                style={styles.editButton}
              >
                Edit
              </button>
            </div>
            {editingId ? (
              <div style={styles.editIdForm}>
                <input
                  type="text"
                  value={userIdInput}
                  onChange={(e) => setUserIdInput(e.target.value)}
                  style={{...styles.input, padding: '0.5rem', fontSize: '0.85rem', flex: 1}}
                  placeholder="Enter User ID"
                  onKeyDown={(e) => e.key === 'Enter' && saveUserId()}
                />
                <button
                  onClick={saveUserId}
                  style={{...styles.button, ...styles.buttonPrimary}}
                >
                  Save
                </button>
              </div>
            ) : (
              <div style={styles.userIdDisplay}>
                <code style={styles.code}>{userId}</code>
              </div>
            )}
          </div>

          {!isSubscribed ? (
            <div style={styles.subscribeSection}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Device Name</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  style={styles.input}
                  placeholder="Enter device name"
                />
              </div>
              <button
                onClick={subscribe}
                disabled={notificationStatus === 'requesting'}
                style={{
                  ...styles.button,
                  ...styles.buttonPrimary,
                  opacity: notificationStatus === 'requesting' ? 0.7 : 1,
                  cursor: notificationStatus === 'requesting' ? 'not-allowed' : 'pointer',
                }}
              >
                {notificationStatus === 'requesting' ? 'Requesting...' : 'Enable Notifications'}
              </button>
            </div>
          ) : (
            <div style={styles.deviceList}>
              <h3 style={styles.sectionTitle}>Your Devices</h3>
              {devices.map((device) => (
                <div key={device.subscriptionId} style={styles.deviceItem} className="fade-in">
                  <div style={styles.deviceHeader}>
                    <span style={styles.deviceIcon}>💻</span>
                    <span style={styles.deviceName}>{device.deviceName || 'Unknown Device'}</span>
                  </div>
                  <div style={styles.deviceMeta}>
                    Registered: {formatDate(device.createdAt)}
                  </div>
                  <div style={styles.deviceActions}>
                    <button
                      onClick={() => copyToClipboard(device.subscriptionId, device.pushUrl)}
                      style={{...styles.actionButton, ...styles.buttonCopy}}
                    >
                      {copiedUrl === device.subscriptionId ? '✓ Copied!' : 'Copy URL'}
                    </button>
                    <button
                      onClick={() => unsubscribe(device.subscriptionId)}
                      style={{...styles.actionButton, ...styles.buttonDanger}}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={subscribe}
                style={{...styles.button, ...styles.buttonSecondary, marginTop: '1rem'}}
              >
                + Add Another Device
              </button>
            </div>
          )}

          {notificationStatus === 'denied' && (
            <div style={styles.alert}>
              ⚠️ Notification permission denied. Please enable it in your browser settings.
            </div>
          )}
          {notificationStatus === 'error' && (
            <div style={styles.alert}>
              ❌ Failed to subscribe. Please try again.
            </div>
          )}
          {notificationStatus === 'unsubscribed' && (
            <div style={{...styles.alert, ...styles.alertSuccess}}>
              ✓ Successfully unsubscribed.
            </div>
          )}
        </div>

        {/* Right Column - Push Test */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📨 Test Push</h2>
          <p style={styles.cardSubtitle}>Send a test notification to all your devices</p>

          <div style={styles.formGroup}>
            <label style={styles.label}>Title</label>
            <input
              type="text"
              value={pushTitle}
              onChange={(e) => setPushTitle(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Message</label>
            <textarea
              value={pushBody}
              onChange={(e) => setPushBody(e.target.value)}
              style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
            />
          </div>

          <button
            onClick={sendPush}
            disabled={!isSubscribed || pushStatus === 'sending'}
            style={{
              ...styles.button,
              ...styles.buttonPrimary,
              width: '100%',
              opacity: !isSubscribed || pushStatus === 'sending' ? 0.6 : 1,
            }}
          >
            {pushStatus === 'sending' ? 'Sending...' : 'Send to All Devices'}
          </button>

          {pushStatus && (
            <div style={{
              ...styles.alert,
              background: pushStatus.startsWith('success') ? '#e8f5e9' : '#ffebee',
              color: pushStatus.startsWith('success') ? '#2e7d32' : '#c62828',
            }}>
              {pushStatus.startsWith('success') ? '✓ ' : '❌ '}
              {pushStatus.replace(/^(success|error): /, '')}
            </div>
          )}
        </div>
      </div>

      {/* API Examples */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🔧 API Examples</h2>
        <div style={styles.codeBlock}>
{`# Send notification to all your devices
curl -X POST "${baseUrl}/api/push/${userId}" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Hello!", "body": "This is a test notification"}'

# Send to specific device
curl -X POST "${baseUrl}/api/push/${userId}?subscriptionId=YOUR_SUBSCRIPTION_ID" \\
  -H "Content-Type: application/json" \\
  -d '{"title": "Hello!", "body": "This is a test notification"}'

# With API key (if configured)
curl -X POST "${baseUrl}/api/push/${userId}" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-secret-key-here" \\
  -d '{"title": "Hello!", "body": "This is a test notification"}'

# Remove a device
curl -X DELETE "${baseUrl}/api/push/${userId}?subscriptionId=YOUR_SUBSCRIPTION_ID"

# List all your devices
curl "${baseUrl}/api/subscribe?id=${userId}"

# Admin: List all subscriptions
curl -X PUT "${baseUrl}/api/subscribe"`}
        </div>
      </div>
    </div>
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray as Uint8Array;
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '2rem',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  title: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#fff',
    margin: '0 0 0.5rem 0',
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  subtitle: {
    fontSize: '1.1rem',
    color: 'rgba(255,255,255,0.85)',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    background: 'rgba(255,255,255,0.95)',
    padding: '1.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  statIcon: {
    fontSize: '2rem',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  statValue: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#333',
  },
  statLabel: {
    fontSize: '0.875rem',
    color: '#666',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
  card: {
    background: 'rgba(255,255,255,0.95)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
  },
  cardTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 1rem 0',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  cardSubtitle: {
    fontSize: '0.875rem',
    color: '#666',
    margin: '-0.5rem 0 1rem 0',
  },
  userIdSection: {
    background: '#f5f5f5',
    padding: '0.75rem 1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  userIdHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem',
  },
  editButton: {
    padding: '0.25rem 0.5rem',
    fontSize: '0.75rem',
    background: '#e0e0e0',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    color: '#666',
  },
  editIdForm: {
    display: 'flex',
    gap: '0.5rem',
  },
  userIdDisplay: {
    padding: '0.25rem 0',
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#555',
    marginBottom: '0.5rem',
  },
  code: {
    fontSize: '0.8rem',
    color: '#333',
    wordBreak: 'break-all',
  },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '1rem',
    boxSizing: 'border-box',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  subscribeSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  button: {
    padding: '0.875rem 1.5rem',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonPrimary: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#fff',
  },
  buttonSecondary: {
    background: '#f0f0f0',
    color: '#333',
  },
  deviceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  sectionTitle: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 0.75rem 0',
  },
  deviceItem: {
    background: '#f8f9fa',
    borderRadius: '10px',
    padding: '1rem',
    border: '1px solid #eee',
  },
  deviceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '0.25rem',
  },
  deviceIcon: {
    fontSize: '1.25rem',
  },
  deviceName: {
    fontWeight: '600',
    color: '#333',
  },
  deviceMeta: {
    fontSize: '0.8rem',
    color: '#888',
    marginBottom: '0.75rem',
  },
  deviceActions: {
    display: 'flex',
    gap: '0.5rem',
  },
  actionButton: {
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    fontSize: '0.8rem',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonCopy: {
    background: '#e3f2fd',
    color: '#1976d2',
  },
  buttonDanger: {
    background: '#ffebee',
    color: '#c62828',
  },
  formGroup: {
    marginBottom: '1rem',
  },
  alert: {
    marginTop: '1rem',
    padding: '0.875rem 1rem',
    borderRadius: '8px',
    fontSize: '0.875rem',
    background: '#fff3e0',
    color: '#e65100',
  },
  alertSuccess: {
    background: '#e8f5e9',
    color: '#2e7d32',
  },
  codeBlock: {
    background: '#1e1e1e',
    color: '#d4d4d4',
    padding: '1.25rem',
    borderRadius: '10px',
    overflow: 'auto',
    fontSize: '0.85rem',
    lineHeight: '1.6',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
};
