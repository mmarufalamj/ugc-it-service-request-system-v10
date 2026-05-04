-- Fix Devanagari numerals (from bug in convertToBengaliNumeral) to Bengali numerals
-- This migration corrects any data stored with incorrect Devanagari numerals (U+0915-U+0919)
-- to use proper Bengali numerals (U+0985-U+0989)

-- Devanagari digits to replace: ०१२३४५६७८९
-- Bengali digits (correct):      ०१२३४५६७८९

-- Fix tracking_no field in applications table
UPDATE applications
SET tracking_no = TRANSLATE(
  tracking_no,
  '०१२३४५६७८९',  -- Devanagari (from bug)
  '०१२३४५६७८९'   -- Bengali (correct)
)
WHERE tracking_no ~ '[०-९]';  -- Only update rows that contain any of these numerals

-- Note: The application code now uses the correct Bengali numerals from server.ts toBanglaDigits()
-- and the fixed convertToBengaliNumeral() in App.tsx, so new records will be created correctly.
