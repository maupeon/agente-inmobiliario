import { ValidationError } from "@/lib/errors";
import type { MortgageCalc } from "@/types";

export interface CalcularHipotecaInput {
  precioPropiedad: number;
  entradaPorcentaje?: number;
  plazoAnios?: number;
  tipoInteres?: number;
}

/** Ingreso mensual ilustrativo; no representa un salario neto oficial ni personal. */
const SALARIO_REFERENCIA = 2200;

/**
 * Cuota = P * r(1+r)^n / ((1+r)^n - 1)
 *  P = capital prestado
 *  r = tipo mensual (anual/12)
 *  n = meses
 */
export function calcularHipoteca(input: CalcularHipotecaInput): MortgageCalc {
  if (!Number.isFinite(input?.precioPropiedad) || input.precioPropiedad <= 0)
    throw new ValidationError("precioPropiedad debe ser un número positivo");
  for (const value of [input.entradaPorcentaje, input.plazoAnios, input.tipoInteres]) {
    if (value !== undefined && !Number.isFinite(value)) throw new ValidationError("los parámetros hipotecarios deben ser números finitos");
  }

  const precio = input.precioPropiedad;
  const entradaPct = clamp(input.entradaPorcentaje ?? 20, 0, 100);
  const plazo = clamp(input.plazoAnios ?? 30, 1, 40);
  const interes = clamp(input.tipoInteres ?? 3.5, 0, 15);

  const downPayment = Math.round((precio * entradaPct) / 100);
  const loan = precio - downPayment;
  const r = interes / 100 / 12;
  const n = plazo * 12;

  const monthly =
    r === 0
      ? loan / n
      : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);

  const total = monthly * n;
  const interest = total - loan;
  const effort = (monthly / SALARIO_REFERENCIA) * 100;

  return {
    propertyPrice: precio,
    downPayment,
    downPaymentPercent: entradaPct,
    loanAmount: loan,
    termYears: plazo,
    interestRate: interes,
    monthlyPayment: Math.round(monthly),
    totalCost: Math.round(total),
    totalInterest: Math.round(interest),
    effortPercent: Math.round(effort * 10) / 10,
  };
}

export function runCalcularHipoteca(input: CalcularHipotecaInput) {
  return calcularHipoteca(input);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
