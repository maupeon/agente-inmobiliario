import raw from "./results-data.json";
export interface ResultRow { name: string; value: number }
export interface PresentationResults {
  schema_version: 2; status: "pending" | "complete"; model_id: string;
  source: string | null; source_sha256: string | null; generated_at: string | null;
  n_features: number;
  sample: { input: number; eligible: number | null; fit: number | null; calibration: number | null; test: number | null; evaluated: number | null; abstentions: number | null };
  models: ResultRow[]; artifactModels: ResultRow[];
  scope: { outer: number | null; artifact: number | null; temporal: number | null; folds: number[] };
  coverage: { outer: number | null; artifact: number | null; outer_assets: number | null; artifact_assets: number | null; width_pct: number | null; target: number };
  uncertainty: { mdape_outer_ci95: number[] | null; bootstrap_repetitions: number | null };
  limitations: { cheap_decile_coverage_pct: number | null; cheap_decile_mdape_pct: number | null; temporal_asset_coverage_pct: number | null };
  shap: ResultRow[]; metrics: Record<string, unknown>; notice: string;
}
export const results = raw as PresentationResults;
export const formatCount = (n: number | null) => n == null ? "Pendiente" : n.toLocaleString("es-ES");
