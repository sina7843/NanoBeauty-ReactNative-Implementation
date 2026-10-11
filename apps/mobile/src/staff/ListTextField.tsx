import { useState } from 'react';
import { TextField, type TextFieldProps } from '../components';

export const splitLines = (v: string) => v.split('\n').map((l) => l.trim()).filter(Boolean);
export const splitParagraphs = (v: string) => v.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
export const splitCommas = (v: string) => v.split(',').map((a) => a.trim()).filter(Boolean);

/**
 * A text field whose value is a list (aliases, terms, answer paragraphs). The raw text stays in local state while typing,
 * so spaces, Enter and commas aren't swallowed (ST-1); the list is parsed on every change for the form and the text is
 * tidied on blur. If the list is replaced from outside (Load the latest), the text follows it.
 */
export function ListTextField<T = string>({
  items,
  onItems,
  split,
  join,
  tidyOnBlur = true,
  ...field
}: { items: T[]; onItems: (items: T[]) => void; split: (raw: string) => T[]; join: (items: T[]) => string; /** Off when an unfinished line must survive leaving the field. */ tidyOnBlur?: boolean } & Omit<TextFieldProps, 'value' | 'onChangeText'>) {
  const [raw, setRaw] = useState(join(items));
  const [seen, setSeen] = useState(items);
  if (items !== seen) {
    // The list was replaced from outside (Load the latest): follow it unless it is just what this text parses to.
    setSeen(items);
    if (JSON.stringify(split(raw)) !== JSON.stringify(items)) setRaw(join(items));
  }
  return (
    <TextField
      {...field}
      value={raw}
      onChangeText={(v) => {
        setRaw(v);
        onItems(split(v));
      }}
      onBlur={() => tidyOnBlur && setRaw(join(split(raw)))}
    />
  );
}

type Eligible = { title: string; was: number; now: number };
/** "Signature facial, 180, 144" per line → eligible items (ST-16). Lines without two prices are left out until complete. */
export function splitEligible(v: string): Eligible[] {
  return splitLines(v).flatMap((line) => {
    const m = /^(.*\S)\s*,\s*\$?\s*(\d+(?:\.\d{1,2})?)\s*,\s*\$?\s*(\d+(?:\.\d{1,2})?)$/.exec(line);
    return m ? [{ title: m[1]!.replace(/,\s*$/, ''), was: Number(m[2]), now: Number(m[3]) }] : [];
  });
}
export const joinEligible = (items: Eligible[]) => items.map((i) => `${i.title}, ${i.was}, ${i.now}`).join('\n');
