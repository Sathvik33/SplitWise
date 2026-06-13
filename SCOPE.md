# SCOPE.md

## Database Schema

Our application uses a strictly relational PostgreSQL database managed with SQLAlchemy.

### Core Tables
1. **users**: `id`, `email`, `name`, `hashed_password`
2. **groups**: `id`, `name`, `created_at`, `image_url`
3. **group_members**: `id`, `group_id`, `user_id`, `joined_at` (for timeline constraints), `left_at` (for members who moved out)
4. **expenses**: `id`, `group_id`, `title`, `amount`, `currency` (supports USD/INR), `original_amount`, `is_settlement`, `paid_by`, `split_type`, `created_at`
5. **expense_splits**: `id`, `expense_id`, `user_id`, `amount_owed`
6. **payments**: `id`, `group_id`, `paid_by`, `paid_to`, `amount`, `date`

## Anomaly Log (`expenses_export.csv`)

During the import phase, the system analyzes `expenses_export.csv` and handles 12 distinct anomalies deliberately placed in the data. We decided **not** to silently guess; instead, every anomaly is surfaced in the interactive React UI where the user selects a resolution policy.

| # | Anomaly Type | Found in Data | Surfaced & Handled Policy |
|---|---|---|---|
| 1 | Negative Amount | Row 8: Wifi Refund (-500) | Policy options: `CONVERT_TO_REFUND`, `MAKE_POSITIVE`, `SKIP`. Default: Treat as a refund (reduces payer's balance). |
| 2 | Overlapping / Duplicates | Row 6 & Row 10: "Dinner at Raj's" | Policy options: `SKIP`, `IMPORT_AS_DUPLICATE`. Default: The engine flags identical dates/descriptions/splits and skips the duplicate. |
| 3 | Conflicting Amounts | Row 6 (1200) vs Row 10 (1500) | Handled alongside Rule 2. The first processed row is flagged for review, and the conflicting duplicate is skipped. |
| 4 | Inconsistent Date Format | Various rows (MM-DD-YYYY vs DD/MM/YYYY) | The engine attempts parsing both formats. If it completely fails, it flags `INVALID_DATE` with option to skip or manual input. |
| 5 | Missing Amount | Row 14: "Movie Tickets" | Policy: `SKIP` or `REQUIRE_MANUAL_INPUT`. Default is skip. |
| 6 | Currency Mismatch | Row 16 & 18: Priya's USD trip | The engine detects "USD" or "Trip" and flags `CURRENCY_MISMATCH`. Policy: `APPLY_EXCHANGE_RATE` or `IMPORT_AS_INR`. Default: Apply conversion rate and store `original_amount` + `currency` in DB. |
| 7 | Non-Regular Member | Row 18: Dev joined for trip | Dev is dynamically added to the trip group timeline constraint but isn't included in flat bills. |
| 8 | Settlement logged as Expense | Row 20: "Rohan paid Aisha back" | The engine detects settlement text and flags `SETTLEMENT_LOGGED_AS_EXPENSE`. Policy: `CONVERT_TO_SETTLEMENT`. Default: Imports into the `payments` table instead of `expenses`. |
| 9 | Member Left Out of Bounds | Row 22: Meera in April | Engine flags `MEMBER_OUT_OF_BOUNDS` since Meera left in March. Policy: `REMOVE_MEMBER_FROM_SPLIT`. |
| 10 | Member Joined Out of Bounds | Row 24: Sam charged for March | Engine flags `MEMBER_OUT_OF_BOUNDS` since Sam moved in mid-April. Policy: `REMOVE_MEMBER_FROM_SPLIT`. |
| 11 | Text in Amount Column | Row 26: "Five Thousand" | Flags `INVALID_AMOUNT_FORMAT`. Policy: `SKIP` or `REQUIRE_MANUAL_INPUT`. |
| 12 | Zero Amount | Row 28: "Free couch pickup" | Flags `ZERO_AMOUNT`. Policy: `SKIP`. |
