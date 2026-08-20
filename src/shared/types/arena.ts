/** Categories available on the arena.ai leaderboard. */
export type ArenaCategory = "text" | "text-to-image";

/** A single model row from the arena.ai leaderboard. */
export interface ArenaModel {
  model: string;
  rating: number | null;
  // Confidence interval bounds around `rating` from the ranking's uncertainty.
  ratingUpper: number | null;
  ratingLower: number | null;
  votes: number | null;
  license: string | null;
  modelOrganization: string | null;
  modelUrl: string | null;
  inputPricePerMillion: number | null;
  outputPricePerMillion: number | null;
  contextLength: number | null;
  pricePerImage: number | null;
}

/** Leaderboard payload for one arena category. */
export interface ArenaPayload {
  category: ArenaCategory;
  models: ArenaModel[];
}
