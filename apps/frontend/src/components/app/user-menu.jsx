import { Logout01Icon } from '@hugeicons/core-free-icons';
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
  const sessionDetail = user?.email || user?.username || 'Protégé par Authelia en mode Docker';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Menu utilisateur" className="size-10 rounded-full p-0" size="icon-lg" type="button" variant="ghost">
          <Avatar className="bg-teal-700 text-white" size="lg">
            <AvatarFallback className="bg-teal-700 text-xs font-bold uppercase text-white">
              {initialsFor(sessionLabel)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuLabel className="grid gap-0.5 px-2 py-1.5 text-left">
          <span className="truncate text-sm font-semibold text-zinc-950">{sessionLabel}</span>
          <span className="truncate text-xs font-medium text-zinc-500">{sessionDetail}</span>
        </DropdownMenuLabel>
        {me?.authenticated ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="/auth/logout">
                <AppIcon icon={Logout01Icon} size={14} />
                Se déconnecter
              </a>
            </DropdownMenuItem>
          </>
        ) : null}
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
