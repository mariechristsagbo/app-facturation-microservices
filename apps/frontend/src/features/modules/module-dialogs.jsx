import { CheckmarkCircle01Icon, Delete02Icon } from '@hugeicons/core-free-icons';
import { AppIcon } from '@/components/app/app-icon.jsx';
import { JsonBlock } from '@/components/app/json-block.jsx';
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
import { Button } from '@/components/ui/button';
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

export function FormDialog({ busy, dialog, onOpenChange, onSubmit, onUpdate, service }) {
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
              {dialog.mode === 'edit' ? <AppIcon icon={CheckmarkCircle01Icon} size={15} /> : null}
              {dialog.mode === 'create' ? 'Ajouter' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DetailDialog({ dialog, onOpenChange }) {
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

export function ApiResponseDialog({ dialog, onOpenChange }) {
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

export function DeleteDialog({ busy, onConfirm, onOpenChange, row, service }) {
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
