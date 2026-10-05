# Accessibility

Target: WCAG 2.2 AA, tested with VoiceOver and TalkBack (NFR 01).

- **Contrast:** text 4.5:1 (3:1 at 24px+ or bold 19px+), control borders, focus rings and meaningful icons 3:1, in light **and** dark. The token set is checked; custom combinations must be re-checked.
- **Never colour alone:** status = icon + word + colour; selection = fill + check/bold + colour; unavailable slots are dashed and struck through.
- **Targets:** `touch-min` 48 hit area on everything tappable; 8px between targets.
- **Text scaling:** support the OS text size up to at least 200% without truncating actions or hiding prices. Rows wrap; buttons grow in height; the pinned CTA stays reachable (scroll the content, not the button).
- **Labels:** every icon-only control has an accessible label; form fields have visible labels (not placeholder-only); errors are announced and linked to their field.
- **Focus order** follows reading order; after a booking step, focus moves to the new step heading; after a result, to its title. Visible `focus-ring` for keyboard and switch access.
- **Grouping:** cards announce as one element with a summary ("12D HIFU, Thursday 16 October at 2:30 pm, Confirmed"), with inner actions still reachable.
- **Motion:** see Motion. Reduce Motion and Remove animations are respected live.
- **Time limits:** a slot hold or OTP expiry is shown as text, announced before it runs out, and can be restarted without losing entered data.
- **Language:** plain English, sentence case, no jargon; clinical terms explained on first use.
