-- Четыре категории способностей (docs/plan/ability-categories.md, решение Михаила 2026-10-28).
-- Одна функция на запись справочника и на копию в библиотеке игры: у копии те же
-- category, details и extra в record. updated_at справочника не трогаем: копии мигрируют
-- так же, и библиотека не должна счесть запись изменённой.
CREATE FUNCTION ability_categories_0065(cat text, det jsonb, ext jsonb) RETURNS jsonb
LANGUAGE plpgsql AS $$
DECLARE
  costs jsonb := ext->'costs';
  kind text := ext->'activation'->>'kind';
  uses jsonb;
  amount int;
BEGIN
  IF jsonb_typeof(costs) IS DISTINCT FROM 'object' THEN
    costs := NULL;
  END IF;
  -- «Базовая» с правилами становится «Умением», текст остаётся «Базовой».
  IF cat = 'basic' AND (
    (costs IS NOT NULL AND (
      coalesce(costs->'uses', 'null') <> 'null'
      OR coalesce(costs->'spellSlot', 'null') <> 'null'
      OR coalesce(costs->'movement', 'null') <> 'null'
      OR coalesce(costs->'hitDie', 'false') = 'true'))
    OR (jsonb_typeof(ext->'steps') = 'array' AND jsonb_array_length(ext->'steps') > 0)
    OR (jsonb_typeof(ext->'passive') = 'array' AND jsonb_array_length(ext->'passive') > 0)
  ) THEN
    cat := 'feature';
  END IF;
  -- У черты затрат и перезарядки нет: она действует сама.
  IF kind = 'trait' THEN
    IF costs IS NOT NULL THEN
      costs := '{"uses":null,"spellSlot":null,"movement":null,"hitDie":false}';
    END IF;
    IF cat = 'monster' AND det ? 'recharge' THEN
      det := jsonb_set(det, '{recharge}', 'null');
    END IF;
  END IF;
  -- Монстр не тратит ячеек и костей хитов; заряды — только «Ограничение».
  IF cat = 'monster' AND costs IS NOT NULL THEN
    costs := costs || '{"spellSlot":null,"hitDie":false}';
    uses := costs->'uses';
    IF coalesce(uses, 'null') <> 'null' THEN
      IF coalesce(det->'recharge', 'null') <> 'null' THEN
        -- Перезарядка главнее зарядов.
        uses := 'null';
      ELSIF uses->'count'->>'kind' = 'fixed' THEN
        amount := (uses->'count'->>'amount')::int;
        IF uses->>'recovery' <> 'long' AND amount = 1 THEN
          -- «1, после короткого» и «1, один после короткого» — «после отдыха».
          uses := '{"count":{"kind":"fixed","amount":1},"recovery":"short"}';
        ELSE
          -- Число с любым восстановлением — «N/день».
          uses := jsonb_set(uses, '{recovery}', '"long"');
        END IF;
      ELSE
        -- Бонус мастерства и модификатор у монстра не бывают: остаются в описании.
        uses := 'null';
      END IF;
      costs := jsonb_set(costs, '{uses}', uses);
    END IF;
  END IF;
  -- Заклинание сотворяют действием, бонусным, реакцией или дольше, кость хитов не тратят.
  IF cat = 'spell' THEN
    IF kind IN ('free', 'attack') THEN
      ext := jsonb_set(ext, '{activation}', '{"kind":"action"}');
    END IF;
    IF costs IS NOT NULL THEN
      costs := costs || '{"hitDie":false}';
    END IF;
  END IF;
  IF costs IS NOT NULL THEN
    ext := jsonb_set(ext, '{costs}', costs);
  END IF;
  RETURN jsonb_build_object('category', cat, 'details', det, 'extra', ext);
END
$$;--> statement-breakpoint
UPDATE "abilities" AS a SET "category" = m->>'category', "details" = m->'details', "extra" = m->'extra'
FROM (
  SELECT "id", ability_categories_0065("category", "details", "extra") AS m FROM "abilities"
) AS t
WHERE a."id" = t."id"
  AND (a."category" <> m->>'category' OR a."details" <> m->'details' OR a."extra" <> m->'extra');--> statement-breakpoint
UPDATE "game_library" AS l SET "record" = l."record" || t.m
FROM (
  SELECT "game_id", "kind", "source_id",
    ability_categories_0065("record"->>'category', "record"->'details', "record"->'extra') AS m
  FROM "game_library" WHERE "kind" = 'ability' AND jsonb_typeof("record"->'extra') = 'object'
) AS t
WHERE l."game_id" = t."game_id" AND l."kind" = t."kind" AND l."source_id" = t."source_id"
  AND (l."record"->>'category' IS DISTINCT FROM t.m->>'category'
    OR l."record"->'details' IS DISTINCT FROM t.m->'details'
    OR l."record"->'extra' IS DISTINCT FROM t.m->'extra');--> statement-breakpoint
DROP FUNCTION ability_categories_0065(text, jsonb, jsonb);
