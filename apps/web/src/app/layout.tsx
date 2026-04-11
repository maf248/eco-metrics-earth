import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'eco-metrics earth',
  description: 'Track and visualize environmental metrics for a sustainable planet.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
