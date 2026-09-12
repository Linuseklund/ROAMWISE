import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  // The installed renderer omits viewportFit. Emit the complete tag below.
  width: undefined, initialScale: undefined, themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Roamwise — Din personliga stadsguide",
  description: "Personliga stadsrutter för restauranger, butiker, museum, utställningar, konserter och nattliv.",
  openGraph: { title: "Roamwise — Din personliga stadsguide", description: "Din stad. Din tid. Din rutt.", type: "website", images: ["https://roamwise-guide.eklund-linus.chatgpt.site/og.png"] },
  twitter: { card: "summary_large_image", title: "Roamwise — Din personliga stadsguide", description: "Din stad. Din tid. Din rutt.", images: ["https://roamwise-guide.eklund-linus.chatgpt.site/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="sv"><head><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"/></head><body>{children}</body></html> }
