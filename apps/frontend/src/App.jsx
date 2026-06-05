import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  BanknoteIcon,
  CheckmarkCircle01Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  DashboardSquareIcon,
  Delete02Icon,
  Edit02Icon,
  EyeIcon,
  InvoiceIcon,
  Logout01Icon,
  PackageIcon,
  PlusSignIcon,
  Search01Icon,
  SecurityCheckIcon,
  ShoppingCart01Icon,
  UserMultipleIcon,
  WarehouseIcon
} from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger
} from '@/components/ui/sidebar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Toaster } from '@/components/ui/sonner';
import { apiPath, formatJson, requestApi } from './api.js';
import { SERVICES } from './services.js';
import './styles.css';

const SERVICE_ICONS = {
  client: UserMultipleIcon,
  produit: PackageIcon,
  commande: ShoppingCart01Icon,
  facture: InvoiceIcon,
  reglement: CircleDollarSignIcon,
  caisse: BanknoteIcon,
  entrepot: WarehouseIcon
};

const SERVICE_ROUTES = {
  client: '/clients',
  produit: '/produits',
  commande: '/commandes',
  facture: '/factures',
  reglement: '/reglements',
  caisse: '/caisses',
  entrepot: '/entrepots'
};

const FRONTEND_SERVICES = SERVICES.filter((service) => service.key !== 'commande');

const COLUMN_LABELS = {
  id: 'ID',
  nom: 'Nom',
  prenom: 'Prénom',
  telephone: 'Téléphone',
  prix: 'Prix',
  client_id: 'Client',
  date: 'Date',
  total: 'Total',
  commande_id: 'Commande',
  numero: 'Numéro',
  montant: 'Montant',
  facture_id: 'Facture',
  mode: 'Mode',
  libelle: 'Libellé',
  solde: 'Solde',
  ville: 'Ville'
};

const SERVICES_BY_ROUTE = Object.fromEntries(FRONTEND_SERVICES.map((service) => [SERVICE_ROUTES[service.key], service]));
const DEFAULT_ROUTE = SERVICE_ROUTES[FRONTEND_SERVICES[0].key];

function AppIcon({ icon, size = 16, className = '' }) {
  return <HugeiconsIcon aria-hidden="true" className={className} icon={icon} size={size} strokeWidth={2} />;
}

