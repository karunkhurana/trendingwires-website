'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '/#videos',    label: 'Videos' },
  { href: '/?category=ai-tech',   label: '🤖 AI & Tech' },
  { href: '/?category=business',  label: '💼 Business' },
  { href: '/?category=world',     label: '🌍 World' },
  { href: '/?category=science',   label: '🔬 Science' },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen]         = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-tw-black/95 backdrop-blur-md shadow-[0_2px_20px_rgba(229,9,20,0.15)]' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl font-black tracking-tight">
            <span className="text-white">TRENDING</span>
            <span className="text-tw-red"> WIRES</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-6 text-sm font-semibold">
          {NAV_LINKS.map(l => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Subscribe CTA */}
        <a
          href="https://www.youtube.com/@trendingwires?sub_confirmation=1"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-2 bg-tw-red hover:bg-tw-redHover text-white text-sm font-bold px-4 py-2 rounded-full transition-all duration-300 hover:scale-105"
          aria-label="Subscribe to TrendingWires on YouTube"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden="true">
            <path d="M23.5 6.2s-.2-1.6-.9-2.3c-.9-.9-1.8-.9-2.3-1C17.6 2.7 12 2.7 12 2.7s-5.6 0-8.3.2c-.5.1-1.5.1-2.3 1-.7.7-.9 2.3-.9 2.3S.3 8 .3 9.8v1.7c0 1.8.2 3.6.2 3.6s.2 1.6.9 2.3c.9.9 2 .9 2.5 1 1.8.2 7.7.2 7.7.2s5.6 0 8.3-.2c.5-.1 1.5-.1 2.3-1 .7-.7.9-2.3.9-2.3s.2-1.8.2-3.6V9.8c0-1.8-.2-3.6-.2-3.6zM9.7 15.5V8.1l6.6 3.7-6.6 3.7z"/>
          </svg>
          Subscribe
        </a>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-tw-dark border-t border-tw-border px-4 pb-4">
          <ul className="flex flex-col gap-3 pt-3">
            {NAV_LINKS.map(l => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block text-gray-300 hover:text-white py-1 text-sm font-semibold"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <a
                href="https://www.youtube.com/@trendingwires?sub_confirmation=1"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-red inline-block text-sm mt-2"
              >
                🔔 Subscribe on YouTube
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
