import { Navbar } from '@/components/sections/Navbar';
import { Footer } from '@/components/sections/Footer';

/**
 * Public layout — wraps all public-facing pages with the site
 * Navbar and Footer. The /admin route lives outside this group
 * and gets no Navbar/Footer.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
