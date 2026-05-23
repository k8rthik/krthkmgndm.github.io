import { Analytics } from "@vercel/analytics/react";
import ThemeToggle from "../components/ThemeToggle";
import "./globals.css";

export const metadata = {
  title: "keerthik.dev",
};

const themeScript = `(function(){try{var s=localStorage.getItem('theme');var t=s||(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeToggle />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
