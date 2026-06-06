import { ChevronDownIcon, Logout01Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '@/components/app/app-icon.jsx';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export function UserMenu({ me }) {
  const user = me?.authenticated ? me.user : null;
  const sessionLabel = user?.name || user?.username || user?.email || 'Session locale';
  const sessionDetail = user?.email || user?.username || 'Mode local';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Menu utilisateur" className="h-auto max-w-[18rem] gap-3 rounded-full px-2 py-1.5" type="button" variant="ghost">
          <Avatar className="size-10 bg-violet-100 text-violet-700" size="lg">
            <AvatarFallback className="bg-violet-100 text-xs font-semibold uppercase text-violet-700">
              {initialsFor(sessionLabel)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 text-left sm:grid">
            <span className="truncate text-sm font-semibold leading-5 text-zinc-700">{sessionLabel}</span>
            <span className="truncate text-xs font-medium leading-4 text-zinc-500">{sessionDetail}</span>
          </span>
          <AppIcon className="hidden shrink-0 text-zinc-400 sm:block" icon={ChevronDownIcon} size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64 rounded-xl p-2">
        <DropdownMenuLabel className="grid gap-0.5 px-2 py-2 text-left">
          <span className="truncate text-sm font-semibold text-zinc-800">{sessionLabel}</span>
          <span className="truncate text-xs font-medium text-zinc-500">{sessionDetail}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild variant="destructive">
          <a href="/auth/logout">
            <AppIcon icon={Logout01Icon} size={15} />
            Se déconnecter
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function initialsFor(value) {
  const initials = String(value || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return (initials || 'A').toUpperCase();
}
