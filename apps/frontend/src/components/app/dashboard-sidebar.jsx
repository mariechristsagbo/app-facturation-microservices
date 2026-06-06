import { NavLink, useLocation } from 'react-router-dom';
import { APP_ICON, FRONTEND_SERVICES, SERVICE_ICONS, SERVICE_ROUTES } from '@/app/module-config.js';
import { AppIcon } from '@/components/app/app-icon.jsx';
import { Badge } from '@/components/ui/badge';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator
} from '@/components/ui/sidebar';

export function DashboardSidebar({ rowsByService }) {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="px-3 py-4">
        <div className="flex min-h-12 items-center gap-3 rounded-lg bg-sidebar-accent px-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-teal-700 text-white">
            <AppIcon icon={APP_ICON} size={16} />
          </div>
          <div className="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-black text-sidebar-foreground">Billizy</span>
            <span className="truncate text-xs font-medium text-sidebar-foreground/60">Gestion commerciale</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {FRONTEND_SERVICES.map((service) => {
                const Icon = SERVICE_ICONS[service.key];
                const route = SERVICE_ROUTES[service.key];
                const isActive = location.pathname === route;

                return (
                  <SidebarMenuItem key={service.key}>
                    <SidebarMenuButton asChild className="min-h-10" isActive={isActive} tooltip={service.label}>
                      <NavLink to={route}>
                        <AppIcon icon={Icon} size={16} />
                        <span>{service.label}</span>
                        <Badge className="ml-auto group-data-[collapsible=icon]:hidden" variant={isActive ? 'default' : 'secondary'}>
                          {rowsByService[service.key]?.length ?? '-'}
                        </Badge>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
