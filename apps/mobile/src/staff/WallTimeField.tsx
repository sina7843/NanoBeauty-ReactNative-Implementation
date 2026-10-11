import { useEffect, useState } from 'react';
import { TextField } from '../components';
import { t } from '../i18n';
import { fromWallInput, toWallInput } from './dates';

/** A clinic-time date field: keeps what was typed until it is a real date, then writes the ISO instant (empty = null). */
export function WallTimeField({ label, iso, tz, disabled, onChange, onValidity }: { label: string; iso: string | null; tz: string; disabled?: boolean; onChange: (iso: string | null) => void; /** ST-4: false while the typed text isn't a real date, so callers can disable Save/Schedule. */ onValidity?: (valid: boolean) => void }) {
  const [text, setText] = useState(toWallInput(iso, tz));
  useEffect(() => onValidity?.(true), []); // eslint-disable-line react-hooks/exhaustive-deps
  const bad = text.trim() !== '' && !fromWallInput(text, tz);
  return (
    <TextField
      label={label}
      value={text}
      placeholder="2026-10-31 23:59"
      error={bad ? t('ent.dateInvalid') : undefined}
      disabled={disabled}
      onChangeText={(v) => {
        setText(v);
        const next = fromWallInput(v, tz);
        onValidity?.(!!next || v.trim() === '');
        if (next || v.trim() === '') onChange(next);
      }}
    />
  );
}
