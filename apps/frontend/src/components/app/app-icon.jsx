import { HugeiconsIcon } from '@hugeicons/react';

export function AppIcon({ icon, size = 16, className = '' }) {
  return <HugeiconsIcon aria-hidden="true" className={className} icon={icon} size={size} strokeWidth={2} />;
}
