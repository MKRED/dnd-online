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

- **Activation and costs are fields of every ability**, not of one category: attacks and spells have them too.
- **Four categories** (decided with the user on 2026-10-28, [plan/ability-categories.md](../plan/ability-categories.md); until then «Базовая» held both plain text and rules, and there was no «Умение»): «Базовая» (`basic`) — text with an activation, no costs, no «Применение», a trait only as text; «Умение» (`feature`) — class and species features and feats with every cost, «Применение» and a trait with components; «Заклинание» (`spell`); «Монстр» (`monster`). Which activations and costs each category has is `allowedCostKinds` and `activationKindFitsCategory`; the server answers 400 with the reason. A trait of any category has no costs: it works by itself.
- **Activation** is exactly one of: «Действие», «Бонусное действие», «Реакция» and «Без действия» (both with an optional condition, «когда…», up to 200 characters), «Вместо одной атаки», «Время» (1–99 minutes or hours). The action is not split into Magic, Attack and so on yet.
  - Only the «Монстр» category adds «Легендарное действие» with a cost of 1–3 (added 2026-10-19, [monsters.md](monsters.md), «In the app»).
  - A spell has only the 2024 casting times: «Действие», «Бонусное действие», «Реакция», «Время» (2026-10-28; «Без действия» and «Вместо одной атаки» fit no 2024 spell).
  - «Черта» (`{ kind: 'trait' }`) is a passive trait: «Базовая», «Умение» and «Монстр» have it, «Заклинание» doesn't (monsters only until 2026-10-24, then opened to «Базовая» with the user, [plan/done/traits.md](../plan/done/traits.md); since 2026-10-28 a «Базовая» trait is text only and its components belong to «Умение»). What a trait always changes is its `passive` list — the same components as an effect's (Darkvision as «Чувство», Dwarven Resilience as «Сопротивление и иммунитет» plus «Преимущество или помеха», Defense as «Класс доспеха»). Other activations have no components (400). The sheet counts traits in its numbers in both views, «С эффектами» and «Без эффектов»: a trait is part of the character, not a temporary effect.
  - **Departs from the book:** components always apply, so a trait's own condition is written in the description only — Defense gives +1 AC even without armor. Dwarven Toughness can't be expressed yet: there is no Hit Point maximum component, and the maximum is typed in the form.
- **Costs** are four optional kinds, each at most once. «Умение» has all four; «Заклинание» has no «Кость хитов»; «Монстр» has only «Движение» and its «Ограничение» ([monsters.md](monsters.md), «In the app»); «Базовая» and any trait have none:
  - **Заряды** — a number 1–99, the proficiency bonus or an ability modifier (minimum 1), with one of the three recoveries above;
  - **Ячейка заклинаний** of at least level N (1 — any);
  - **Движение** — half the speed, all of it, or a fixed number of feet (5–120, a multiple of 5). The fixed feet are the user's addition (2026-10-15) for homebrew abilities; no 2024 feature found that costs a fixed distance;
  - **Кость хитов** — one.
- **Left out for now**, written in the description: shared pools of the character, spending another ability's use, and use counts that grow with level. All of them belong to the character and come with the link to it.
- **Terms:** «долгий отдых» as in the 2024 translation; «бонус мастерства» kept from the character sheet, though the 2024 translation says «бонус владения» (the user's choice).
- Abilities saved before these fields read as «Действие» without costs.

Code: `packages/shared/src/abilityUsage.ts` (types, `isAbilityActivation`, `isAbilityCosts`) and `abilityUsageLabels.ts` (Russian text); the trait's components are `abilityPassive.ts`, what each category may have `abilityCategoryRules.ts`; the server stores them in `abilities.extra`; the form is `apps/web/src/features/simpleCatalog/UsageField/`, the trait's block «Действует всегда» is `AbilityFields.tsx`.

## Turn actions / Действия за ход

Researched on 2026-10-26, D&D Beyond Free Rules (2024), read word for word:

- Rules Glossary, «Action»: «On your turn, you can take one action» (https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary).
- Rules Glossary, «Bonus Action»: «You can't take more than one Bonus Action on a turn, and you have a Bonus Action to take only if a rule explicitly says so».
- Rules Glossary, «Reaction»: «Once you take a Reaction, you can't take another one until the start of your next turn».
- Slow (https://www.dndbeyond.com/spells/2619066-slow): the target «can't take Reactions. On its turns, it can take either an action or a Bonus Action, not both».

So by the book every creature has one action, at most one Bonus Action and one Reaction per turn; more come only from a feature. **Unverified:** Haste (an extra action limited to some actions) and Action Surge (an extra action, «except the Magic action», quoted above from 2026-10-15) were not reread word for word this time; read them before the combat engine counts them.

### In the app

Decided with the user on 2026-10-26 ([plan/equipment.md](../plan/equipment.md), before stage 4):

- A character (and an NPC, which is a character) has three numbers in the form, «Действия», «Бонусные действия» and «Реакции»: a whole number 1–5, 1 by default. They are the base without effects; the maximum 5 only catches typos.
- **Departs from the book:** the bonus action is 1 for everyone, though the book gives one only when a feature allows it. The number says how many may be taken, not that the character has a use for one.
- Extras from Haste or Action Surge are not typed into the form: they will come as effect or ability components with combat, which will also spend them. Not built yet.
- **In a fight with a turn order** (stage 4 of [plan/combat.md](../plan/combat.md), 2026-10-27) these numbers are the participant's maximums per turn; the «Ваш ход» block spends them and they come back at the start of its own turn ([combat.md](combat.md), «In the app»). A monster gets one of each.
- The sheet shows them as the line «За ход» above «Атаки» with BG3 icons (green circle, orange triangle, purple diamond) and words (variant В, the user's choice). Monsters have no such fields yet; their legendary actions are a separate activation.
- NPC copies in a game library made before these fields read as 1, 1, 1.

Code: `TURN_ACTIONS_*` and `Character.actionCount`/`bonusActionCount`/`reactionCount` in `packages/shared/src/character.ts`; columns `action_count`, `bonus_action_count`, `reaction_count` of `characters` (migration `0061_character_turn_actions`); the form fields in `apps/web/src/features/characters/CharacterForm/CombatSection.tsx`; the sheet line `CharacterSheet/TurnActions.tsx`.
