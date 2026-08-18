export type ArenaCategory = "text" | "text-to-image";

export interface ArenaModel {
  model: string;
  rating: number | null;
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

export interface ArenaPayload {
  category: ArenaCategory;
  models: ArenaModel[];
}
