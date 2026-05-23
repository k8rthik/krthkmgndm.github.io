import { Analytics } from "@vercel/analytics/react";
import {
  Cormorant_Garamond,
  Playfair_Display,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata = {
  title: "keerthik.dev",
};

const fontClassNames = [
  cormorant.variable,
  playfair.variable,
  jetbrains.variable,
].join(" ");

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fontClassNames}>
      <body>
        <div className="grain" aria-hidden="true" />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
