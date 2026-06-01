import { useEffect, useMemo, useState } from 'react';
import {
  Banknote,
  Boxes,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  Package,
  Plus,
  ReceiptText,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Users,
  XCircle
} from 'lucide-react';
import { apiPath, formatJson, requestApi } from './api.js';
import { SERVICES } from './services.js';
import './styles.css';

const SERVICE_ICONS = {
  client: Users,
  produit: Package,
  commande: ShoppingCart,
  facture: ReceiptText,
  reglement: CircleDollarSign,
  caisse: Banknote,
  entrepot: Building2
};

const SERVICES_BY_KEY = Object.fromEntries(SERVICES.map((service) => [service.key, service]));

const panelClass = 'rounded-lg border border-zinc-200 bg-white shadow-sm';
const buttonClass = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900 transition hover:border-zinc-400 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60';
const inputClass = 'min-h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15';
const labelClass = 'text-xs font-semibold uppercase text-zinc-500';

export default function App() {
  const [selectedKey, setSelectedKey] = useState(SERVICES[0].key);
  const [me, setMe] = useState(null);
  const [rowsByService, setRowsByService] = useState({});
  const [detail, setDetail] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);
  const [formValues, setFormValues] = useState(() => initialFormValues(SERVICES[0]));
  const [viewId, setViewId] = useState('1');
  const [editId, setEditId] = useState('4');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const selectedService = SERVICES_BY_KEY[selectedKey];
  const selectedRows = rowsByService[selectedKey] || [];
  const totals = useMemo(() => buildTotals(rowsByService), [rowsByService]);

  useEffect(() => {
    loadIdentity();
    refreshDashboard();
  }, []);

  useEffect(() => {
    setDetail(null);
    setError(null);
    setFormValues(initialFormValues(selectedService));
    if (!rowsByService[selectedKey]) {
      fetchList(selectedService);
    }
  }, [selectedKey]);

  async function loadIdentity() {
    try {
      const payload = await requestApi('/api/me');
      setMe(payload.data || { authenticated: false, user: null });
    } catch {
      setMe({ authenticated: false, user: null });
    }
  }

  async function refreshDashboard() {
    await run(async () => {
      const entries = await Promise.all(
        SERVICES.map(async (service) => {
          const payload = await requestApi(apiPath(service.key, 'list'));
          return [service.key, payload.data?.data || []];
        })
      );
      setRowsByService(Object.fromEntries(entries));
    });
  }

  async function fetchList(service = selectedService) {
    await run(async () => {
      const payload = await requestApi(apiPath(service.key, 'list'));
      setRowsByService((current) => ({ ...current, [service.key]: payload.data?.data || [] }));
      setLastResponse(payload);
    });
  }

  async function viewRecord(id = viewId) {
    await run(async () => {
      const payload = await requestApi(apiPath(selectedKey, 'view', id));
      setDetail(payload.data?.data || null);
      setLastResponse(payload);
    });
  }

  async function createRecord() {
    await run(async () => {
      const payload = await requestApi(apiPath(selectedKey, 'create'), {
        method: 'POST',
        body: JSON.stringify(toPayload(selectedService, formValues))
      });
      setLastResponse(payload);
      await fetchList(selectedService);
    });
  }

  async function editRecord() {
    await run(async () => {
      const payload = await requestApi(apiPath(selectedKey, 'edit', editId), {
        method: 'PATCH',
        body: JSON.stringify(toPayload(selectedService, formValues, { partial: true }))
      });
      setLastResponse(payload);
      setDetail(payload.data?.data || null);
      await fetchList(selectedService);
    });
  }

  async function deleteRecord() {
    await run(async () => {
      const payload = await requestApi(apiPath(selectedKey, 'delete', editId), { method: 'DELETE' });
      setLastResponse(payload);
      setDetail(null);
      await fetchList(selectedService);
    });
  }

  async function run(task) {
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (requestError) {
      setError(requestError.message);
      setLastResponse(requestError.payload || { ok: false, error: requestError.message });
    } finally {
      setBusy(false);
    }
  }

  function updateFormValue(name, value) {
    setFormValues((current) => ({ ...current, [name]: value }));
  }

  const sessionLabel = me?.authenticated && me.user ? me.user.name : 'Session locale';
  const sessionDetail = me?.authenticated && me.user
    ? me.user.email || me.user.username
    : 'Protégé par Authelia en mode Docker';

  return (
    <main className="mx-auto min-h-screen w-[min(1480px,calc(100vw-32px))] py-6 text-zinc-950 max-sm:w-[min(100vw-20px,760px)] max-sm:py-4">
      <header className="mb-5 flex items-center justify-between gap-4 max-md:flex-col max-md:items-stretch">
        <div>
          <p className="text-xs font-bold uppercase text-zinc-500">Facturation microservices</p>
          <h1 className="mt-1 text-4xl font-black leading-none text-zinc-950 md:text-5xl">Tableau de bord</h1>
        </div>
        <div className="flex min-h-16 min-w-72 items-center gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 text-teal-900 max-md:min-w-0">
          <ShieldCheck className="shrink-0" size={20} />
          <div className="grid min-w-0 gap-0.5">
            <span className="truncate text-sm font-bold">{sessionLabel}</span>
            <small className="truncate text-xs font-medium text-teal-700">{sessionDetail}</small>
          </div>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={LayoutDashboard} label="Services" value={SERVICES.length} />
        <MetricCard icon={Users} label="Clients" value={totals.client} />
        <MetricCard icon={ShoppingCart} label="Commandes" value={totals.commande} />
        <MetricCard icon={FileText} label="Factures" value={totals.facture} />
      </section>

      <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(230px,280px)_minmax(0,1fr)] xl:grid-cols-[minmax(250px,310px)_minmax(0,1fr)_minmax(340px,0.55fr)]">
        <aside className={`${panelClass} grid gap-4 p-4 lg:sticky lg:top-4 lg:row-span-3`}>
          <PanelTitle icon={Boxes} title="Modules" />
          <div className="grid gap-2">
            {SERVICES.map((service) => {
              const Icon = SERVICE_ICONS[service.key];
              const isActive = selectedKey === service.key;
              return (
                <button
                  className={`flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 text-sm font-bold transition ${
                    isActive
                      ? 'border-teal-600 bg-teal-50 text-teal-900'
                      : 'border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300 hover:bg-white'
                  }`}
                  key={service.key}
                  onClick={() => setSelectedKey(service.key)}
                  type="button"
                >
                  <Icon className="shrink-0" size={18} />
                  <span className="flex-1 text-left">{service.label}</span>
                  <strong className="tabular-nums">{rowsByService[service.key]?.length ?? '-'}</strong>
                </button>
              );
            })}
          </div>
          <button className={`${buttonClass} w-full`} onClick={refreshDashboard} disabled={busy} type="button">
            <RefreshCcw size={17} />
            Actualiser
          </button>
        </aside>

        <section className={`${panelClass} grid gap-4 p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-zinc-500">Module</p>
              <h2 className="text-lg font-black text-zinc-950">{selectedService.label}</h2>
            </div>
            <button className={buttonClass} onClick={() => fetchList(selectedService)} disabled={busy} type="button">
              <RefreshCcw size={17} />
              Liste
            </button>
          </div>

          <DataTable rows={selectedRows} fields={selectedService.summaryFields} onView={viewRecord} />

          <div className="flex flex-wrap items-end gap-3">
            <Field label="ID détail" className="w-32 max-sm:w-full">
              <input className={inputClass} value={viewId} onChange={(event) => setViewId(event.target.value)} />
            </Field>
            <button className={buttonClass} onClick={() => viewRecord()} disabled={busy} type="button">
              <Search size={17} />
              Voir
            </button>
            <Field label="ID edit/delete" className="w-36 max-sm:w-full">
              <input className={inputClass} value={editId} onChange={(event) => setEditId(event.target.value)} />
            </Field>
            <button className={`${buttonClass} border-red-200 bg-red-50 text-red-700 hover:border-red-300 hover:bg-red-100`} onClick={deleteRecord} disabled={busy} type="button">
              <Trash2 size={17} />
              Supprimer
            </button>
          </div>
        </section>

        <section className={`${panelClass} grid gap-4 p-4 lg:col-start-2 xl:col-start-auto`}>
          <PanelTitle icon={Plus} title="Créer ou modifier" />
          <EntityForm service={selectedService} values={formValues} onChange={updateFormValue} />
          <div className="flex flex-wrap gap-3">
            <button className={`${buttonClass} border-teal-700 bg-teal-700 text-white hover:border-teal-800 hover:bg-teal-800`} onClick={createRecord} disabled={busy} type="button">
              <Send size={17} />
              Créer
            </button>
            <button className={buttonClass} onClick={editRecord} disabled={busy} type="button">
              <CheckCircle2 size={17} />
              Modifier
            </button>
          </div>
        </section>

        <section className={`${panelClass} grid gap-4 p-4 lg:col-start-2 xl:col-start-2`}>
          <PanelTitle icon={FileText} title="Détail" />
          <JsonBlock value={detail || { message: 'Aucun détail chargé' }} />
        </section>

        <section className={`${panelClass} grid gap-4 p-4 lg:col-start-2 xl:col-start-3`}>
          <div className="flex items-center justify-between gap-3">
            <PanelTitle icon={error ? XCircle : CheckCircle2} title="Réponse API" />
            {lastResponse ? (
              <span className={`inline-flex min-h-8 items-center rounded-full px-3 text-xs font-bold ${lastResponse.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                HTTP {lastResponse.status || '-'}
              </span>
            ) : null}
          </div>
          {error ? <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</div> : null}
          <JsonBlock value={lastResponse || { message: 'Aucune requête envoyée' }} />
        </section>
      </section>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value }) {
  return (
    <article className={`${panelClass} flex min-h-20 items-center gap-3 p-4`}>
      <Icon className="shrink-0 text-teal-700" size={22} />
      <div className="grid gap-1">
        <span className="text-sm font-semibold text-zinc-500">{label}</span>
        <strong className="text-2xl font-black tabular-nums text-zinc-950">{value ?? '-'}</strong>
      </div>
    </article>
  );
}

