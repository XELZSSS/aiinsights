export interface HallucinationRankingEntry {
  id: string;
  slug: string;
  model: string;
  hallucinationRate: number | null;
  accuracy: number | null;
  attemptRate: number | null;
  omniscienceIndex: number;
}