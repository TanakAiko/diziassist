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

// Deux boutons de soumission dans le même formulaire. Chacun porte le même
// name avec une value différente : le serveur lit `mode` pour savoir lequel a
// été pressé. useFormStatus expose le FormData envoyé, ce qui permet de
// n'afficher « en cours » que sur le bouton réellement cliqué.
function SubmitButtons({ aiAvailable }: { aiAvailable: boolean }) {
  const { pending, data } = useFormStatus();
  const submittedMode = data?.get("mode");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" name="mode" value="rules" disabled={pending}>
          {pending && submittedMode === "rules"
            ? "Analyse en cours…"
            : "Analyser le compte rendu"}
        </Button>

        <Button
          type="submit"
          name="mode"
          value="ia"
          variant="outline"
          disabled={pending || !aiAvailable}
        >
          {pending && submittedMode === "ia"
            ? "Analyse par l'IA en cours…"
            : "Analyser avec l'IA"}
        </Button>
      </div>

      <p className="text-base text-muted-foreground">
        {aiAvailable
          ? "L'analyse par règles est immédiate et fonctionne hors ligne. L'analyse par IA comprend des tournures plus variées, mais demande quelques secondes. En cas d'échec, les règles prennent le relais."
          : "L'analyse par IA est indisponible : aucune clé API n'est configurée sur le serveur. L'analyse par règles reste pleinement fonctionnelle."}
      </p>
    </div>
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

export function MeetingForm({ aiAvailable }: { aiAvailable: boolean }) {
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

      <SubmitButtons aiAvailable={aiAvailable} />
    </form>
  );
}
