const STATS = [
  { label: 'Shorts Published',  value: '100+' },
  { label: 'Avg. Video Length', value: '<60s' },
  { label: 'Topics Covered',    value: '6+'   },
  { label: 'New Videos / Week', value: '7+'   },
];

export function StatsBar() {
  return (
    <section
      className="bg-tw-dark border-y border-tw-border py-6"
      aria-label="Channel statistics"
    >
      <ul className="max-w-4xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
        {STATS.map(s => (
          <li key={s.label} className="text-center">
            <div className="text-3xl font-black text-tw-red">{s.value}</div>
            <div className="text-xs text-gray-400 mt-1 uppercase tracking-wide">{s.label}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
