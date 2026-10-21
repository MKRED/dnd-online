# Movement: Speed, other creatures, Dash

How a creature moves on its turn in the 2024 rules, and how the app's figures follow them (plan: [plan/game.md](../plan/done/game.md), stage 7).

Researched 2026-10-21 in the free 2024 rules (the SRD 5.2 text):

- [D&D Beyond Free Rules: Playing the Game](https://www.dndbeyond.com/sources/dnd/free-rules/playing-the-game) (Movement, Moving Around Other Creatures, Playing on a Grid, Creature Size and Space);
- [D&D Beyond Free Rules: Rules Glossary](https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary) (Dash, Difficult Terrain, Speed, Occupied Space);
- cross-checked with [Open5e SRD 2024: Movement and Position](https://api.open5e.com/v2/rules/srd-2024_combat_movement-and-position/) and [Playing on a Grid](https://api.open5e.com/v2/rules/srd-2024_combat_playing-on-a-grid/).

The printed PHB 2024 and the DMG 2024 were not opened; the SRD text could differ from them slightly.

## The rules

- **Speed.** "On your turn, you can move a distance equal to your Speed or less." The move can be broken up around actions: "You can break up your move, using some of its movement before and after any action, Bonus Action, or Reaction you take on the same turn."
- **Dash.** "When you take the Dash action, you gain extra movement for the current turn. The increase equals your Speed after applying any modifiers." With Speed 30 a Dash allows 60 feet; with Speed reduced to 15, 30 feet.
- **Difficult Terrain.** "Every foot of movement in that space costs 1 extra foot", and it "isn't cumulative; either a space is Difficult Terrain or it isn't." The glossary lists what makes a space difficult, among them "a creature that isn't Tiny or your ally".
- **Grid.** Every square costs 1 square of movement (5 feet), "orthogonally or diagonally adjacent"; a square of Difficult Terrain costs 2. "Diagonal movement can't cross the corner of a wall". No 5/10 alternation in the 2024 free rules (the 2014 DMG had it as an option; whether the 2024 DMG keeps one was not checked).
- **Other creatures' spaces.** "During your move, you can pass through the space of an ally, a creature that has the Incapacitated condition, a Tiny creature, or a creature that is two sizes larger or smaller than you." And: "Another creature's space is Difficult Terrain for you unless that creature is Tiny or your ally."
- **Ending a move there.** "You can't willingly end a move in a space occupied by another creature." If a creature "somehow" ends its turn in another's space, it has the Prone condition unless it is Tiny or larger than the other creature.
- **Size and space.** Tiny 2½ × 2½ feet, Small and Medium one square, Large 2 × 2, Huge 3 × 3, Gargantuan 4 × 4.
- **Squeezing.** The 2024 free rules have no «Squeezing into a Smaller Space» rule (2014 had one); only the Difficult Terrain item «a narrow opening sized for a creature one size smaller than you».

What changed from 2014 (from memory of the 2014 PHB, not re-checked): 2014 let you pass any non-hostile creature and a hostile one two sizes apart; 2024 names allies, Incapacitated and Tiny creatures and makes any other creature's space Difficult Terrain. The Prone consequence is new.

## In the app

The walking rules live in `packages/shared/src/map/rules/` (distance, `step.ts`, `path/search.ts`), the other creatures in `occupancy.ts`. A diagonal costs one step like a straight move (`cellDistance` is Chebyshev), difficult terrain from a block's material doubles a step and doesn't stack.

Departures from the book, decided 2026-10-21 while building stage 7:

- **Who is an ally.** The app stores no allegiance. The players' characters are allies of each other; every monster and NPC on the map is not, so it blocks a figure unless it is two sizes larger or smaller, and its space is Difficult Terrain. The GM places a figure anywhere it can stand, so an allied NPC never really traps anyone.
- **Incapacitated** isn't checked yet: creature state comes with stage 8 of the plan.
- **Ending in an occupied space is refused**, so the Prone consequence never comes up.
- **A Medium figure for every character**: a character has no size yet (see [species.md](species.md)), and Small takes the same square.
- **Hidden creatures** (an ambush the GM hid from the players) don't block a player's move: the player doesn't see them, and a refusal would give the ambush away. A figure can end up on a hidden monster's square; the GM sorts it out.
- **The movement allowance** is the figure's Speed (from the sheet with effects) plus one Speed per Dash, spent by each move; the GM refreshes it with «Новый раунд» and grants Dash by hand. The turn order is the GM's, by voice, until combat (stage 9).
- **Monsters and NPCs move too** (decided 2026-10-21, [plan/creature-movement.md](../plan/done/creature-movement.md)): the GM moves them along a path the same way, with an allowance from the stat block's walking Speed (an NPC's sheet Speed), the instance's effects, Dash and «Новый раунд». From a monster's side the other monsters and NPCs are its allies (passed through, not ended on) and the players' characters are not — a house rule, since the app stores no sides; hidden creatures count, the GM sees them. A defeated (0 hit points) monster doesn't move. Code: `apps/server/src/games/creatures/creature-moves.ts`, `apps/web/src/pages/GameScenePage/creatures/useCreatureWalk.ts`.
