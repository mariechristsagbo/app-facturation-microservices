import { formatJson } from '@/api.js';

export function JsonBlock({ value }) {
  return (
    <pre className="max-h-[520px] min-h-52 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs leading-6 text-zinc-100">
      {formatJson(value)}
    </pre>
  );
}
