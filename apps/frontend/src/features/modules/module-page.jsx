import { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown01Icon,
  ArrowUp01Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Delete02Icon,
  Edit02Icon,
  EyeIcon,
  PlusSignIcon,
  Search01Icon
} from '@hugeicons/core-free-icons';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable
} from '@tanstack/react-table';
import { AppIcon } from '@/components/app/app-icon.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCell, labelForField } from './module-format.js';
import { DeleteDialog, DetailDialog, FormDialog } from './module-dialogs.jsx';
import { initialFormValues, valuesFromRecord } from './module-payload.js';

export function ModulePage({ busy, onCreate, onDelete, onEdit, onEnsureList, onView, rows, service }) {
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 8 });
  const [formDialog, setFormDialog] = useState({
    open: false,
    mode: 'create',
    id: null,
    values: initialFormValues(service)
  });
  const [detailDialog, setDetailDialog] = useState({ open: false, title: '', payload: null });
  const [deleteRow, setDeleteRow] = useState(null);

  useEffect(() => {
    onEnsureList(service);
    setSorting([]);
    setGlobalFilter('');
    setPagination({ pageIndex: 0, pageSize: 8 });
  }, [service.key]);

  const columns = useMemo(
    () => [
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
            <Button
              aria-label="Voir"
              disabled={busy}
              onClick={() => handleView(row.original)}
              size="icon-sm"
              title="Voir"
              type="button"
              variant="ghost"
            >
              <AppIcon icon={EyeIcon} size={15} />
            </Button>
            <Button
              aria-label="Modifier"
              disabled={busy}
              onClick={() => openEditDialog(row.original)}
              size="icon-sm"
              title="Modifier"
              type="button"
              variant="ghost"
            >
              <AppIcon icon={Edit02Icon} size={15} />
            </Button>
            <Button
              aria-label="Supprimer"
              disabled={busy}
              onClick={() => setDeleteRow(row.original)}
              size="icon-sm"
              title="Supprimer"
              type="button"
              variant="destructive"
            >
              <AppIcon icon={Delete02Icon} size={15} />
            </Button>
          </div>
        )
      }
    ],
    [busy, service]
  );

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

  async function handleFormSubmit(values) {
    const success =
      formDialog.mode === 'create' ? await onCreate(service, values) : await onEdit(service, formDialog.id, values);

    if (success) {
      setFormDialog((current) => ({ ...current, open: false }));
    }
    return success;
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

  const visibleRows = table.getRowModel().rows;

  return (
    <>
      <Card className="rounded-none bg-transparent py-0 shadow-none ring-0">
        <CardContent className="grid gap-3 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-sm">
              <AppIcon
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                icon={Search01Icon}
                size={15}
              />
              <Input
                className="h-9 pl-8"
                onChange={(event) => setGlobalFilter(event.target.value)}
                placeholder="Rechercher"
                value={globalFilter ?? ''}
              />
            </div>
            <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-between">
              <Button disabled={busy} onClick={openCreateDialog} size="lg" type="button">
                <AppIcon icon={PlusSignIcon} size={16} />
                Ajouter
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto bg-white">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow className="bg-white hover:bg-white" key={headerGroup.id}>
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
                {visibleRows.length ? (
                  visibleRows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          className={cell.column.id === 'actions' ? 'text-right' : 'text-zinc-800'}
                          key={cell.id}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      className="h-36 text-center text-sm font-semibold text-zinc-500"
                      colSpan={columns.length}
                    >
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
              <Button
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                type="button"
                variant="outline"
              >
                <AppIcon icon={ChevronLeftIcon} size={14} />
                Précédent
              </Button>
              <Button
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                type="button"
                variant="outline"
              >
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
        service={service}
      />

      <DetailDialog
        dialog={detailDialog}
        onOpenChange={(open) => setDetailDialog((current) => ({ ...current, open }))}
      />

      <DeleteDialog
        busy={busy}
        onConfirm={handleDelete}
        onOpenChange={(open) => !open && setDeleteRow(null)}
        row={deleteRow}
        service={service}
      />
    </>
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
