"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createMeeting, type FormState } from "@/lib/actions/meetings";
import { toDateInputValue, todayUtc } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: FormState = {};

function SubmitButton() {
  // useFormStatus doit vivre dans un enfant du <form> pour observer son état.
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Analyse en cours…" : "Analyser le compte rendu"}
    </Button>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-destructive">
      {message}
    </p>
  );
}

export function MeetingForm() {
  const [state, formAction] = useActionState(createMeeting, initialState);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <Label htmlFor="title">Titre de la réunion</Label>
        <Input
          id="title"
          name="title"
          placeholder="Réunion Projet Quizz+"
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
          className="mt-2"
        />
        <FieldError id="title-error" message={errors.title} />
      </div>

      <div>
        <Label htmlFor="meetingDate">Date de la réunion</Label>
        <Input
          id="meetingDate"
          name="meetingDate"
          type="date"
          defaultValue={toDateInputValue(todayUtc())}
          aria-invalid={Boolean(errors.meetingDate)}
          aria-describedby="meetingDate-help"
          className="mt-2"
        />
        <p id="meetingDate-help" className="mt-1 text-sm text-muted-foreground">
          Les échéances relatives (« avant jeudi ») sont calculées à partir de
          cette date.
        </p>
        <FieldError id="meetingDate-error" message={errors.meetingDate} />
      </div>

      <div>
        <Label htmlFor="rawContent">Compte rendu</Label>
        <Textarea
          id="rawContent"
          name="rawContent"
          rows={12}
          placeholder="Collez ici le texte du compte rendu…"
          aria-invalid={Boolean(errors.rawContent)}
          aria-describedby={errors.rawContent ? "rawContent-error" : undefined}
          className="mt-2"
        />
        <FieldError id="rawContent-error" message={errors.rawContent} />
      </div>

      <SubmitButton />
    </form>
  );
}
