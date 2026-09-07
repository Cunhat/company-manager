import { useId, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { createKmsPathMutation, getKmsPathsQuery } from "../server/functions";
import { createKmsPathSchema } from "../schemas/validators";

export function CreatePathDialog({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) setOpen(next);
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <IconPlus data-icon="inline-start" /> New path
      </DialogTrigger>
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        showCloseButton={!pending}
      >
        <DialogHeader>
          <DialogTitle>New path</DialogTitle>
          <DialogDescription>
            Save a one-way route to reuse for your business trips.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <PathForm userId={userId} onClose={() => setOpen(false)} onPending={setPending} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

const fields = [
  { name: "origin", label: "Origin", placeholder: "Sede" },
  { name: "destination", label: "Destination", placeholder: "Boost IT, Porto" },
  { name: "reason", label: "Business purpose", placeholder: "Client meeting" },
  { name: "distance", label: "One-way distance (km)", placeholder: "100" },
  { name: "description", label: "Notes (optional)", placeholder: "Additional route details" },
] as const;

function PathForm({
  userId,
  onClose,
  onPending,
}: {
  userId: string;
  onClose: () => void;
  onPending: (pending: boolean) => void;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);
  const client = useQueryClient();
  const create = useMutation(createKmsPathMutation);
  const form = useForm({
    defaultValues: { origin: "", destination: "", reason: "", distance: "", description: "" },
    validators: { onSubmit: createKmsPathSchema },
    onSubmit: async ({ value }) => {
      setError(null);
      onPending(true);
      try {
        const created = await create.mutateAsync(value);
        client.setQueryData(getKmsPathsQuery(userId).queryKey, (previous) => [
          created,
          ...(previous ?? []).filter((path) => path.id !== created.id),
        ]);
        void client.invalidateQueries(getKmsPathsQuery(userId));
        toast.success("Path created");
        onClose();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not create path. Please try again.",
        );
      } finally {
        onPending(false);
      }
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(pending) => (
          <>
            <fieldset disabled={pending} className="space-y-5">
              {fields.map((definition) => (
                <form.Field key={definition.name} name={definition.name}>
                  {(field) => {
                    const invalid = field.state.meta.errors.length > 0;
                    const fieldId = `${id}-${definition.name}`;
                    const props = {
                      id: fieldId,
                      name: definition.name,
                      value: field.state.value,
                      placeholder: definition.placeholder,
                      onBlur: field.handleBlur,
                      onChange: (
                        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                      ) => field.handleChange(event.target.value),
                      "aria-invalid": invalid || undefined,
                      "aria-describedby": `${fieldId}-help ${fieldId}-error`,
                    };
                    return (
                      <Field data-invalid={invalid || undefined}>
                        <FieldLabel htmlFor={fieldId}>{definition.label}</FieldLabel>
                        {definition.name === "description" ? (
                          <Textarea {...props} rows={2} />
                        ) : (
                          <Input
                            {...props}
                            autoComplete="off"
                            {...(definition.name === "distance"
                              ? {
                                  type: "number",
                                  min: 1,
                                  max: 2_147_483_647,
                                  step: 1,
                                  inputMode: "numeric" as const,
                                }
                              : { type: "text" })}
                          />
                        )}
                        {definition.name === "distance" ? (
                          <FieldDescription id={`${fieldId}-help`}>
                            Enter whole kilometres for one direction. Each trip includes a return.
                          </FieldDescription>
                        ) : null}
                        <FieldError id={`${fieldId}-error`} errors={field.state.meta.errors} />
                      </Field>
                    );
                  }}
                </form.Field>
              ))}
              {error ? (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </fieldset>
            <div className="mt-6 flex justify-end gap-2 border-t pt-5">
              <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Spinner /> : null}
                {pending ? "Creating..." : "Create path"}
              </Button>
            </div>
          </>
        )}
      </form.Subscribe>
    </form>
  );
}
