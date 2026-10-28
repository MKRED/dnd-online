# Combat: initiative, turns and the Attack action

How a fight runs in the 2024 rules — initiative, rounds and turns, the Attack action, Unarmed Strike, the attack roll — and how the app's turn-based combat follows them (plan: [plan/combat.md](../plan/combat.md)).

Researched 2026-10-27 in the free 2024 rules, read on D&D Beyond:

- [Playing the Game](https://www.dndbeyond.com/sources/dnd/free-rules/playing-the-game) (Combat: The Order of Combat, Combat Step by Step, Initiative, Your Turn, Breaking Up Your Move, Making an Attack, Attack Rolls, Rolling 20 or 1, Ranged Attacks in Close Combat, Opportunity Attacks);
- [Rules Glossary](https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary) (Initiative, Surprise, Attack [Action], Unarmed Strike, Critical Hit, Opportunity Attacks, Disengage, Dodge, Help, Ready, Reaction, Incapacitated, Invisible);
- [Equipment](https://www.dndbeyond.com/sources/dnd/br-2024/equipment) (Light property, Nick mastery).

The printed PHB 2024 and DMG 2024 were not opened. Extra Attack is a class feature and its text wasn't read.

## The rules

### Initiative

- "Every participant rolls Initiative; they make a Dexterity check that determines their place in the Initiative order."
- "The DM rolls for monsters." "For a group of identical creatures, the DM makes a single roll, so each member of the group has the same Initiative."
- **Ties:** "If a tie occurs, the DM decides the order among tied monsters, and the players decide the order among tied characters. The DM decides the order if the tie is between a monster and a player character."
- **Initiative score:** "Sometimes a DM might have combatants use their Initiative scores instead of rolling Initiative." "Your Initiative score equals 10 plus your Dexterity modifier." Advantage adds 5, Disadvantage subtracts 5.
- **Surprise:** "If a creature is caught unawares by the start of combat, that creature is surprised, which causes it to have Disadvantage on its Initiative roll." Example: "if an ambusher starts combat while hidden from a foe who is unaware that combat is starting, that foe is surprised." Nothing else: a surprised creature doesn't lose its first turn (the 2014 rule did, from memory of the 2014 PHB, not re-checked).
- **Conditions at the roll:** Incapacitated — "If you're Incapacitated when you roll Initiative, you have Disadvantage on the roll"; Invisible — "If you're Invisible when you roll Initiative, you have Advantage on the roll."

### Rounds and turns

- "A round represents about 6 seconds in the game world." Steps: "Establish Positions", "Roll Initiative", "Take Turns": "Each participant in the battle takes a turn in Initiative order." "When everyone involved in the combat has had a turn, the round ends." "Repeat this step until the fighting stops."
- "The Initiative order remains the same from round to round."
- **Your turn:** "On your turn, you can move a distance up to your Speed and take one action." "You decide whether to move first or take your action first." The move can be broken up around the action ([movement.md](movement.md)).
- **One object for free:** "You can interact with one object or feature of the environment for free, during either your move or action." "If you want to interact with a second object, you need to take the Utilize action." The app's weapon swap is a house rule on top of this ([weapons-armor.md](weapons-armor.md)).
- "You can forgo moving, taking an action, or doing anything at all on your turn."
- **No Delay:** the 2024 rules have no action to delay a turn; the text suggests "the defensive Dodge action or the Ready action to delay acting". Outside one's turn a creature acts only with a Reaction: "You can take a Reaction on another creature's turn."

### The Attack action

- "When you take the Attack action, you can make one attack roll with a weapon or an Unarmed Strike."
- "If you move on your turn and have a feature, such as Extra Attack, that gives you more than one attack as part of the Attack action, you can use some or all of that movement to move between those attacks."
- **Light:** "When you take the Attack action on your turn and attack with a Light weapon, you can make one extra attack as a Bonus Action later on the same turn." "That extra attack must be made with a different Light weapon, and you don't add your ability modifier to the extra attack's damage unless that modifier is negative."
- **Nick (mastery):** "When you make the extra attack of the Light property, you can make it as part of the Attack action instead of as a Bonus Action." "You can make this extra attack only once per turn."

### Unarmed Strike

- "Instead of using a weapon to make a melee attack, you can use a punch, kick, headbutt, or similar forceful blow", against a target "within 5 feet of you".
- **Damage:** "Your bonus to the roll equals your Strength modifier plus your Proficiency Bonus." "On a hit, the target takes Bludgeoning damage equal to 1 plus your Strength modifier."
- **Grapple and Shove** (not used yet): the target makes a Strength or Dexterity save (its choice) against "8 plus your Strength modifier and Proficiency Bonus"; Grapple needs a free hand, both need a target no more than one size larger.

### Making an attack

- "1. Choose a Target." "2. Determine Modifiers." (Cover, Advantage, Disadvantage.) "3. Resolve the Attack." "On a hit, you roll damage unless the particular attack has rules that specify otherwise."
- "An attack roll hits if the roll equals or exceeds the target's Armor Class."
- **20 and 1:** "If you roll a 20 on the d20 for an attack roll, you score a Critical Hit, and the attack hits regardless of any modifiers or the target's AC." "Roll all of the attack's damage dice twice and add them together. Then add any relevant modifiers." "If you roll a 1 on the d20 … the attack misses regardless of any modifiers or the target's AC."
- **Unseen:** "When you make an attack roll against a target you can't see, you have Disadvantage on the roll." "When a creature can't see you, you have Advantage on attack rolls against it."
- **Ranged in close combat:** "you have Disadvantage on the roll if you are within 5 feet of an enemy who can see you and doesn't have the Incapacitated condition."
- Range, long range and reach: [attacks-and-saves.md](attacks-and-saves.md#attack-bonus-damage-range-and-reach). How the app finds cover on the map: [plan/map.md](../plan/map.md) («Линия видимости и укрытие»).
- **Range** (Playing the Game, Range): "The smaller number is the normal range, and the larger number is the long range. Your attack roll has Disadvantage when your target is beyond normal range, and you can't attack a target beyond long range."
- **Cover** (Rules Glossary, Cover): "Half Cover (+2 bonus to AC and Dexterity saving throws), Three-Quarters Cover (+5 bonus to AC and Dexterity saving throws), and Total Cover (can't be targeted directly). If behind more than one degree of cover, a target benefits only from the most protective degree."
- **Paralyzed and Unconscious** (Rules Glossary): "Attack rolls against you have Advantage." "Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you."

### Damage against defenses

Researched 2026-10-28 in the same free rules (Rules Glossary: Resistance, Vulnerability, Immunity, Round Down; Playing the Game: Order of Application, No Stacking).

- **Resistance:** "damage of that type is halved against you (round down). Resistance is applied only once to an instance of damage." **Vulnerability:** "damage of that type is doubled against you."
- **Order:** "adjustments such as bonuses, penalties, or multipliers are applied first; Resistance is applied second; and Vulnerability is applied third." Several of either count as one ("Multiple instances of Resistance or Vulnerability that affect the same damage type count as only one instance").
- **Immunity:** "Immunity to a damage type means you don't take damage of that type."

### Other actions and reactions

- **Opportunity Attack:** "You can make an Opportunity Attack when a creature that you can see leaves your reach using its action, its Bonus Action, its Reaction, or one of its speeds." "To make the Opportunity Attack, take a Reaction to make one melee attack with a weapon or an Unarmed Strike against the provoking creature."
- **Disengage:** "your movement doesn't provoke Opportunity Attacks for the rest of the current turn."
- **Dodge:** "until the start of your next turn, any attack roll made against you has Disadvantage if you can see the attacker, and you make Dexterity saving throws with Advantage." "You lose these benefits if you have the Incapacitated condition or if your Speed is 0."
- **Help:** Advantage on an ally's next check with a chosen skill or tool, or "You momentarily distract an enemy within 5 feet of you, giving Advantage to the next attack roll by one of your allies against that enemy."
- **Ready:** "which lets you act by taking a Reaction before the start of your next turn."
- **Incapacitated:** "You can't take any action, Bonus Action, or Reaction." Concentration breaks; Disadvantage on Initiative (above).

## In the app

Decided with the user on 2026-10-27 and 2026-10-28 (plan: [plan/combat.md](../plan/combat.md), mockups linked there). Built so far: stages 2–5 — the server's turn order (participants, the Initiative roll with its parts, the order with ties, turns and rounds: `apps/server/src/games/combat/`; the roll in `packages/shared/src/d20Roll.ts`, Initiative and the order in `initiative.ts`), the roll window and the portrait strip, the turn resources with the «Ваш ход» block (`combat-actions.ts`, `combat-ability-use.ts`, `packages/shared/src/combatAbilityUse.ts`, `apps/web/src/pages/GameScenePage/combat/TurnPanel/`), and a hero's attack with a weapon or an Unarmed Strike (the rules in `packages/shared/src/attack/`, the server in `apps/server/src/games/combat/attack/`, the window in `combat/AttackWindow/`). Monsters' and NPCs' attacks are stage 6.

- **The server rolls every die**, players press «Бросить кубик» in a roll window and see the server's result animated ([plan/map.md](../plan/map.md), «Сервер — источник истины»).
- **Initiative is rolled** by each player for their character; the GM rolls for monsters and NPCs with one button, and for absent players with another («Бросить за героев», every unrolled hero at once, decided with Mikhail 2026-10-28) or for one through the portrait menu. The GM can correct any number.
- **Departs from the book — each monster rolls its own Initiative**, even identical ones (the user's choice: the book makes one roll per group).
- **Ties — the app's order instead of the DM's and players' choice:** the higher Initiative modifier goes first, then chance; the GM can reorder by hand afterwards.
- **Who takes part:** the GM marks the participants in a «Начать бой» window (the ones the party sees are marked by default) and can mark any of them «врасплох» — Disadvantage on the Initiative roll, as the 2024 Surprise rule says. A newcomer can join a running fight: it rolls Initiative and takes its place by the number; if that place has already passed this round, it acts from the next one.
- **Advantage and Disadvantage** on a roll come from the rules and effects (Invisible, Incapacitated, surprise …), and the GM can switch them on any roll — the DM's right in the book ("The DM determines … whether you have Advantage or Disadvantage"). For Initiative — a Dexterity check — the app counts the effect components on Initiative, on Dexterity or all ability checks and on all D20 Tests, Advantage and Roll bonus alike; the conditional ones («while the source is in sight») aren't counted yet (`initiativeRollInput`).
- **The Initiative modifier:** a character's and an NPC's Dexterity modifier (the sheet has no other Initiative bonus), a monster's Initiative from its stat block. It also breaks ties.
- **One attack per Attack action for now** — the action is spent, and without it there is no attack. Extra Attack and Multiattack aren't counted yet (the sheet has no field for them). The Light property's extra attack as a Bonus Action follows the book; Nick isn't used yet.
- **Damage applies at once**, the GM corrects Hit Points by hand if needed; players see the roll and «Попадание» or «Промах», never the target's AC or Hit Points.
- **Height gives no bonus — as in the book** (the user's choice, 2026-10-28). The 2024 free rules read for this file have no high-ground modifier: an attack's Advantage, Disadvantage and AC change come from the listed causes and cover only. Baldur's Gate 3 adds one — +2 to attack rolls from 2.5 m (8 ft) above the target, −2 from as far below ([bg3.wiki, High ground rules](https://bg3.wiki/wiki/High_ground_rules), read 2026-10-28) — and the app doesn't. Height counts only through distance (vertical as horizontal, `boxDistance` in `packages/shared/src/map/rules/distance.ts`) and cover: a Medium hero reaches a Medium neighbour 1–2 blocks higher or lower with a 5-ft. weapon, not 3; a Small one (1 block tall) 2 blocks above but only 1 below (`creatureCells`, tests in `distance.test.ts`).
- **«Новый раунд» goes away** in tactical mode: the round ends by itself after the last turn in the order.
- **Turn resources** (stage 4, decided with the user 2026-10-27): a character's and an NPC's numbers of actions, Bonus Actions and Reactions per turn are the sheet's «За ход» ([ability-usage.md](ability-usage.md)), a monster's are one each. They all come back at the start of the participant's own turn — the Rules Glossary's «Reaction»: "Once you take a Reaction, you can't take another one until the start of your next turn" (quoted in [ability-usage.md](ability-usage.md)); for the action and the Bonus Action, taken only on one's own turn, that is the same thing. An action and a Bonus Action only on one's own turn, a Reaction any time. The GM can correct what was spent.
- **Dash, Disengage and Dodge** each spend the action and write a log entry. Dash adds one Speed to the allowance of this turn ([movement.md](movement.md)); the GM's own Dash on a creature's card stays a free GM correction. Dodge lasts until the start of the participant's next turn and Disengage until the end of the current one (when the turn passes on), both shown as a mark on the strip portrait to everyone who sees the participant. **Departs from the book for now:** Dodge isn't lost on Incapacitated or Speed 0, and Disengage changes nothing yet — there are no Opportunity Attacks. Dodge gives Disadvantage on attacks against the dodger since stage 5.
- **«Применить» an ability** spends the action of its activation (an attack-replacing one spends the action) and, for a spell with a slot, a slot of the chosen level at least the spell's; an unprepared spell can't be cast. **A simplification:** what the ability does the GM applies by hand; its uses, movement and Hit Point Dice aren't spent yet, and a monster's «N в день» isn't counted. Traits aren't in the block; time-long and legendary activations can't be used from it.
- **Help and Hide** aren't in the block yet: without a target and a check they would do nothing.
- **Not counted yet:** Delay doesn't exist (as in the book); Ready, Help, Grapple, Shove, Opportunity Attacks, weapon masteries (only a caption for now), thrown weapons and Legendary Actions wait for later stages.
