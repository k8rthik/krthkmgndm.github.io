"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// fixed [home] link beside the theme toggle; pointless on the homepage itself
export default function HomeLink() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <Link href="/" className="home-link">
      [home]
    </Link>
  );
}
