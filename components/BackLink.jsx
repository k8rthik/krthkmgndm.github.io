import Link from "next/link";

// the "← back home" footer link every inner page ends with
export default function BackLink({ href = "/", children = "back home" }) {
  return (
    <Link href={href} className="back">
      ← {children}
    </Link>
  );
}
