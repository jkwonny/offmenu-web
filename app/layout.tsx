import type { Metadata } from "next";

import "./globals.css";
import { BookingProvider } from "./lib/context";
import QueryProvider from "./lib/query-provider";
import { EventProvider } from "./context/EventContext";
import { UserProvider } from "./context/UserContext";
import { ToastProvider } from './context/ToastContext';




export const metadata: Metadata = {
  title: "OffMenu - Event Booking Platform",
  description: "Find and book the perfect venue for your event",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
