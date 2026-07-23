/**
 * Admin layout — overrides the root layout for /admin routes.
 * Removes the public Navbar and Footer so the admin panel
 * renders its own header without duplication.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
