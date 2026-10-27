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
- Range, long range and reach: [attacks-and-saves.md](attacks-and-saves.md#attack-bonus-damage-range-and-reach). Cover: [plan/map.md](../plan/map.md) («Линия видимости и укрытие»).

### Other actions and reactions

- **Opportunity Attack:** "You can make an Opportunity Attack when a creature that you can see leaves your reach using its action, its Bonus Action, its Reaction, or one of its speeds." "To make the Opportunity Attack, take a Reaction to make one melee attack with a weapon or an Unarmed Strike against the provoking creature."
- **Disengage:** "your movement doesn't provoke Opportunity Attacks for the rest of the current turn."
- **Dodge:** "until the start of your next turn, any attack roll made against you has Disadvantage if you can see the attacker, and you make Dexterity saving throws with Advantage." "You lose these benefits if you have the Incapacitated condition or if your Speed is 0."
- **Help:** Advantage on an ally's next check with a chosen skill or tool, or "You momentarily distract an enemy within 5 feet of you, giving Advantage to the next attack roll by one of your allies against that enemy."
- **Ready:** "which lets you act by taking a Reaction before the start of your next turn."
- **Incapacitated:** "You can't take any action, Bonus Action, or Reaction." Concentration breaks; Disadvantage on Initiative (above).

## In the app

Decided with the user on 2026-10-27 (plan: [plan/combat.md](../plan/combat.md), mockups linked there). Not built yet: this section describes what the plan builds, stage by stage.

- **The server rolls every die**, players press «Бросить кубик» in a roll window and see the server's result animated ([plan/map.md](../plan/map.md), «Сервер — источник истины»).
- **Initiative is rolled** by each player for their character; the GM rolls for monsters and NPCs with one button, and for an absent player. The GM can correct any number.
- **Departs from the book — each monster rolls its own Initiative**, even identical ones (the user's choice: the book makes one roll per group).
- **Ties — the app's order instead of the DM's and players' choice:** the higher Initiative modifier goes first, then chance; the GM can reorder by hand afterwards.
- **Who takes part:** the GM marks the participants in a «Начать бой» window (the ones the party sees are marked by default) and can mark any of them «врасплох» — Disadvantage on the Initiative roll, as the 2024 Surprise rule says. A newcomer can join a running fight: it rolls Initiative and takes its place by the number; if that place has already passed this round, it acts from the next one.
- **Advantage and Disadvantage** on a roll come from the rules and effects (Invisible, Incapacitated, surprise …), and the GM can switch them on any roll — the DM's right in the book ("The DM determines … whether you have Advantage or Disadvantage").
- **One attack per Attack action for now** — the action is spent, and without it there is no attack. Extra Attack and Multiattack aren't counted yet (the sheet has no field for them). The Light property's extra attack as a Bonus Action follows the book; Nick isn't used yet.
- **Damage applies at once**, the GM corrects Hit Points by hand if needed; players see the roll and «Попадание» or «Промах», never the target's AC or Hit Points.
- **«Новый раунд» goes away** in tactical mode: the round ends by itself after the last turn in the order.
- **Not counted yet:** Delay doesn't exist (as in the book); Ready, Help, Grapple, Shove, Opportunity Attacks and Legendary Actions wait for later stages.
