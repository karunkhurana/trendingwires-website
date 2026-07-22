import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — TrendingWires',
  robots: { index: false, follow: false }, // never index admin
};

export default function AdminPage() {
  return <AdminPanel />;
}

// Server component shell — client panel below
import { AdminPanel } from '@/components/admin/AdminPanel';
