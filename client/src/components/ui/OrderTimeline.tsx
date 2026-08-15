import { Check, Clock, Package, Truck, X, RotateCcw } from 'lucide-react';
import type { StatusEntry } from '../../types';

const icons: Record<string, typeof Check> = {
  pending: Clock, confirmed: Check, shipped: Truck,
  delivered: Package, cancelled: X, returned: RotateCcw,
};

const stepMeta: Record<string, { label: string; color: string; darkColor: string }> = {
  pending: { label: 'Pending', color: 'text-amber-500 border-amber-500 bg-amber-50', darkColor: 'dark:border-amber-400 dark:text-amber-400 dark:bg-amber-900/30' },
  confirmed: { label: 'Confirmed', color: 'text-blue-500 border-blue-500 bg-blue-50', darkColor: 'dark:border-blue-400 dark:text-blue-400 dark:bg-blue-900/30' },
  shipped: { label: 'Shipped', color: 'text-indigo-500 border-indigo-500 bg-indigo-50', darkColor: 'dark:border-indigo-400 dark:text-indigo-400 dark:bg-indigo-900/30' },
  delivered: { label: 'Delivered', color: 'text-green-500 border-green-500 bg-green-50', darkColor: 'dark:border-green-400 dark:text-green-400 dark:bg-green-900/30' },
  cancelled: { label: 'Cancelled', color: 'text-red-500 border-red-500 bg-red-50', darkColor: 'dark:border-red-400 dark:text-red-400 dark:bg-red-900/30' },
  returned: { label: 'Returned', color: 'text-gray-500 border-gray-500 bg-gray-50', darkColor: 'dark:border-gray-400 dark:text-gray-400 dark:bg-gray-800' },
};

function TimelineStep({ status, entry, isLast }: { status: string; entry?: StatusEntry; isLast?: boolean }) {
  const Icon = icons[status] || Check;
  const meta = stepMeta[status];
  const done = !!entry;
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition
          ${done ? `${meta.color} ${meta.darkColor}` : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'}`}>
          <Icon size={14} className={done ? '' : 'text-gray-300 dark:text-gray-500'} />
        </div>
        {!isLast && <div className={`w-0.5 h-full min-h-[2rem] ${done ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-100 dark:bg-gray-800'}`} />}
      </div>
      <div className="pb-4">
        <p className={`text-sm font-medium ${done ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>{meta.label}</p>
        {done && <p className="text-xs text-gray-400 dark:text-gray-500">{new Date(entry.timestamp).toLocaleString()}</p>}
        {entry?.note && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{entry.note}</p>}
      </div>
    </div>
  );
}

export function OrderTimeline({ history }: { history: StatusEntry[] }) {
  if (!history?.length) return null;

  const normalSteps = ['pending', 'confirmed', 'shipped', 'delivered'];
  const terminalEntry = history.find((h) => h.status === 'cancelled' || h.status === 'returned');
  const isTerminal = !!terminalEntry;
  const terminalStatus = terminalEntry?.status || '';
  const hasNormal = normalSteps.some((s) => history.some((h) => h.status === s));

  return (
    <div className="py-2">
      {hasNormal ? (
        <div>
          {normalSteps.map((s, i) => {
            const entry = history.find((h) => h.status === s);
            return <TimelineStep key={s} status={s} entry={entry} isLast={isTerminal && i === normalSteps.length - 1} />;
          })}
        </div>
      ) : null}
      {isTerminal && (
        <TimelineStep status={terminalStatus} entry={terminalEntry} isLast />
      )}
    </div>
  );
}
