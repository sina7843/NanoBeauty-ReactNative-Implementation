import { useState } from 'react';
import { TextField, type TextFieldProps } from '../components';
import { centsOf, typeMoney } from './money';

/** Whether the parent's value is just what this field reported (a parent that can't store "empty" keeps 0). */
export const echoes = (value: number | null | undefined, reported: number | null | undefined) =>
  (value ?? null) === (reported ?? null) || ((reported ?? null) === null && value === 0);

/**
 * Dollars as typed text (ST-13): "25." and "49.9" stay as typed, at most two decimals, and a cleared field stays empty.
 * The number is reported on every change (null when empty); the text follows the value only when it is replaced from
 * outside (Load the latest, a merged server draft).
 */
export function MoneyField({ dollars, onDollars, ...field }: { dollars: number | null | undefined; onDollars: (value: number | null) => void } & Omit<TextFieldProps, 'value' | 'onChangeText' | 'keyboardType'>) {
  const [raw, setRaw] = useState(dollars === null || dollars === undefined ? '' : String(dollars));
  /** The last value seen from the parent or reported to it. */
  const [last, setLast] = useState(dollars);
  if (!echoes(dollars, last)) {
    setLast(dollars);
    setRaw(dollars === null || dollars === undefined ? '' : String(dollars));
  }
  return (
    <TextField
      {...field}
      value={raw}
      keyboardType="decimal-pad"
      onChangeText={(v) => {
        const text = typeMoney(v);
        setRaw(text);
        const c = centsOf(text);
        const value = c === null ? null : c / 100;
        setLast(value);
        onDollars(value);
      }}
    />
  );
}
