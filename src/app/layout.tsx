import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCompanySettings } from "@/lib/company/settings";
import { BrandStyle } from "@/components/branding/BrandStyle";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompanySettings();
  return {
    title: `${company.companyName} — Attendance`,
    description: `${company.companyName} digital office attendance system`,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const company = await getCompanySettings();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <BrandStyle
          primaryColor={company.primaryColor}
          secondaryColor={company.secondaryColor}
          accentColor={company.accentColor}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
