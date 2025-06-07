import type { Metadata } from "next";

import "./globals.css";
import { BookingProvider } from "./lib/context";
import QueryProvider from "./lib/query-provider";
import { EventProvider } from "./context/EventContext";
import { UserProvider } from "./context/UserContext";
import { ToastProvider } from './context/ToastContext';




export const metadata: Metadata = {
  title: "OFFMENU - Event Booking Platform",
  description: "Find and book the perfect venue for your event",
  icons: {
    icon: [
      {
        url: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    apple: {
      url: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={`antialiased`}
      >
        <QueryProvider>
          <UserProvider>
            <ToastProvider>
              <BookingProvider>
                <EventProvider>
                  {children}
                </EventProvider>
              </BookingProvider>
            </ToastProvider>
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
