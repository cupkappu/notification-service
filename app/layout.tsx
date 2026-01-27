import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Push Notification Service',
  description: 'Browser push notification service with Next.js',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