export default function App() {
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [rowsByService, setRowsByService] = useState({});
  const [busy, setBusy] = useState(false);
  const [responseDialog, setResponseDialog] = useState({ open: false, title: '', payload: null });

  const activeService = SERVICES_BY_ROUTE[location.pathname] || FRONTEND_SERVICES[0];

  useEffect(() => {
    loadIdentity();
    refreshDashboard();
  }, []);

  async function loadIdentity() {
    try {
      const payload = await requestApi('/api/me');
      setMe(payload.data || { authenticated: false, user: null });
    } catch {
      setMe({ authenticated: false, user: null });
    }
  }

  async function refreshDashboard() {
    setBusy(true);
    try {
      const entries = await Promise.all(
        FRONTEND_SERVICES.map(async (service) => {
          try {
            const rows = await fetchListRaw(service);
            return [service.key, rows];
          } catch {
            return [service.key, []];
          }
        })
      );
      setRowsByService(Object.fromEntries(entries));
    } finally {
      setBusy(false);
    }
  }

  async function fetchListRaw(service) {
    const payload = await requestApi(apiPath(service.key, 'list'));
    return payload.data?.data || [];
  }

  async function fetchList(service) {
    setBusy(true);
    try {
      const rows = await fetchListRaw(service);
      setRowsByService((current) => ({ ...current, [service.key]: rows }));
      return rows;
    } catch (requestError) {
      showRequestError(requestError, `Liste ${service.label}`);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function viewRecord(service, id, options = {}) {
    setBusy(true);
    try {
      const payload = await requestApi(apiPath(service.key, 'view', id));
      if (options.announce) {
        toast.success('Détail chargé', { description: `${service.label} #${id}` });
      }
      return payload;
    } catch (requestError) {
      showRequestError(requestError, `Détail ${service.label}`);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function createRecord(service, values) {
    return mutateRecord(service, `Création ${service.label}`, async () => (
      requestApi(apiPath(service.key, 'create'), {
        method: 'POST',
        body: JSON.stringify(toPayload(service, values))
      })
    ));
  }

  async function editRecord(service, id, values) {
    return mutateRecord(service, `Modification ${service.label}`, async () => (
      requestApi(apiPath(service.key, 'edit', id), {
        method: 'PATCH',
        body: JSON.stringify(toPayload(service, values, { partial: true }))
      })
    ));
  }

  async function deleteRecord(service, id) {
    return mutateRecord(service, `Suppression ${service.label}`, async () => (
      requestApi(apiPath(service.key, 'delete', id), { method: 'DELETE' })
    ));
  }

  async function mutateRecord(service, title, task) {
    setBusy(true);
    try {
      const payload = await task();
      setResponseDialog({ open: true, title, payload });
      toast.success(payload.data?.message || 'Action effectuée', {
        description: `${service.label} mis à jour`
      });

      try {
        const rows = await fetchListRaw(service);
        setRowsByService((current) => ({ ...current, [service.key]: rows }));
      } catch (refreshError) {
        toast.error(refreshError.message || 'Actualisation impossible', { description: service.label });
      }

      return true;
    } catch (requestError) {
      showRequestError(requestError, title);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function showRequestError(requestError, title) {
    const payload = requestError.payload || { ok: false, error: requestError.message };
    setResponseDialog({ open: true, title, payload });
    toast.error(requestError.message || 'Erreur API', { description: title });
  }

  const sessionLabel = me?.authenticated && me.user ? me.user.name : 'Session locale';
  const sessionDetail = me?.authenticated && me.user
    ? me.user.email || me.user.username
    : 'Protégé par Authelia en mode Docker';

  return (
    <SidebarProvider>
      <DashboardSidebar rowsByService={rowsByService} />

      <SidebarInset className="bg-zinc-50">
        <main className="mx-auto min-h-screen w-[min(1220px,calc(100vw-32px))] py-6 text-zinc-950 max-sm:w-[min(100vw-20px,760px)] max-sm:py-4">
          <header className="mb-5 flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch">
            <div className="flex min-w-0 items-center gap-3">
              <SidebarTrigger className="md:hidden" />
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-zinc-500">Facturation microservices</p>
                <h1 className="mt-1 text-3xl font-black leading-tight text-zinc-950 md:text-4xl">{activeService.label}</h1>
              </div>
            </div>

            <div className="flex min-h-14 min-w-72 items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 text-teal-900 max-md:min-w-0">
              <AppIcon className="shrink-0" icon={SecurityCheckIcon} size={20} />
              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-bold">{sessionLabel}</span>
                <small className="truncate text-xs font-medium text-teal-700">{sessionDetail}</small>
              </div>
              {me?.authenticated ? (
                <a
                  aria-label="Se déconnecter"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-teal-300 bg-white text-teal-800 transition hover:border-teal-500 hover:bg-teal-100"
                  href="/auth/logout"
                  title="Se déconnecter"
                >
                  <AppIcon icon={Logout01Icon} size={16} />
                </a>
              ) : null}
            </div>
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

function DashboardSidebar({ rowsByService }) {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="px-3 py-4">
        <div className="flex min-h-12 items-center gap-3 rounded-lg bg-sidebar-accent px-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-teal-700 text-white">
            <AppIcon icon={DashboardSquareIcon} size={16} />
          </div>
          <div className="grid min-w-0 gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-black text-sidebar-foreground">Facturation</span>
            <span className="truncate text-xs font-medium text-sidebar-foreground/60">Microservices</span>
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

function ModulePage({ busy, onCreate, onDelete, onEdit, onEnsureList, onView, rows, service }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });
  const [formDialog, setFormDialog] = useState({ open: false, mode: 'create', id: null, values: initialFormValues(service) });
  const [detailDialog, setDetailDialog] = useState({ open: false, title: '', payload: null });
  const [deleteRow, setDeleteRow] = useState(null);

  useEffect(() => {
    onEnsureList(service);
    setSorting([]);
    setGlobalFilter('');
    setPagination({ pageIndex: 0, pageSize: 8 });
  }, [service.key]);

  const columns = useMemo(() => ([
    ...service.summaryFields.map((field) => ({
      accessorKey: field,
      header: labelForField(service, field),
      cell: ({ getValue }) => formatCell(getValue())
    })),
    {
      id: 'actions',
      enableGlobalFilter: false,
      enableSorting: false,
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button aria-label="Voir" disabled={busy} onClick={() => handleView(row.original)} size="icon-sm" title="Voir" type="button" variant="ghost">
            <AppIcon icon={EyeIcon} size={15} />
          </Button>
          <Button aria-label="Modifier" disabled={busy} onClick={() => openEditDialog(row.original)} size="icon-sm" title="Modifier" type="button" variant="ghost">
            <AppIcon icon={Edit02Icon} size={15} />
          </Button>
          <Button aria-label="Supprimer" disabled={busy} onClick={() => setDeleteRow(row.original)} size="icon-sm" title="Supprimer" type="button" variant="destructive">
            <AppIcon icon={Delete02Icon} size={15} />
          </Button>
        </div>
      )
    }
  ]), [busy, service]);

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting, globalFilter, pagination },
    globalFilterFn: 'includesString',
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  function openCreateDialog() {
    setFormDialog({ open: true, mode: 'create', id: null, values: initialFormValues(service) });
  }

  async function openEditDialog(row) {
    const payload = await onView(service, row.id);
    const record = payload?.data?.data;
    if (!record) {
      return;
    }

    setFormDialog({ open: true, mode: 'edit', id: row.id, values: valuesFromRecord(service, record) });
  }

  async function handleView(row) {
    const payload = await onView(service, row.id, { announce: true });
    if (payload) {
      setDetailDialog({ open: true, title: `${service.label} #${row.id}`, payload });
    }
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    const success = formDialog.mode === 'create'
      ? await onCreate(service, formDialog.values)
      : await onEdit(service, formDialog.id, formDialog.values);

    if (success) {
      setFormDialog((current) => ({ ...current, open: false }));
    }
  }

  async function handleDelete() {
    if (!deleteRow) {
      return;
    }

    const success = await onDelete(service, deleteRow.id);
    if (success) {
      setDeleteRow(null);
    }
  }

  function updateFormValue(name, value) {
    setFormDialog((current) => ({
      ...current,
      values: { ...current.values, [name]: value }
    }));
  }

  const visibleRows = table.getRowModel().rows;
  const filteredCount = table.getFilteredRowModel().rows.length;

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="border-b border-zinc-200">
          <div className="min-w-0">
            <CardTitle className="text-lg font-black text-zinc-950">{service.label}</CardTitle>
            <CardDescription>{rows.length} enregistrements chargés</CardDescription>
          </div>
          <CardAction>
            <Button disabled={busy} onClick={openCreateDialog} size="lg" type="button">
              <AppIcon icon={PlusSignIcon} size={16} />
              Ajouter
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="grid gap-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <AppIcon className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" icon={Search01Icon} size={15} />
              <Input
                className="h-9 pl-8"
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Rechercher"
                value={globalFilter ?? ''}
              />
            </div>
            <span className="text-xs font-medium text-zinc-500">
              {filteredCount} résultat{filteredCount > 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow className="bg-zinc-50 hover:bg-zinc-50" key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead className={header.column.id === 'actions' ? 'w-32 text-right' : ''} key={header.id}>
                        {header.isPlaceholder ? null : (
                          <button
                            className={`inline-flex min-h-8 items-center gap-1 text-left text-xs font-bold uppercase text-zinc-500 ${header.column.getCanSort() ? 'cursor-pointer hover:text-zinc-900' : 'cursor-default'}`}
                            disabled={!header.column.getCanSort()}
                            onClick={header.column.getToggleSortingHandler()}
                            type="button"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortIcon direction={header.column.getIsSorted()} />
                          </button>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {visibleRows.length ? visibleRows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell className={cell.column.id === 'actions' ? 'text-right' : 'text-zinc-800'} key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell className="h-36 text-center text-sm font-semibold text-zinc-500" colSpan={columns.length}>
                      Aucune donnée
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-zinc-500">
              Page {table.getState().pagination.pageIndex + 1} sur {Math.max(table.getPageCount(), 1)}
            </span>
            <div className="flex items-center gap-2">
              <Button disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} type="button" variant="outline">
                <AppIcon icon={ChevronLeftIcon} size={14} />
                Précédent
              </Button>
              <Button disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} type="button" variant="outline">
                Suivant
                <AppIcon icon={ChevronRightIcon} size={14} />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <FormDialog
        busy={busy}
        dialog={formDialog}
        onOpenChange={(open) => setFormDialog((current) => ({ ...current, open }))}
        onSubmit={handleFormSubmit}
        onUpdate={updateFormValue}
        service={service}
      />

      <DetailDialog dialog={detailDialog} onOpenChange={(open) => setDetailDialog((current) => ({ ...current, open }))} />

      <DeleteDialog busy={busy} onConfirm={handleDelete} onOpenChange={(open) => !open && setDeleteRow(null)} row={deleteRow} service={service} />
    </>
  );
}

function FormDialog({ busy, dialog, onOpenChange, onSubmit, onUpdate, service }) {
  const title = dialog.mode === 'create' ? `Ajouter ${service.label.toLowerCase()}` : `Modifier ${service.label.toLowerCase()}`;

  return (
    <Dialog open={dialog.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form className="grid gap-4" onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Les champs marqués d’un astérisque sont obligatoires.</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {service.fields.map((field) => (
              <div className="grid gap-1.5" key={field.name}>
                <Label htmlFor={`${service.key}-${field.name}`}>{field.label}{field.required ? ' *' : ''}</Label>
                <Input
                  disabled={busy}
                  id={`${service.key}-${field.name}`}
                  onChange={(event) => onUpdate(field.name, event.target.value)}
                  required={Boolean(field.required)}
                  type={field.type || 'text'}
                  value={dialog.values[field.name] ?? ''}
                />
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button disabled={busy} type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button disabled={busy} type="submit">
              <AppIcon icon={dialog.mode === 'create' ? PlusSignIcon : CheckmarkCircle01Icon} size={15} />
              {dialog.mode === 'create' ? 'Ajouter' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({ dialog, onOpenChange }) {
  return (
    <Dialog open={dialog.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{dialog.title || 'Détail'}</DialogTitle>
          <DialogDescription>Réponse complète de l’API.</DialogDescription>
        </DialogHeader>
        <JsonBlock value={dialog.payload || {}} />
      </DialogContent>
    </Dialog>
  );
}

function ApiResponseDialog({ dialog, onOpenChange }) {
  return (
    <Dialog open={dialog.open} onOpenChange={(open) => onOpenChange((current) => ({ ...current, open }))}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{dialog.title || 'Réponse API'}</DialogTitle>
          <DialogDescription>Résultat renvoyé par le microservice.</DialogDescription>
        </DialogHeader>
        <JsonBlock value={dialog.payload || {}} />
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({ busy, onConfirm, onOpenChange, row, service }) {
  return (
    <AlertDialog open={Boolean(row)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-red-50 text-red-700">
            <AppIcon icon={Delete02Icon} size={16} />
          </AlertDialogMedia>
          <AlertDialogTitle>Supprimer cet enregistrement ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action appellera l’endpoint delete de {service.label.toLowerCase()} pour l’ID {row?.id ?? '-'}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={onConfirm} variant="destructive">Supprimer</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function SortIcon({ direction }) {
  if (direction === 'asc') {
    return <AppIcon className="text-zinc-900" icon={ArrowUp01Icon} size={13} />;
  }

  if (direction === 'desc') {
    return <AppIcon className="text-zinc-900" icon={ArrowDown01Icon} size={13} />;
  }

  return null;
}

function JsonBlock({ value }) {
  return <pre className="max-h-[520px] min-h-52 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs leading-6 text-zinc-100">{formatJson(value)}</pre>;
}

function initialFormValues(service) {
  return valuesFromRecord(service, service.payload || {});
}

function valuesFromRecord(service, record) {
  if (service.key === 'commande') {
    return {
      client_id: record.client_id ?? '',
      date: record.date ?? '',
      produit_id: record.lignes?.[0]?.produit_id ?? '',
      quantite: record.lignes?.[0]?.quantite ?? ''
    };
  }

  return Object.fromEntries(service.fields.map((field) => [field.name, record[field.name] ?? '']));
}

function toPayload(service, values, options = {}) {
  const payload = {};

  for (const field of service.fields) {
    const value = values[field.name];
    if (value === '' || value === null || value === undefined) {
      if (!options.partial && field.required) {
        payload[field.name] = value;
      }
      continue;
    }

    payload[field.name] = field.type === 'number' ? Number(value) : value;
  }

  if (service.key === 'commande') {
    return {
      client_id: payload.client_id,
      date: payload.date,
      lignes: [{ produit_id: payload.produit_id, quantite: payload.quantite }]
    };
  }

  return payload;
}

function labelForField(service, field) {
  return service.fields.find((item) => item.name === field)?.label || COLUMN_LABELS[field] || field;
}

function formatCell(value) {
  if (value === null || value === undefined || value === '') {
    return '-';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
