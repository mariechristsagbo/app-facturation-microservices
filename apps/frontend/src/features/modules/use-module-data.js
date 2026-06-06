import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { FRONTEND_SERVICES } from '@/app/module-config.js';
import { apiPath, requestApi } from '@/api.js';
import { toPayload } from './module-payload.js';

export function useModuleData() {
  const [me, setMe] = useState(null);
  const [rowsByService, setRowsByService] = useState({});
  const [busy, setBusy] = useState(false);
  const [responseDialog, setResponseDialog] = useState({ open: false, title: '', payload: null });

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

  return {
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
  };
}
