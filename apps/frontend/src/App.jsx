import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { DEFAULT_ROUTE, FRONTEND_SERVICES, SERVICE_ROUTES, SERVICES_BY_ROUTE } from '@/app/module-config.js';
import { DashboardSidebar } from '@/components/app/dashboard-sidebar.jsx';
import { UserMenu } from '@/components/app/user-menu.jsx';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';
import { ApiResponseDialog } from '@/features/modules/module-dialogs.jsx';
import { ModulePage } from '@/features/modules/module-page.jsx';
import { useModuleData } from '@/features/modules/use-module-data.js';
import './styles.css';

export default function App() {
  const location = useLocation();
  const {
    me,
    rowsByService,
    busy,
    responseDialog,
    setResponseDialog,
    fetchList,
    viewRecord,
    createRecord,
    editRecord,
    deleteRecord
  } = useModuleData();
  const activeService = SERVICES_BY_ROUTE[location.pathname] || FRONTEND_SERVICES[0];

  return (
    <SidebarProvider>
      <DashboardSidebar rowsByService={rowsByService} />

      <SidebarInset className="bg-zinc-50">
        <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 text-zinc-950 md:px-6 max-sm:py-4">
          <header className="mb-5 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <div className="min-w-0">
                <h1 className="mt-1 text-3xl font-black leading-tight text-zinc-950 md:text-4xl">{activeService.label}</h1>
              </div>
            </div>

            <UserMenu me={me} />
          </header>

          <Routes>
            <Route path="/" element={<Navigate to={DEFAULT_ROUTE} replace />} />
            {FRONTEND_SERVICES.map((service) => (
              <Route
                element={(
                  <ModulePage
                    busy={busy}
                    key={service.key}
                    onCreate={createRecord}
                    onDelete={deleteRecord}
                    onEdit={editRecord}
                    onEnsureList={fetchList}
                    onView={viewRecord}
                    rows={rowsByService[service.key] || []}
                    service={service}
                  />
                )}
                key={service.key}
                path={SERVICE_ROUTES[service.key]}
              />
            ))}
            <Route path="*" element={<Navigate to={DEFAULT_ROUTE} replace />} />
          </Routes>
        </main>
      </SidebarInset>

      <ApiResponseDialog dialog={responseDialog} onOpenChange={setResponseDialog} />
      <Toaster closeButton position="top-right" richColors />
    </SidebarProvider>
  );
}
