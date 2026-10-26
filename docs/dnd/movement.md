# Movement: Speed, other creatures, Dash, climbing

How a creature moves on its turn in the 2024 rules, and how the app's figures follow them (plan: [plan/game.md](../plan/done/game.md), stage 7).

Researched 2026-10-21 in the free 2024 rules (the SRD 5.2 text):

- [D&D Beyond Free Rules: Playing the Game](https://www.dndbeyond.com/sources/dnd/free-rules/playing-the-game) (Movement, Moving Around Other Creatures, Playing on a Grid, Creature Size and Space);
- [D&D Beyond Free Rules: Rules Glossary](https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary) (Dash, Difficult Terrain, Speed, Occupied Space; Climbing, Climb Speed, High Jump, Falling — read 2026-10-21 for the ledge step);
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

- **Climbing.** Each foot climbed costs 1 extra foot, 2 extra in Difficult Terrain. At the DM's option a slippery surface or one with few handholds needs a DC 15 Strength (Athletics) check.
- **Climb Speed.** It "can be used in place of Speed to traverse a vertical surface without expending the extra movement normally associated with climbing."
- **Switching speeds.** With more than one speed you pick one when you move and may switch during the move; each time, "subtract the distance you've already moved from the new speed", and if nothing is left you can't use the new one. The glossary's example: Speed 30 and Fly Speed 40 — fly 10, walk 10, fly 20 more. An effect that changes Speed changes the special speeds by the same amount.
- **Dash with a special speed.** You may use a special speed instead of your Speed when you Dash, choosing which each time.
- **Falling.** 1d6 Bludgeoning per 10 feet, at most 20d6, and Prone on landing unless no damage is taken. The free rules name no minimum, but under 10 feet the formula gives no damage.
- **High Jump.** 3 + Strength modifier feet after moving 10 feet on foot, half from a standing start; each foot costs a foot of movement. Not used yet.

What changed from 2014 (from memory of the 2014 PHB, not re-checked): 2014 let you pass any non-hostile creature and a hostile one two sizes apart; 2024 names allies, Incapacitated and Tiny creatures and makes any other creature's space Difficult Terrain. The Prone consequence is new.

## In the app

The walking rules live in `packages/shared/src/map/rules/` (distance, `step.ts`, `path/search.ts`), the other creatures in `occupancy.ts`. A diagonal costs one step like a straight move (`cellDistance` is Chebyshev), difficult terrain from a block's material doubles a step and doesn't stack.

Departures from the book, decided 2026-10-21 while building stage 7:

- **Who is an ally.** The app stores no allegiance. The players' characters are allies of each other; every monster and NPC on the map is not, so it blocks a figure unless it is two sizes larger or smaller, and its space is Difficult Terrain. The GM places a figure anywhere it can stand, so an allied NPC never really traps anyone.
- **Incapacitated** isn't checked yet: creature state comes with stage 8 of the plan.
- **Ending in an occupied space is refused**, so the Prone consequence never comes up.
- **A Medium figure for every character**: a character has no size yet (see [species.md](species.md)), and Small takes the same square.
- **Hidden creatures** (an ambush the GM hid from the players) don't block a player's move: the player doesn't see them, and a refusal would give the ambush away. A figure can end up on a hidden monster's square; the GM sorts it out.
- **The movement allowance** is the figure's Speed (from the sheet with effects) plus one Speed per Dash, spent by each move in tactical mode; the GM refreshes it with «Новый раунд» and grants Dash by hand. In free mode it isn't spent (see «Free and tactical modes» below). The turn order is the GM's, by voice, until combat (stage 9).
- **A ledge one block high (5 feet)** is climbed or jumped down without stairs (decided with the user 2026-10-21):
  - up costs 10 feet: the step itself (5, the vertical counts in the same Chebyshev distance) plus 5 for climbing. On Difficult Terrain the costs add up to 15, as the glossary's «2 extra feet» gives;
  - down costs 5, like a plain step: a 5-foot drop deals no damage, so no Prone;
  - straight steps only, no diagonal; the body needs one block of headroom above the lower position (it goes over the edge), so it fails under a low ceiling;
  - two blocks or more stay a wall. Climbing a sheer wall (positions on the wall itself) is a later step;
  - the Athletics check for a slippery wall is the GM's call and isn't rolled;
  - **Climb Speed** removes the extra 5 within its own limit. The allowance is kept per speed, and all feet moved count against each one, so with Speed 30 and Climb 60 a creature that walked 25 still climbs (30 ≤ 60) and then can't walk on (`MoveAllowance`, `movementAllowance`). A character's Climb Speed comes only from effects (the sheet has none), a monster's from the stat block, an NPC's from effects;
  - **Dash adds to both speeds at once** — a simplification: the book has you pick one speed per Dash.
  - Code: `canMove` and `CLIMB_EXTRA_FEET` in `step.ts`, `spentAfter` in `path/search.ts`.
- **Monsters and NPCs move too** (decided 2026-10-21, [plan/creature-movement.md](../plan/done/creature-movement.md)): the GM moves them along a path the same way, with an allowance from the stat block's walking Speed (an NPC's sheet Speed), the instance's effects, Dash and «Новый раунд». From a monster's side the other monsters and NPCs are its allies (passed through, not ended on) and the players' characters are not — a house rule, since the app stores no sides; hidden creatures count, the GM sees them. A defeated (0 hit points) monster doesn't move. Code: `apps/server/src/games/creatures/creature-moves.ts`, `apps/web/src/pages/GameScenePage/creatures/useCreatureWalk.ts`.

