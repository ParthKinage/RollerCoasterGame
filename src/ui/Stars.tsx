import { Star } from 'lucide-react';

export function StarRow({ count, max = 3, size = 18 }: { count: number; max?: number; size?: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }, (_, i) => (
        <Star key={i} size={size} className={i < count ? 'fill-yellow-400 text-yellow-400 drop-shadow' : 'fill-slate-600/60 text-slate-500'} />
      ))}
    </div>
  );
}
