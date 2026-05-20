# Product Idea

## Concept

Spicy-to-Nice translates raw, unfiltered feedback into diplomatic, useful communication. It should keep the core message intact while removing insults, emotional excess, unclear phrasing, and unnecessary escalation.

## Standard Mode

In Standard Mode, the user writes or pastes one frustrated message.

Expected flow:

1. User enters a single raw message.
2. User selects the intended audience.
3. User selects the desired tone.
4. App generates one polished feedback draft.

Audience options:

- Manager
- Direct report
- Peer
- Customer

Tone options:

- Diplomatic
- Warm
- Firm
- Concise

## Ranting Mode

Ranting Mode is a special writing flow for stream-of-thought venting.

The user activates it with a clear button and potentially a hotkey. While active, the user can write multiple short or long messages in sequence. Each submitted message becomes a separate rant segment.

Generation should not happen after every segment. The app waits until the user finishes Ranting Mode, then concatenates and normalizes the full set of segments into one polished final draft.

Expected flow:

1. User activates Ranting Mode.
2. User writes multiple rant segments.
3. App stores each segment in order.
4. User can review and remove individual segments.
5. User ends Ranting Mode or presses Generate.
6. App generates one finished diplomatic response from all segments.

Prototype design decisions:

- Standard Mode and Ranting Mode live in a two-option segmented control.
- Ranting Mode keeps the current textarea focused on only one thought at a time.
- Added segments appear immediately in a compact queue.
- Pressing Enter should submit the current message.
- Pressing Shift+Enter should insert a newline.
- In Standard Mode, Enter generates the polished draft.
- In Ranting Mode, Enter saves the current segment.
- The app should not show a polished result until the user presses Generate.
- Pressing Generate in Ranting Mode should include the current unsaved segment.
- Switching from Standard Mode to Ranting Mode should preserve existing text as the first segment.
- Switching from Ranting Mode back to Standard Mode should concatenate saved segments into the textarea.

Important behavior:

- Preserve the real concern across all segments.
- Collapse repetition.
- Resolve emotional wording into specific observations.
- Avoid inventing facts that were not in the user's rant.
- Produce feedback that someone could reasonably send.

## Output Goal

The output should be:

- Diplomatic.
- Actionable.
- Specific.
- Calm.
- Faithful to the user's original meaning.

The output should not:

- Add facts not present in the input.
- Over-soften legitimate concerns.
- Make the user sound fake or corporate.
- Include insults, accusations, or emotional dumping.
