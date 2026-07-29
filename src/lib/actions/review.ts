"use server";

import { revalidatePath } from "next/cache";
import { persistReview, type ReviewState } from "./persist-review";
import type { ReviewInput } from "@/lib/validation/review";

export type { ReviewState } from "./persist-review";

// Server Action : elle ne fait qu'enrober persistReview du rafraîchissement
// des pages concernées. Toute la logique métier est dans persist-review.ts,
// où elle reste exerçable sans serveur Next.
export async function saveReview(input: ReviewInput): Promise<ReviewState> {
  const result = await persistReview(input);

  if (result.status === "success") {
    revalidatePath("/");
    revalidatePath(`/meetings/${input.meetingId}`);
  }

  return result;
}
