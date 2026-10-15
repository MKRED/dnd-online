# Ability activation and costs

Reference for how features and spells are used and what they spend (2024 edition). Researched on 2026-10-15.

## Rule

Sources: D&D Beyond, Free Rules (2024):

- «Playing the Game», actions (https://www.dndbeyond.com/sources/dnd/free-rules/playing-the-game);
- «Spells», casting time and slots (https://www.dndbeyond.com/sources/dnd/free-rules/spells);
- «Character Classes» (https://www.dndbeyond.com/sources/dnd/free-rules/character-classes);
- «Character Origins» (https://www.dndbeyond.com/sources/dnd/free-rules/character-origins).

Russian terms: next.dnd.su glossary (https://next.dnd.su/glossary/).

### Activation

- **Action / Действие.** The actions are Attack, Dash, Disengage, Dodge, Help, Hide, Influence, Magic, Ready, Search, Study, Utilize. The Magic action covers "Cast a spell, use a magic item, or use a magical feature". Action Surge gives an extra action "except the Magic action", so the game may later need to know which action.
- **Bonus Action / Бонусное действие** — one per turn, only "when a special ability, a spell, or another feature of the game states" so (Rage, Second Wind, Cunning Action, Lay On Hands).
- **Reaction / Реакция** — "you can't take another one until the start of your next turn"; triggered by an event (Uncanny Dodge: when an attacker you can see hits you).
- **No action** — triggered features that take no action: Halfling Luck (reroll a 1 on a D20 Test), Font of Inspiration and Wild Resurgence ("no action required").
- **Instead of an attack** — Dragonborn Breath Weapon: "you can replace one of your attacks with an exhalation".
- **Longer times** — "some spells require … 1 minute or more"; while casting, take the Magic action each turn and keep Concentration.

### Costs

Several can apply at once, or none (Cunning Action, Uncanny Dodge have no use limit).

- **Own uses.** The count is fixed (Innate Sorcery: twice), equal to the Proficiency Bonus (Breath Weapon, Stonecunning, Adrenaline Rush, Giant Ancestry) or to an ability modifier, minimum once (Bardic Inspiration: Charisma). Some grow with level (Rage, Channel Divinity, Wild Shape).
- **Recovery** has three forms:
  - all on a Long Rest (Breath Weapon, Innate Sorcery, Bardic Inspiration);
  - all on a Short or Long Rest (Adrenaline Rush, Action Surge, Focus Points);
  - one on a Short Rest, all on a Long Rest (Rage, Channel Divinity, Wild Shape, Second Wind).
- **Spell slot.** A spell expends a slot of its level or higher; "On a turn, you can expend only one spell slot to cast a spell"; slots return on a Long Rest (the Warlock's Pact Magic on a Short or Long Rest). Cantrips and Ritual casting use no slot. Features also spend slots (Font of Inspiration, Wild Resurgence).
- **Movement.** Tactical Shift: "move up to half your Speed"; Steady Aim: "your Speed is 0 until the end of the current turn".
- **Hit Point Die.** Lifedrinker: "expend one Hit Point Die".
- **Shared pools** — Focus Points (Monk), Sorcery Points, the Lay On Hands pool — and spending another feature's use (Intimidating Presence spends a Rage use).

## In the app

Decided with the user on 2026-10-15 ([plan/abilities.md](../plan/abilities.md)).

- **Activation and costs are fields of every ability**, not of one category: attacks and spells have them too. There is no «Умение» category.
- **Activation** is exactly one of: «Действие», «Бонусное действие», «Реакция» and «Без действия» (both with an optional condition, «когда…», up to 200 characters), «Вместо одной атаки», «Время» (1–99 minutes or hours). The action is not split into Magic, Attack and so on yet.
- **Costs** are four optional kinds, each at most once:
  - **Заряды** — a number 1–99, the proficiency bonus or an ability modifier (minimum 1), with one of the three recoveries above;
  - **Ячейка заклинаний** of at least level N (1 — any);
  - **Движение** — half the speed, all of it, or a fixed number of feet (5–120, a multiple of 5). The fixed feet are the user's addition (2026-10-15) for homebrew abilities; no 2024 feature found that costs a fixed distance;
  - **Кость хитов** — one.
- **Left out for now**, written in the description: shared pools of the character, spending another ability's use, and use counts that grow with level. All of them belong to the character and come with the link to it.
- **Terms:** «долгий отдых» as in the 2024 translation; «бонус мастерства» kept from the character sheet, though the 2024 translation says «бонус владения» (the user's choice).
- Abilities saved before these fields read as «Действие» without costs.

Code: `packages/shared/src/abilityUsage.ts` (types, `isAbilityActivation`, `isAbilityCosts`) and `abilityUsageLabels.ts` (Russian text); the server stores them in `abilities.extra`; the form is `apps/web/src/features/simpleCatalog/UsageField/`.
