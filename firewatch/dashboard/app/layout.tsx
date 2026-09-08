import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Disaster Watch | Multi-Hazard Sensing Network',
  description: 'Real-time telemetry, edge QC diagnostics, and multi-hazard response for Fire, Gas Leak, Flood, and Landslide mesh networks',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="min-h-screen bg-[#090d16] text-slate-100 antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
