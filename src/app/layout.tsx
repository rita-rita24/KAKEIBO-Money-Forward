import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "家計簿作成ツール",
  description: "家計簿のレイアウトを作成して印刷できるツール",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
