# Vision

Reference for how far and what creatures see (2024 edition), for the fog of war on the map. Researched on 2026-10-21.

## Rule

Sources: D&D Beyond, Free Rules (2024):

- «Playing the Game», Exploration → «Vision and Light», «Light», «Obscured Areas»; Combat → «Cover», «Unseen Attackers and Targets» (https://www.dndbeyond.com/sources/dnd/free-rules/playing-the-game);
- «Rules Glossary», «Bright Light», «Dim Light», «Darkness», «Blinded», «Darkvision», «Blindsight» (https://www.dndbeyond.com/sources/dnd/free-rules/rules-glossary).

What the books say:

- **Bright Light** lets most creatures see normally. There is **no sight range** in the rules: a range exists only for special senses (Darkvision, Blindsight; see [senses.md](senses.md)).
- **Dim Light** makes a Lightly Obscured area: Disadvantage on Wisdom (Perception) checks that rely on sight.
- **Darkness** makes a Heavily Obscured area: a creature trying to see something there has the Blinded condition.
- **Blinded**: the creature can't see and automatically fails ability checks that require sight.
- **Walls blocking sight are not written as a rule.** The books speak of «line of sight» (Hide, Frightened) without defining it, and of walls and creatures only as Cover for attacks and saves. Blindsight sees anything not behind Total Cover, which is the closest the text comes to a definition.
- **A creature behind another creature** is only Half Cover for attacks; nothing says it can't be seen.
- **Facing** doesn't exist in the 2024 rules ([facing.md](facing.md)): a creature sees all around.

Unverified: the glossary text of Hide, Invisible and Heavily Obscured was read only as a summary, not word for word.

## How the app counts it

Decided with the user on 2026-10-21, for the fog of war ([docs/plan/done/fog-of-war.md](../plan/done/fog-of-war.md)).

- **Line of sight is the sight-mode ray** of the map rules (`packages/shared/src/map/rules/segment.ts`, `RayMode = 'sight'`): opaque blocks stop it, glass and ice don't. A creature counts as seen if it doesn't have Total Cover in sight mode from the viewer's eyes (`cover.ts`), the same test as for picking a target.
- **What a ray looks at** (fixed with the user on 2026-10-24, after holes in the players' view): rays go to the cells near a surface that have open space in them, not only to air. Glass and ice count as air, so the floor under a glass column and a block walled in by glass show up. A cell with furniture or a built-in container counts as seen once the ray reaches the cell: a chest no longer hides its own cell and the floor under it. An opaque partial block (slab, stairs, thin wall, pillar) is looked at through the open part of its cell, and it shows the blocks beyond the faces it doesn't close fully: the floor under an upper slab and the wall beside stairs are seen, a block behind a thin wall that covers its whole face is not. Code: `rules/vision/sightTarget.ts`.
- **Creatures don't block sight.** Following the book: they are only Half Cover.
- **All around, no facing.**
- **Sight range — a house rule.** The books have none in Bright Light, but there is no lighting on the map yet, and unlimited sight on a large open map is too expensive to count on every move. Until lighting lands, every scene is treated as Bright Light and the GM sets its **sight range** in feet. The range is a separate value per viewer, so that Darkness, Darkvision and Blinded can later change it for one creature without rewriting the fog.
- **An Unconscious creature doesn't see.** The condition makes it unaware of its surroundings ([conditions.md](conditions.md)), so a down or dead character gives the fog no sight (range 0). This follows from the condition and isn't a house rule.
- **Not counted yet:** light and darkness, Darkvision and other senses, Blinded, Invisible, the Hide action.

Where it lives in code: `packages/shared/src/map/rules/vision/` (`visibleCells`, `bodySeen`, `revealBody`, `partySight`, cell masks); who looks and when the fog is recounted — `apps/server/src/games/fog/`; the rest of the fog is planned in [docs/plan/done/fog-of-war.md](../plan/done/fog-of-war.md). The default sight range is 60 ft, at most 120 ft (measured on 2026-10-21, see the plan).
