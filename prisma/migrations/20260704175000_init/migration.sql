-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "preferences" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "cats" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "breed" TEXT NOT NULL,
    "age_label" TEXT,
    "birth_date" DATETIME,
    "avatar_url" TEXT,
    "gender" TEXT,
    "current_weight_kg" REAL,
    "target_weight_kg" REAL,
    "color" TEXT,
    "environment" TEXT,
    "allergies" TEXT,
    "existing_diseases" TEXT,
    "medical_notes" TEXT,
    "microchip_id" TEXT,
    "neutered" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "cats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "weight_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cat_id" TEXT NOT NULL,
    "weight_kg" REAL NOT NULL,
    "note" TEXT,
    "logged_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "weight_logs_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sleep_activity_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cat_id" TEXT NOT NULL,
    "hours_slept" REAL NOT NULL,
    "activity_level" TEXT NOT NULL,
    "manual_bcs" INTEGER,
    "logged_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sleep_activity_logs_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "water_intake_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cat_id" TEXT NOT NULL,
    "amount_ml" INTEGER NOT NULL,
    "logged_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "water_intake_logs_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "food_plans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cat_id" TEXT NOT NULL,
    "meals_per_day" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "food_plans_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "food_plan_id" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "food_name" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "portion" TEXT NOT NULL,
    "reminder_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meals_food_plan_id_fkey" FOREIGN KEY ("food_plan_id") REFERENCES "food_plans" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "vaccinations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cat_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "given_at" DATETIME NOT NULL,
    "due_at" DATETIME,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vaccinations_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "photo_scans" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cat_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "photo_url" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "captured_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bcs_score" INTEGER,
    "bcs_confidence" REAL,
    "weight_estimate_kg" REAL,
    "weight_confidence" REAL,
    "obesity_risk_level" TEXT,
    "coat_condition_score" INTEGER,
    "coat_condition_notes" TEXT,
    "recommendations" TEXT NOT NULL DEFAULT '[]',
    "overall_confidence" REAL,
    "raw_model_response" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "photo_scans_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "photo_scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "health_scores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cat_id" TEXT NOT NULL,
    "overall_score" INTEGER NOT NULL,
    "overall_confidence" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "module_breakdown" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "timeline" TEXT NOT NULL DEFAULT '[]',
    "computed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "health_scores_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cat_id" TEXT NOT NULL,
    "horizon_days" INTEGER NOT NULL,
    "predicted_weight_kg" REAL,
    "predicted_score" INTEGER,
    "confidence" INTEGER NOT NULL,
    "obesity_direction" TEXT NOT NULL,
    "weight_trend" REAL,
    "module_forecasts" TEXT NOT NULL,
    "computed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "predictions_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cat_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "actions" TEXT NOT NULL DEFAULT '[]',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "cat_id" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "action_to" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "dedupe_key" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "notifications_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "dismissed_notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "notification_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dismissed_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cat_id" TEXT NOT NULL,
    "generated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary_text" TEXT NOT NULL,
    "included_sections" TEXT NOT NULL,
    "data_bundle" TEXT NOT NULL,
    "pdf_url" TEXT,
    CONSTRAINT "reports_cat_id_fkey" FOREIGN KEY ("cat_id") REFERENCES "cats" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "cats_user_id_idx" ON "cats"("user_id");

-- CreateIndex
CREATE INDEX "weight_logs_cat_id_logged_at_idx" ON "weight_logs"("cat_id", "logged_at");

-- CreateIndex
CREATE INDEX "sleep_activity_logs_cat_id_logged_at_idx" ON "sleep_activity_logs"("cat_id", "logged_at");

-- CreateIndex
CREATE INDEX "water_intake_logs_cat_id_logged_at_idx" ON "water_intake_logs"("cat_id", "logged_at");

-- CreateIndex
CREATE UNIQUE INDEX "food_plans_cat_id_key" ON "food_plans"("cat_id");

-- CreateIndex
CREATE INDEX "vaccinations_cat_id_given_at_idx" ON "vaccinations"("cat_id", "given_at");

-- CreateIndex
CREATE INDEX "photo_scans_cat_id_captured_at_idx" ON "photo_scans"("cat_id", "captured_at" DESC);

-- CreateIndex
CREATE INDEX "health_scores_cat_id_computed_at_idx" ON "health_scores"("cat_id", "computed_at" DESC);

-- CreateIndex
CREATE INDEX "predictions_cat_id_horizon_days_computed_at_idx" ON "predictions"("cat_id", "horizon_days", "computed_at" DESC);

-- CreateIndex
CREATE INDEX "chat_messages_cat_id_created_at_idx" ON "chat_messages"("cat_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "dismissed_notifications_user_id_notification_id_key" ON "dismissed_notifications"("user_id", "notification_id");

-- CreateIndex
CREATE INDEX "reports_cat_id_generated_at_idx" ON "reports"("cat_id", "generated_at" DESC);