## Free and tactical modes

A house rule of the app, decided with the user 2026-10-24 (mockup «Режимы хода на сцене», variant В). It isn't taken from the books: the 2024 rules weren't searched for a rule on moving outside combat, so nothing here claims to be one.

- **Free mode** («вне боя»): a move is still limited to the creature's Speed (with its effects and climbing, as above), but it spends nothing: right after the move the allowance is full again, so a figure walks on at once. One move can't cross the whole map. Dash and «Новый раунд» aren't there (the server refuses them, 409): the allowance is full anyway.
- **Tactical mode** («бой»): the allowance is spent move by move until the GM's «Новый раунд», as before; Dash works.
- **Who switches:** only the GM, with «Начать бой» and «Закончить бой» on the scene page. Starting combat gives everyone a fresh turn, as if the fight just began: every figure, monster and NPC of the active scene gets its full allowance and the round count starts at 1; «Новый раунд» counts on from there. Ending combat refreshes everyone too and drops the round number.
- **Monsters and NPCs** follow the same mode as the figures.
- **Movement only:** actions, attacks and initiative aren't built yet (stages 7–9 of [plan/map.md](../plan/map.md)); when they come, the turn order will live in tactical mode.
- **Kept by the game**, not the scene: the mode stays across scene switches and sessions; a scene made active during combat starts at round 1 again. New and existing games start in free mode.
- **Players** see «Бой · раунд N» over the scene during combat and a short notice when the GM starts or ends it; in free mode the allowance reads «до 30 фт за ход».
- Code: `apps/server/src/games/figures/move-mode.ts` and `move-mode-read.ts` (the mode and the round in `games.move_mode` and `combat_round`), `isFree` in `figure-moves.ts` and `creatures/creature-moves.ts`; on the page `pages/GameScenePage/combat/`.

## Outside a session

A house rule of the app, decided with the user 2026-10-25: while the GM hasn't started a session (or has ended it), a player only watches the scene. They see the scene, move the camera, cut and read the cards, but don't move or drag a figure and don't change a character's Hit Points, death saves, slots or effects from the game. That holds for the owner and the controller alike. The server refuses with 403 «Встреча не идёт: сцену можно только смотреть». The GM isn't limited: they can arrange the scene before the session.

- Code: `apps/server/src/games/session-gate.ts` (`assertPlayerInSession`), called by `GameFiguresService` and `GameCharactersService`; the drag over the socket is dropped in `realtime/figure-drag.ts`.
