ALTER TABLE "maps" ADD COLUMN "width" integer DEFAULT 32 NOT NULL;--> statement-breakpoint
ALTER TABLE "maps" ADD COLUMN "depth" integer DEFAULT 32 NOT NULL;--> statement-breakpoint
-- Координаты карты теперь от нуля (docs/plan/map-editor.md, «Размер карты»). Карту с
-- чанками в отрицательных координатах сдвигаем на целое число чанков: меняются только
-- cx, cy, cz, сами данные чанков не трогаются. Журнал такой карты хранит старые
-- координаты, его отмена записала бы блоки не туда — журнал очищается.
DELETE FROM "map_ops" WHERE "map_id" IN (
  SELECT "map_id" FROM "map_chunks" GROUP BY "map_id"
  HAVING min("cx") < 0 OR min("cy") < 0 OR min("cz") < 0
);--> statement-breakpoint
-- Удаление и вставка в одном запросе: построчный UPDATE первичного ключа споткнулся бы
-- о ещё не сдвинутый соседний чанк.
WITH "shift" AS (
  SELECT "map_id", least(min("cx"), 0) AS "x0", least(min("cy"), 0) AS "y0", least(min("cz"), 0) AS "z0"
  FROM "map_chunks" GROUP BY "map_id"
  HAVING min("cx") < 0 OR min("cy") < 0 OR min("cz") < 0
), "moved" AS (
  DELETE FROM "map_chunks" AS "c" USING "shift" AS "s"
  WHERE "c"."map_id" = "s"."map_id"
  RETURNING "c"."map_id", "c"."cx" - "s"."x0" AS "cx", "c"."cy" - "s"."y0" AS "cy", "c"."cz" - "s"."z0" AS "cz", "c"."data"
)
INSERT INTO "map_chunks" ("map_id", "cx", "cy", "cz", "data")
SELECT "map_id", "cx", "cy", "cz", "data" FROM "moved";--> statement-breakpoint
-- Размер карты с блоками — до дальнего края её чанков, у пустой остаётся 32 × 32.
UPDATE "maps" SET
  "width" = "e"."cx1" * 16 + 16,
  "depth" = "e"."cz1" * 16 + 16
FROM (
  SELECT "map_id", max("cx") AS "cx1", max("cz") AS "cz1" FROM "map_chunks" GROUP BY "map_id"
) AS "e"
WHERE "maps"."id" = "e"."map_id";
