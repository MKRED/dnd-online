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
- **Passive traits** — features with no activation at all that are always on. Checked on 2026-10-24 on D&D Beyond, Free Rules (2024):
  - Dwarf, Darkvision: "You have Darkvision with a range of 120 feet." (https://www.dndbeyond.com/sources/dnd/free-rules/character-origins);
  - Dwarf, Dwarven Resilience: "You have Resistance to Poison damage. You also have Advantage on saving throws you make to avoid or end the Poisoned condition." (same page);
  - Dwarf, Dwarven Toughness: "Your Hit Point maximum increases by 1, and it increases by 1 again whenever you gain a level." (same page);
  - Defense (Fighting Style feat): "While you're wearing Light, Medium, or Heavy armor, you gain a +1 bonus to Armor Class." (https://www.dndbeyond.com/sources/dnd/free-rules/feats).

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

Decided with the user on 2026-10-15 ([plan/done/abilities.md](../plan/done/abilities.md)).

- **Activation and costs are fields of every ability**, not of one category: attacks and spells have them too. There is no «Умение» category.
- **Activation** is exactly one of: «Действие», «Бонусное действие», «Реакция» and «Без действия» (both with an optional condition, «когда…», up to 200 characters), «Вместо одной атаки», «Время» (1–99 minutes or hours). The action is not split into Magic, Attack and so on yet.
  - Only the «Монстра» category adds «Легендарное действие» with a cost of 1–3 (added 2026-10-19, [monsters.md](monsters.md), «In the app»).
  - «Черта» (`{ kind: 'trait' }`) is a passive trait: «Базовая» and «Монстра» have it, «Заклинание» doesn't (monsters only until 2026-10-24, then opened to «Базовая» with the user, [plan/done/traits.md](../plan/done/traits.md)). What a trait always changes is its `passive` list — the same components as an effect's (Darkvision as «Чувство», Dwarven Resilience as «Сопротивление и иммунитет» plus «Преимущество или помеха», Defense as «Класс доспеха»). Other activations have no components (400). The sheet counts traits in its numbers in both views, «С эффектами» and «Без эффектов»: a trait is part of the character, not a temporary effect.
  - **Departs from the book:** components always apply, so a trait's own condition is written in the description only — Defense gives +1 AC even without armor. Dwarven Toughness can't be expressed yet: there is no Hit Point maximum component, and the maximum is typed in the form.
- **Costs** are four optional kinds, each at most once:
  - **Заряды** — a number 1–99, the proficiency bonus or an ability modifier (minimum 1), with one of the three recoveries above;
  - **Ячейка заклинаний** of at least level N (1 — any);
  - **Движение** — half the speed, all of it, or a fixed number of feet (5–120, a multiple of 5). The fixed feet are the user's addition (2026-10-15) for homebrew abilities; no 2024 feature found that costs a fixed distance;
  - **Кость хитов** — one.
- **Left out for now**, written in the description: shared pools of the character, spending another ability's use, and use counts that grow with level. All of them belong to the character and come with the link to it.
- **Terms:** «долгий отдых» as in the 2024 translation; «бонус мастерства» kept from the character sheet, though the 2024 translation says «бонус владения» (the user's choice).
- Abilities saved before these fields read as «Действие» without costs.

Code: `packages/shared/src/abilityUsage.ts` (types, `isAbilityActivation`, `isAbilityCosts`) and `abilityUsageLabels.ts` (Russian text); the trait's components are `abilityPassive.ts`, the categories of an activation `abilityMonster.ts`; the server stores them in `abilities.extra`; the form is `apps/web/src/features/simpleCatalog/UsageField/`, the trait's block «Действует всегда» is `AbilityFields.tsx`.