function PanelTitle({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="shrink-0 text-teal-700" size={18} />
      <h2 className="text-base font-black text-zinc-950">{title}</h2>
    </div>
  );
}

function DataTable({ rows, fields, onView }) {
  if (!rows.length) {
    return <div className="grid min-h-56 place-items-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-sm font-bold text-zinc-500">Aucune donnée</div>;
  }

  return (
    <div className="overflow-auto rounded-lg border border-zinc-200">
      <table className="w-full border-collapse bg-white">
        <thead className="bg-zinc-50">
          <tr>
            {fields.map((field) => <th className="whitespace-nowrap border-b border-zinc-200 px-3 py-3 text-left text-xs font-bold uppercase text-zinc-500" key={field}>{field}</th>)}
            <th className="whitespace-nowrap border-b border-zinc-200 px-3 py-3 text-left text-xs font-bold uppercase text-zinc-500">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-zinc-100 last:border-0" key={row.id}>
              {fields.map((field) => <td className="whitespace-nowrap px-3 py-3 text-sm text-zinc-800" key={field}>{formatCell(row[field])}</td>)}
              <td className="px-3 py-2">
                <button className="inline-flex size-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-700 transition hover:border-teal-600 hover:text-teal-700" onClick={() => onView(row.id)} type="button" aria-label="Voir">
                  <Search size={16} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntityForm({ service, values, onChange }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {service.fields.map((field) => (
        <Field label={`${field.label}${field.required ? ' *' : ''}`} key={field.name}>
          <input
            className={inputClass}
            type={field.type || 'text'}
            value={values[field.name] ?? ''}
            onChange={(event) => onChange(field.name, event.target.value)}
          />
        </Field>
      ))}
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`grid gap-1.5 ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function JsonBlock({ value }) {
  return <pre className="min-h-56 max-h-[420px] overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs leading-6 text-zinc-100">{formatJson(value)}</pre>;
}

function initialFormValues(service) {
  const payload = service.payload || {};

  if (service.key === 'commande') {
    return {
      client_id: payload.client_id ?? '',
      date: payload.date ?? '',
      produit_id: payload.lignes?.[0]?.produit_id ?? '',
      quantite: payload.lignes?.[0]?.quantite ?? ''
    };
  }

  return Object.fromEntries(service.fields.map((field) => [field.name, payload[field.name] ?? '']));
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

function buildTotals(rowsByService) {
  return Object.fromEntries(SERVICES.map((service) => [service.key, rowsByService[service.key]?.length ?? 0]));
}

function formatCell(value) {
  if (value === null || value === undefined) {
    return '-';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}
