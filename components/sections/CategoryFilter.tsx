'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { cn } from '@/lib/utils';

const CATS = [
  { id: 'all',        label: '🔥 All' },
  { id: 'ai-tech',    label: '🤖 AI & Tech' },
  { id: 'business',   label: '💼 Business' },
  { id: 'world',      label: '🌍 World' },
  { id: 'science',    label: '🔬 Science' },
  { id: 'social',     label: '📱 Social' },
  { id: 'innovation', label: '🚀 Innovation' },
];

function Filters() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const active       = searchParams.get('category') || 'all';

  const select = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === 'all') params.delete('category');
    else params.set('category', id);
    router.push(`/?${params.toString()}#videos`, { scroll: false });
  };

  return (
    <nav aria-label="Video category filter" className="mb-8">
      <ul className="flex flex-wrap gap-2">
        {CATS.map(c => (
          <li key={c.id}>
            <button
              onClick={() => select(c.id)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200',
                active === c.id
                  ? 'bg-tw-red border-tw-red text-white'
                  : 'border-tw-border text-gray-400 hover:border-tw-red hover:text-white bg-tw-card',
              )}
              aria-pressed={active === c.id}
              aria-label={`Filter by ${c.label}`}
            >
              {c.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function CategoryFilter() {
  return (
    <Suspense fallback={null}>
      <Filters />
    </Suspense>
  );
}
