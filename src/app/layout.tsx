import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCompanySettingsSafe } from "@/lib/company/settings";
import { BrandStyle } from "@/components/branding/BrandStyle";
import { ThemeProvider } from "@/components/branding/ThemeProvider";

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
  const company = await getCompanySettingsSafe();
  return {
    title: `${company.companyName} — Attendance`,
    description: `${company.companyName} digital office attendance system`,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const company = await getCompanySettingsSafe();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <BrandStyle
          primaryColor={company.primaryColor}
          secondaryColor={company.secondaryColor}
          accentColor={company.accentColor}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
