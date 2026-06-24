import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Local Listings Assistant",
  description: "Find local restaurants, hotels, activities, and shops — strictly from our curated dataset.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
