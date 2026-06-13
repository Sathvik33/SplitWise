import csv
from io import StringIO
from typing import List, Dict, Any
from datetime import datetime

# Using a fixed rate avoids external API dependency and keeps the app deterministic.
EXCHANGE_RATE_USD_TO_INR = 85.0

class AnomalyDetector:
    def __init__(self):
        self.seen_expenses = {}  # fingerprint -> {row_index, amount, paid_by}

    def parse_date(self, date_str: str) -> datetime:
        """Handle inconsistent date formats (DD/MM/YYYY vs MM-DD-YYYY)"""
        try:
            return datetime.strptime(date_str, "%d/%m/%Y")
        except ValueError:
            try:
                return datetime.strptime(date_str, "%m-%d-%Y")
            except ValueError:
                return None

    def analyze_csv(self, csv_content: str) -> Dict[str, Any]:
        reader = csv.DictReader(StringIO(csv_content))
        
        report = {
            "total_rows": 0,
            "clean_rows": [],
            "anomalies": []
        }

        for i, row in enumerate(reader):
            # Skip comment lines (lines starting with #)
            if row.get("Date", "").startswith("#"):
                continue

            report["total_rows"] += 1
            row_index = i + 2  # +1 for 0-index, +1 for header

            # --- Anomaly 5: Missing Amount ---
            if not row.get("Amount") or str(row.get("Amount")).strip() == "":
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "MISSING_AMOUNT",
                    "description": f"Row {row_index}: The amount field is empty for '{row.get('Description', 'Unknown')}'.",
                    "proposed_action": "SKIP",
                    "options": ["SKIP", "REQUIRE_MANUAL_INPUT"]
                })
                continue

            # --- Anomaly 11: Text in Amount column ---
            try:
                amount = float(row["Amount"])
            except ValueError:
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "INVALID_AMOUNT_FORMAT",
                    "description": f"Row {row_index}: The amount '{row['Amount']}' is not a valid number.",
                    "proposed_action": "REQUIRE_MANUAL_INPUT",
                    "options": ["SKIP", "REQUIRE_MANUAL_INPUT"]
                })
                continue

            # --- Anomaly 12: Zero amount ---
            if amount == 0:
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "ZERO_AMOUNT",
                    "description": f"Row {row_index}: '{row.get('Description', '')}' has a zero amount.",
                    "proposed_action": "SKIP",
                    "options": ["SKIP", "IMPORT_ANYWAY"]
                })
                continue

            # --- Anomaly 2: Negative amount ---
            if amount < 0:
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "NEGATIVE_AMOUNT",
                    "description": f"Row {row_index}: '{row.get('Description', '')}' has a negative amount ({amount}). Is this a refund or an error?",
                    "proposed_action": "CONVERT_TO_REFUND",
                    "options": ["CONVERT_TO_REFUND", "MAKE_POSITIVE", "SKIP"]
                })
                continue

            # --- Anomaly 4: Inconsistent Date Format ---
            parsed_date = self.parse_date(row.get("Date", ""))
            if not parsed_date:
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "INVALID_DATE",
                    "description": f"Row {row_index}: The date '{row.get('Date')}' could not be parsed.",
                    "proposed_action": "SKIP",
                    "options": ["SKIP", "REQUIRE_MANUAL_INPUT"]
                })
                continue

            # --- Anomaly 1 & 3: Duplicates vs Conflicting Entries ---
            expense_fingerprint = f"{row['Date']}_{row['Description']}_{row['Split With']}"
            if expense_fingerprint in self.seen_expenses:
                prev = self.seen_expenses[expense_fingerprint]
                prev_amount = prev["amount"]
                prev_payer = prev["paid_by"]

                if prev_amount == amount and prev_payer == row.get("Paid By", ""):
                    # Anomaly 1: Exact duplicate
                    report["anomalies"].append({
                        "row_index": row_index,
                        "original_data": row,
                        "anomaly_type": "DUPLICATE_ENTRY",
                        "description": f"Row {row_index}: Exact duplicate of Row {prev['row_index']} — same date, description, payer, split, and amount.",
                        "proposed_action": "SKIP",
                        "options": ["SKIP", "IMPORT_AS_DUPLICATE"]
                    })
                else:
                    # Anomaly 3: Same event, different amount or payer
                    report["anomalies"].append({
                        "row_index": row_index,
                        "original_data": row,
                        "anomaly_type": "CONFLICTING_ENTRY",
                        "description": f"Row {row_index}: Conflicts with Row {prev['row_index']} — same event but amount/payer differs ({prev_payer}: ₹{prev_amount} vs {row.get('Paid By')}: ₹{amount}). Which row is correct?",
                        "proposed_action": "SKIP",
                        "options": ["SKIP", "IMPORT_THIS_ROW", "IMPORT_AS_DUPLICATE"]
                    })
                continue
            self.seen_expenses[expense_fingerprint] = {
                "row_index": row_index,
                "amount": amount,
                "paid_by": row.get("Paid By", "")
            }

            # --- Anomaly 8: Settlement logged as expense ---
            # (Check BEFORE currency/timeline so settlements don't get double-flagged)
            if "paid" in row.get("Description", "").lower() and "back" in row.get("Description", "").lower():
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "SETTLEMENT_AS_EXPENSE",
                    "description": f"Row {row_index}: '{row.get('Description')}' looks like a debt settlement, not a shared expense.",
                    "proposed_action": "CONVERT_TO_SETTLEMENT",
                    "options": ["CONVERT_TO_SETTLEMENT", "IMPORT_AS_EXPENSE", "SKIP"]
                })
                continue

            # --- Anomaly 6: USD currency mismatch (Priya's complaint) ---
            if "USD" in row.get("Description", "").upper():
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "CURRENCY_MISMATCH",
                    "description": f"Row {row_index}: '{row.get('Description')}' appears to be in USD but is logged as INR. Apply exchange rate (1 USD = ₹{EXCHANGE_RATE_USD_TO_INR})?",
                    "proposed_action": "APPLY_EXCHANGE_RATE",
                    "options": ["APPLY_EXCHANGE_RATE", "IMPORT_AS_INR", "SKIP"]
                })
                continue

            # --- Anomaly 9 & 10: Member timeline bounds ---
            splits = row.get("Split With", "").split(";")
            splits = [s.strip() for s in splits if s.strip()]

            if "Meera" in splits and parsed_date > datetime(2026, 3, 31):
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "MEMBER_LEFT",
                    "description": f"Row {row_index}: Meera moved out at the end of March, but is included in this {parsed_date.strftime('%B')} expense.",
                    "proposed_action": "REMOVE_MEMBER_FROM_SPLIT",
                    "options": ["REMOVE_MEMBER_FROM_SPLIT", "KEEP_MEMBER", "SKIP"]
                })
                continue
                
            if "Sam" in splits and parsed_date < datetime(2026, 4, 15):
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "MEMBER_NOT_JOINED",
                    "description": f"Row {row_index}: Sam moved in mid-April, but is charged for this {parsed_date.strftime('%B')} expense.",
                    "proposed_action": "REMOVE_MEMBER_FROM_SPLIT",
                    "options": ["REMOVE_MEMBER_FROM_SPLIT", "KEEP_MEMBER", "SKIP"]
                })
                continue

            # --- Anomaly 7: Non-regular member (Dev) ---
            # Dev is a trip guest, not a flatmate. We still import but flag it.
            if "Dev" in splits:
                # Not blocking — just informational. Add to clean rows but note it.
                pass

            # Row is clean — no anomalies detected
            report["clean_rows"].append(row)

        return report

import_engine = AnomalyDetector()
