import Link from 'next/link';

const CATS = [
  { href: '/?category=ai-tech',    label: '🤖 AI & Tech' },
  { href: '/?category=business',   label: '💼 Business' },
  { href: '/?category=world',      label: '🌍 World' },
  { href: '/?category=science',    label: '🔬 Science' },
  { href: '/?category=social',     label: '📱 Social Media' },
  { href: '/?category=innovation', label: '🚀 Innovation' },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-tw-dark border-t border-tw-border" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Brand */}
        <div>
          <Link href="/" className="text-2xl font-black text-white">
            TRENDING<span className="text-tw-red"> WIRES</span>
          </Link>
          <p className="text-gray-400 text-sm mt-3 leading-relaxed max-w-xs">
            Bite-sized videos covering the world&apos;s most trending stories — AI, tech,
            business, science, world events and viral moments in under 60 seconds.
          </p>
          <div className="flex gap-3 mt-4">
            <a href="https://www.youtube.com/@trendingwires" target="_blank" rel="noopener noreferrer"
              aria-label="YouTube" className="text-gray-500 hover:text-tw-red transition-colors">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M23.5 6.2s-.2-1.6-.9-2.3c-.9-.9-1.8-.9-2.3-1C17.6 2.7 12 2.7 12 2.7s-5.6 0-8.3.2c-.5.1-1.5.1-2.3 1-.7.7-.9 2.3-.9 2.3S.3 8 .3 9.8v1.7c0 1.8.2 3.6.2 3.6s.2 1.6.9 2.3c.9.9 2 .9 2.5 1 1.8.2 7.7.2 7.7.2s5.6 0 8.3-.2c.5-.1 1.5-.1 2.3-1 .7-.7.9-2.3.9-2.3s.2-1.8.2-3.6V9.8c0-1.8-.2-3.6-.2-3.6zM9.7 15.5V8.1l6.6 3.7-6.6 3.7z"/></svg>
            </a>
            <a href="https://instagram.com/trending_wires" target="_blank" rel="noopener noreferrer"
              aria-label="Instagram" className="text-gray-500 hover:text-pink-500 transition-colors">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="https://x.com/trending_wires" target="_blank" rel="noopener noreferrer"
              aria-label="X (Twitter)" className="text-gray-500 hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h3 className="font-bold text-white mb-4">Categories</h3>
          <ul className="space-y-2">
            {CATS.map(c => (
              <li key={c.href}>
                <Link href={c.href} className="text-gray-400 hover:text-white text-sm transition-colors">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="font-bold text-white mb-4">Contact</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>
              <a href="mailto:contact@trendingwires.com"
                className="hover:text-white transition-colors">
                📧 contact@trendingwires.com
              </a>
            </li>
            <li>
              <a href="https://trendingwires.com"
                className="hover:text-white transition-colors">
                🌐 trendingwires.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-tw-border py-4 px-4 text-center">
        <p className="text-gray-600 text-xs">
          © {year} TrendingWires. All rights reserved. &nbsp;|&nbsp;
          <span className="text-gray-500">AI • Tech • Business • Science • World • Innovation</span>
        </p>
      </div>
    </footer>
  );
}
