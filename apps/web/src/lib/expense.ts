import { IVA_RATE } from "./consts";

export function getExpenseNetValue(expense: { value: string; iva: boolean }) {
  const value = Number(expense.value);
  return expense.iva ? Number((value / (1 + IVA_RATE)).toFixed(2)) : value;
}

export function getExpenseIvaValue(expense: { value: string; iva: boolean }) {
  return Number((Number(expense.value) - getExpenseNetValue(expense)).toFixed(2));
}
