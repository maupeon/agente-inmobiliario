import { ValidationError } from "@/lib/errors";
import { buildNeighborhoodReport } from "@/lib/neighborhood/report";
import type { NeighborhoodReport } from "@/types";

export interface ConsultarBarrioInput {
  zona: string;
  provincia?: string;
}

export async function runConsultarBarrio(
  input: ConsultarBarrioInput
): Promise<NeighborhoodReport> {
  if (!input?.zona) throw new ValidationError("zona es obligatoria");
  return buildNeighborhoodReport(input.zona, input.provincia);
}
