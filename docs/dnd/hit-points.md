# Hit points in play

How damage, healing, Temporary Hit Points, dropping to 0 and the death saving throws work in the 2024 rules, and how the game follows them when the GM or a player changes a creature's hit points. Researched on 2026-10-21 in the D&D Beyond free rules (2024): Playing the Game, «Damage and Healing», and the Rules Glossary.

## The rules

- **Hit Points:** "Damage reduces Hit Points, and healing restores them. You can't have more Hit Points than your Hit Point maximum, and you can't have less than 0." (glossary)
- **Healing:** "When you receive healing, add the restored Hit Points to your current Hit Points." "Your Hit Points can't exceed your Hit Point maximum, so any Hit Points regained in excess of the maximum are lost." (14 of 20 healed by 8 → 20.)
- **Temporary Hit Points:**
  - "If you have Temporary Hit Points and take damage, those points are lost first, and any leftover damage carries over to your Hit Points." (5 temporary and 7 damage → 2 Hit Points lost.)
  - "Temporary Hit Points can't be added together. If you have Temporary Hit Points and receive more of them, you decide whether to keep the ones you have or to gain the new ones."
  - "Temporary Hit Points can't be added to your Hit Points, healing can't restore them, and receiving Temporary Hit Points doesn't count as healing." "If you have 0 Hit Points, receiving Temporary Hit Points doesn't restore you to consciousness."
  - "Temporary Hit Points last until they're depleted or you finish a Long Rest."
- **Dropping to 0:** "When a creature drops to 0 Hit Points, it either dies outright or falls unconscious."
  - Massive Damage: "When damage reduces a character to 0 Hit Points and damage remains, the character dies if the remainder equals or exceeds their Hit Point maximum." (Maximum 12, 6 Hit Points, 18 damage → 12 remains → dead.)
  - Monster Death: "A monster dies the instant it drops to 0 Hit Points, although a Dungeon Master can ignore this rule for an individual monster and treat it like a character."
  - Falling Unconscious: "If you reach 0 Hit Points and don't die instantly, you have the Unconscious condition … until you regain any Hit Points, and you now face making Death Saving Throws."
  - Knocking out: a melee attack that would drop a creature to 0 can leave it at 1 Hit Point and Unconscious instead.
- **Death Saving Throws:** the rule and its quotes are in [combat-stats.md](combat-stats.md#death-saving-throws). Damage at 0 Hit Points is one failure (two from a Critical Hit); "If the damage equals or exceeds your Hit Point maximum, you die." A Stable creature that takes damage "stops being Stable and starts making Death Saving Throws again".
- **Bloodied:** "A creature is Bloodied while it has half its Hit Points or fewer remaining." It "has no game effect on its own but … might trigger other game effects" (glossary; Playing the Game, «Hit Points»).
- **What players know of a monster's Hit Points:** the rules give the numbers to the DM only (they are in the stat block). Telling players a monster is bloodied is DMG advice, not a rule.

## In the app

Decided with the user on 2026-10-21 ([plan/game.md](../plan/game.md), «Состояние существ»).

- **A change is what was asked, not a number.** The server computes the new state from «урон 7», «лечение 5», «временные хиты 5» or «спасброски: успехов 1, провалов 2»: the GM and a player edit the same character at once, and a number from a client would overwrite the other edit.
  - `packages/shared/src/hitPoints.ts` — `applyHitPoints` (the rules above) and `creatureHealth` (what others see).
  - `apps/server/src/games/characters/game-character-state.ts` — a player character's change in play, written to the owner's sheet and to the game log as `character.changed` with the state before and after.
- **Damage:** Temporary Hit Points first, then Hit Points, never below 0. A character dropped to 0 with a remainder at least its maximum dies (`instantDeath` in the log; the sheet gets three failures). Damage at 0 is one failure, and a death at its maximum; three successes (Stable) start over. A Critical Hit's second failure is marked by hand.
- **Healing:** up to the maximum; any healing from 0 clears both counts. A dead character (three failures) can't be healed (409) until the counts are cleared by hand: «revived by magic» is the GM's call. An effect with the «Запрет лечения» component (Chill Touch) refuses healing (400) with its name.
- **Temporary Hit Points** are set as a number, which the player chooses (0 removes them): the rules let them pick which to keep.
- **Monsters and NPCs** on the scene (next step of stage 8): no death saves and no instant death — they are down at 0 («Повержен»), and stay on the map until the GM removes them.
- **What others see:** `creatureHealth` — «Ранен» (Bloodied, half the maximum or less), «Без сознания» or «Повержен» at 0, «Погиб» with three failures. The numbers stay with whoever drives the creature.
- **Departures and gaps:**
  - The Unconscious condition isn't put on by the server at 0 Hit Points: the GM adds it (decided with the user).
  - The death saving throw itself is rolled at the table; the counts are set by hand.
  - Knocking out, the Long Rest end of Temporary Hit Points and a reduced Hit Point maximum aren't modelled.
  - The GM can't yet keep an individual monster «like a character» (death saves for a monster).

## Links

- [D&D Beyond free rules — Playing the Game](https://www.dndbeyond.com/sources/dnd/free-rules/playing-the-game)
- [D&D Beyond free rules — Rules Glossary](https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary)
