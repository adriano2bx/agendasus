UPDATE "convocations" AS "convocation"
SET "selected_phone_id" = (
  SELECT "phone"."id"
  FROM "patient_phones" AS "phone"
  WHERE "phone"."patient_id" = "convocation"."patient_id"
    AND "phone"."selected_for_whatsapp" = TRUE
    AND "phone"."valid" = TRUE
    AND "phone"."mobile" = TRUE
  ORDER BY "phone"."created_at" ASC
  LIMIT 1
)
WHERE "convocation"."selected_phone_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "patient_phones" AS "phone"
    WHERE "phone"."patient_id" = "convocation"."patient_id"
      AND "phone"."selected_for_whatsapp" = TRUE
      AND "phone"."valid" = TRUE
      AND "phone"."mobile" = TRUE
  );
