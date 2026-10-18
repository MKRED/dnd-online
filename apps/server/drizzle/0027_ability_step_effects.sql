CREATE TABLE "ability_step_effects" (
	"ability_id" uuid NOT NULL,
	"step" integer NOT NULL,
	"outcome" varchar(4) NOT NULL,
	"effect_id" uuid NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "ability_step_effects_ability_id_step_outcome_effect_id_pk" PRIMARY KEY("ability_id","step","outcome","effect_id"),
	CONSTRAINT "ability_step_effects_outcome" CHECK ("ability_step_effects"."outcome" in ('hit', 'miss')),
	CONSTRAINT "ability_step_effects_step" CHECK ("ability_step_effects"."step" between 0 and 2)
);
--> statement-breakpoint
ALTER TABLE "ability_step_effects" ADD CONSTRAINT "ability_step_effects_ability_id_abilities_id_fk" FOREIGN KEY ("ability_id") REFERENCES "public"."abilities"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ability_step_effects" ADD CONSTRAINT "ability_step_effects_effect_id_effects_id_fk" FOREIGN KEY ("effect_id") REFERENCES "public"."effects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ability_step_effects_effect_idx" ON "ability_step_effects" USING btree ("effect_id");