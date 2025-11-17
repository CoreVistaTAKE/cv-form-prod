"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function HomeHelpTile() {
  const p = usePathname();
  if (p !== "/") return null;
  return (
    <section style={{ marginTop: 20 }}>
      <Link
        href="/help"
        style={{
          display: "inline-block",
          padding: "10px 14px",
          border: "1px solid var(--border)",
          borderRadius: 8,
        }}
      >
        ヘルプ（使い方）
      </Link>
    </section>
  );
}