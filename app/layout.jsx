import { Analytics } from "@vercel/analytics/react";
import ThemeToggle from "../components/ThemeToggle";
import HomeLink from "../components/HomeLink";
import { BIO, SITE_TITLE, SITE_URL } from "../lib/bio";
import "./globals.css";

// share previews use app/opengraph-image.jsx; X falls back to og:image
export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: BIO,
  openGraph: {
    type: "website",
    siteName: "keerthik.dev",
    title: SITE_TITLE,
    description: BIO,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: BIO,
  },
};

const themeScript = `(function(){try{var s=localStorage.getItem('theme');var t=s||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <HomeLink />
        <ThemeToggle />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
