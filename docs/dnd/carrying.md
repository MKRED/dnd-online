# Carrying capacity

Reference for how much a character can carry (2024 edition). Researched on 2026-10-15.

## Rule

Source: D&D Beyond, Free Rules (2024), Rules Glossary, «Carrying Capacity» (https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary).

- "Your size and Strength score determine the maximum weight in pounds that you can carry … The table also shows the maximum weight you can drag, lift, or push."
- "While dragging, lifting, or pushing weight in excess of the maximum weight you can carry, your Speed can be no more than 5 feet."

| Size         | Carry          | Drag / lift / push |
| ------------ | -------------- | ------------------ |
| Tiny         | Str. × 7.5 lb. | Str. × 15 lb.      |
| Small/Medium | Str. × 15 lb.  | Str. × 30 lb.      |
| Large        | Str. × 30 lb.  | Str. × 60 lb.      |
| Huge         | Str. × 60 lb.  | Str. × 120 lb.     |
| Gargantuan   | Str. × 120 lb. | Str. × 240 lb.     |

- There are no encumbrance tiers in 2024 (the −10 ft. «encumbered» variant was a 2014 optional rule).
- Every playable species is Small or Medium ([species.md](species.md)), so one multiplier covers them all.
- The Goliath's Powerful Build: "You also count as one size larger when determining your carrying capacity" (dnd2024.wikidot, `/species:goliath`).

## In the app

Decided with the user on 2026-10-15 ([plan/character-inventory.md](../plan/character-inventory.md)).

- Capacity is Strength × 15 to carry and Strength × 30 to drag, lift or push, for every character.
- **Departure from the book:** the Goliath's Powerful Build is not applied. Species and class traits will later be attached to the character and change its numbers themselves.
- Over capacity, nothing is blocked: the sheet only shows the load in red. What it costs in play is decided in the session.
- The load counts only items «При себе» (`carried`), not the «Хранилище» (`stash`). A hidden item does not act on the character, so an item hidden from the character's owner is left out: its author, viewing the shared sheet, sees it marked «Не действует» (`inactive`). A viewer also doesn't see (or count) items hidden from them, so their load can be lower than the owner's, never higher. A deleted item is gone.
- Coin weight (50 coins = 1 lb., [items.md](items.md)) is not counted yet.

Code: `packages/shared/src/carrying.ts` — `carryingCapacity(strength)` and `carriedLoad(entries)` (in hundredths of a pound, so fractional weights don't drift).
