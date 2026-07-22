import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { baseMetadata, homeJsonLd } from '@/lib/seo';
import { Navbar } from '@/components/sections/Navbar';
import { Footer } from '@/components/sections/Footer';

export const metadata: Metadata = baseMetadata;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect for YouTube thumbnails */}
        <link rel="preconnect" href="https://img.youtube.com" />
        <link rel="preconnect" href="https://i.ytimg.com" />
        {/* Favicon */}
        <link rel="icon"             href="/favicon.ico" />
        <link rel="icon"             href="/icon.png"         type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest"         href="/manifest.json" />
        {/* Theme */}
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="color-scheme" content="dark" />
        {/* Geo tags */}
        <meta name="geo.region"   content="IN" />
        <meta name="geo.country"  content="India" />
        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd()) }}
        />
      </head>
      <body className="bg-tw-black text-white antialiased">
        {/* Google Analytics — replace GA_ID */}
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`}
            </Script>
          </>
        )}
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
