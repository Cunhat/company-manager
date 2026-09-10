import { useId, useState, type SubmitEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import dayjs from "../lib/dates";
import type { KmsJourney } from "../schemas/types";

export function ExportMapDialog({
  journeys,
  month,
  onClose,
}: {
  journeys: KmsJourney[];
  month: string;
  onClose: () => void;
}) {
  const id = useId();
  const [company, setCompany] = useState("TIAGO MARQUES CUNHA Unipessoal Lda");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenChange(open: boolean) {
    if (!open && !pending) onClose();
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || !company.trim()) return;
    setPending(true);
    setError(null);
    try {
      const { downloadMonthlyPdf } = await import("../lib/monthly-pdf");
      await downloadMonthlyPdf(journeys, month, company);
      toast.success("Mapa de quilómetros descarregado");
      onClose();
    } catch {
      setError("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent lang="pt-PT" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Exportar mapa de quilómetros</DialogTitle>
          <DialogDescription>
            PDF com todas as deslocações do mês, totais e espaço para
            assinatura.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <fieldset disabled={pending} className="space-y-5">
            <Field>
              <FieldLabel htmlFor={`${id}-company`}>Empresa</FieldLabel>
              <Input
                id={`${id}-company`}
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                required
                maxLength={250}
                autoComplete="organization"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-date`}>Data</FieldLabel>
              <Input
                id={`${id}-date`}
                value={dayjs.utc(month).endOf("month").format("DD/MM/YYYY")}
                readOnly
                aria-describedby={`${id}-date-help`}
              />
              <p
                id={`${id}-date-help`}
                className="text-xs text-muted-foreground"
              >
                Último dia do mês selecionado.
              </p>
            </Field>
          </fieldset>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !company.trim()}>
              {pending ? <Spinner /> : null}
              {pending ? "A gerar PDF..." : "Descarregar PDF"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
