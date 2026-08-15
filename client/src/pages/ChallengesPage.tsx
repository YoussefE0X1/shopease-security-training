import { useState, useEffect } from 'react';
import { ShieldAlert, Star } from 'lucide-react';
import api from '../services/api';
import { PageSpinner } from '../components/ui/Spinner';
import type { Challenge } from '../types';

const categoryColors: Record<string, string> = {
  bac: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  logic: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'mass-assignment': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

const typeColors: Record<string, string> = {
  'black-box': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  'white-box': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'grey-box': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

function Stars({ count }: { count: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={12} className={n <= count ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'} />
      ))}
    </span>
  );
}

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    api.get('/challenges')
      .then(({ data }) => setChallenges(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const categories = Array.from(new Set(challenges.map((c) => c.category)));
  const filtered = categoryFilter === 'all'
    ? challenges
    : challenges.filter((c) => c.category === categoryFilter);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert size={28} className="text-indigo-600 dark:text-indigo-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Vulnerability Catalog</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            The intentional flaws shipped in this application: broken access control, business logic bugs and mass assignment. Everything else behaves like hardened production code.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`text-xs px-3 py-1.5 rounded-lg transition ${categoryFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
        >
          all
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategoryFilter(c)}
            className={`text-xs px-3 py-1.5 rounded-lg transition ${categoryFilter === c ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-900 border dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <button
            key={c.key}
            onClick={() => setSelected(c)}
            className="text-left bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-700 p-4 hover:border-indigo-400 dark:hover:border-indigo-500 transition"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryColors[c.category] || 'bg-gray-100 text-gray-600'}`}>{c.category}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColors[c.challengeType] || ''}`}>{c.challengeType}</span>
            </div>
            <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">{c.name}</div>
            <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-mono truncate">{c.endpoint}</div>
            <div className="flex items-center justify-between">
              <Stars count={c.difficulty} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{c.cwe}</span>
            </div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{selected.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryColors[selected.category] || ''}`}>{selected.category}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${typeColors[selected.challengeType] || ''}`}>{selected.challengeType}</span>
                  <Stars count={selected.difficulty} />
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{selected.httpMethod} {selected.endpoint}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">&times;</button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-line">{selected.description}</p>

            {selected.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {selected.tags.map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">{tag}</span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">OWASP</div>
                <div className="text-gray-700 dark:text-gray-200">{selected.owaspCategory || '—'}</div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">CWE</div>
                <div className="text-gray-700 dark:text-gray-200">{selected.cwe || '—'}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}