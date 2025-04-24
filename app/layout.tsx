import type { Metadata } from "next";
import { Playfair_Display, Heebo } from "next/font/google";
import "./globals.css";
import { BookingProvider } from "./lib/context";
import QueryProvider from "./lib/query-provider";
import { EventProvider } from "./context/EventContext";
import { UserProvider } from "./context/UserContext";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const heebo = Heebo({
  variable: "--font-heebo",
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
        className={`${playfairDisplay.variable} ${heebo.variable} antialiased`}
      >
        <QueryProvider>
          <UserProvider>
            <BookingProvider>
              <EventProvider>
                {children}
              </EventProvider>
            </BookingProvider>
          </UserProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
