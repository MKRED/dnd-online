-- Героическое вдохновение стало числом: было — 1, не было — 0. Умолчание false
-- не приводится к integer само, поэтому его снимаем и ставим заново.
ALTER TABLE "characters" ALTER COLUMN "heroic_inspiration" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "heroic_inspiration" SET DATA TYPE integer USING (CASE WHEN "heroic_inspiration" THEN 1 ELSE 0 END);--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "heroic_inspiration" SET DEFAULT 0;
