"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  KINDS,
  KIND_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
} from "@/lib/constants";
import { ALL } from "@/lib/validation/filters";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type MeetingOption = { id: string; title: string };

// Les filtres écrivent dans l'URL, jamais dans un état React : l'adresse
// obtenue est partageable et le bouton retour rejoue le filtre précédent.
export function DashboardFilters({
  meetings,
  hasActiveFilter,
}: {
  meetings: MeetingOption[];
  hasActiveFilter: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    startTransition(() => {
      router.replace(params.size > 0 ? `/dashboard?${params}` : "/dashboard");
    });
  }

  const value = (key: string) => searchParams.get(key) ?? ALL;

  return (
    <div className="rounded-lg border p-4" data-pending={isPending}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <Label htmlFor="filter-meeting">Compte rendu</Label>
          <select
            id="filter-meeting"
            value={value("meeting")}
            onChange={(event) => setParam("meeting", event.target.value)}
            className="mt-2 h-8 w-full rounded-lg border bg-background px-2 text-sm"
          >
            <option value={ALL}>Tous</option>
            {meetings.map((meeting) => (
              <option key={meeting.id} value={meeting.id}>
                {meeting.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="filter-kind">Nature</Label>
          <select
            id="filter-kind"
            value={value("kind")}
            onChange={(event) => setParam("kind", event.target.value)}
            className="mt-2 h-8 w-full rounded-lg border bg-background px-2 text-sm"
          >
            <option value={ALL}>Toutes</option>
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="filter-status">Statut</Label>
          <select
            id="filter-status"
            value={value("status")}
            onChange={(event) => setParam("status", event.target.value)}
            className="mt-2 h-8 w-full rounded-lg border bg-background px-2 text-sm"
          >
            <option value={ALL}>Tous</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label htmlFor="filter-priority">Priorité</Label>
          <select
            id="filter-priority"
            value={value("priority")}
            onChange={(event) => setParam("priority", event.target.value)}
            className="mt-2 h-8 w-full rounded-lg border bg-background px-2 text-sm"
          >
            <option value={ALL}>Toutes</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>

        <div className="lg:col-span-2">
          <Label htmlFor="filter-q">Recherche</Label>
          <Input
            id="filter-q"
            type="search"
            defaultValue={searchParams.get("q") ?? ""}
            placeholder="Description ou responsable…"
            onChange={(event) => setParam("q", event.target.value)}
            className="mt-2"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={searchParams.get("retard") === "1"}
            onChange={(event) =>
              setParam("retard", event.target.checked ? "1" : "")
            }
            className="size-4 accent-primary"
          />
          En retard uniquement
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={searchParams.get("aconfirmer") === "1"}
            onChange={(event) =>
              setParam("aconfirmer", event.target.checked ? "1" : "")
            }
            className="size-4 accent-primary"
          />
          À confirmer uniquement
        </label>

        {hasActiveFilter ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => startTransition(() => router.replace("/dashboard"))}
          >
            Réinitialiser
          </Button>
        ) : null}
      </div>
    </div>
  );
}
