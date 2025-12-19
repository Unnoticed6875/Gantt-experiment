CREATE TABLE "scheduling_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"config" jsonb NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "dependencies_source_id_idx" ON "dependencies" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "dependencies_target_id_idx" ON "dependencies" USING btree ("target_id");--> statement-breakpoint
CREATE INDEX "features_status_id_idx" ON "features" USING btree ("status_id");--> statement-breakpoint
CREATE INDEX "features_group_id_idx" ON "features" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "features_owner_id_idx" ON "features" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "features_product_id_idx" ON "features" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "features_initiative_id_idx" ON "features" USING btree ("initiative_id");--> statement-breakpoint
CREATE INDEX "features_release_id_idx" ON "features" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "features_start_at_idx" ON "features" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "features_end_at_idx" ON "features" USING btree ("end_at");--> statement-breakpoint
CREATE INDEX "markers_date_idx" ON "markers" USING btree ("date");