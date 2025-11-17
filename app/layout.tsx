import "./globals.css";
import type { Metadata } from "next";
import MainHeader from "./_components/MainHeader";
import HomeHelpTile from "./_components/HomeHelpTile";

export const metadata: Metadata = {
  title: "CoreVista Form Builder",
  description: "No-code multi-page form builder",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <MainHeader />
        {children}
        <HomeHelpTile />
      </body>
    </html>
  );
}