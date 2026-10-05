# TextField

A labelled single-line input with helper and error text below it.

**Props:** `label` (always visible; never placeholder-only), `value`, `placeholder` (an example, not an instruction), `helper`, `error`, `optional` (marks the field "(optional)"; required is the default and is not starred), `disabled`, `icon`, `type`, `inputMode`.

**States:** default, focus (2px `focus` border), filled, error (2px `danger` border + icon + text announced to screen readers), disabled.

**Validation:** validate on blur or submit, not on every keystroke. Error text says how to fix it ("Enter an email like name@example.com"), never "Invalid input".

**Privacy (PRIV 03, NFR 06):** only ask for what the approved purpose needs. No medical history, medications, allergies or photos until the clinical data boundary is approved.

**RN:** `TextInput` with `accessibilityLabel` = label, `textContentType`/`autoComplete` set (tel, email, name, one-time-code), `keyboardType` to match; keep the field visible above the keyboard (`KeyboardAvoidingView`).
