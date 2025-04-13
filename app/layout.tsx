import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BookingProvider } from "./lib/context";
import QueryProvider from "./lib/query-provider";
import { EventProvider } from "./context/EventContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider>
          <BookingProvider>
            <EventProvider>
              {children}
            </EventProvider>
          </BookingProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
