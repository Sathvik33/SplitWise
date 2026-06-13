import csv
from io import StringIO
from typing import List, Dict, Any
from datetime import datetime

class AnomalyDetector:
    def __init__(self):
        self.seen_expenses = set()

    def parse_date(self, date_str: str) -> datetime:
        # Handle inconsistent date formats (Anomaly 4)
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
            # Skip comment lines
            if row.get("Date", "").startswith("#"):
                continue

            report["total_rows"] += 1
            row_index = i + 2 # +1 for 0-index, +1 for header
            is_anomaly = False

            # Anomaly 5: Missing Amount
            if not row.get("Amount") or str(row.get("Amount")).strip() == "":
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "MISSING_AMOUNT",
                    "description": "The amount field is empty.",
                    "proposed_action": "SKIP",
                    "options": ["SKIP", "REQUIRE_MANUAL_INPUT"]
                })
                is_anomaly = True
                continue

            # Anomaly 11: Text in Amount column
            try:
                amount = float(row["Amount"])
            except ValueError:
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "INVALID_AMOUNT_FORMAT",
                    "description": f"The amount '{row['Amount']}' is not a valid number.",
                    "proposed_action": "SKIP",
                    "options": ["SKIP", "REQUIRE_MANUAL_INPUT"]
                })
                is_anomaly = True
                continue

            # Anomaly 12: Zero amount
            if amount == 0:
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "ZERO_AMOUNT",
                    "description": "The expense amount is zero.",
                    "proposed_action": "SKIP",
                    "options": ["SKIP", "IMPORT_ANYWAY"]
                })
                is_anomaly = True
                continue

            # Anomaly 2: Negative amount
            if amount < 0:
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "NEGATIVE_AMOUNT",
                    "description": "The amount is negative. Is this a refund or an error?",
                    "proposed_action": "CONVERT_TO_REFUND",
                    "options": ["CONVERT_TO_REFUND", "MAKE_POSITIVE", "SKIP"]
                })
                is_anomaly = True
                continue

            # Anomaly 4: Inconsistent Date Format
            parsed_date = self.parse_date(row.get("Date", ""))
            if not parsed_date:
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "INVALID_DATE",
                    "description": f"The date '{row.get('Date')}' could not be parsed.",
                    "proposed_action": "SKIP",
                    "options": ["SKIP", "REQUIRE_MANUAL_INPUT"]
                })
                is_anomaly = True
                continue

            # Anomaly 1 & 3: Duplicates and Conflicting Entries
            expense_fingerprint = f"{row['Date']}_{row['Description']}_{row['Split With']}"
            if expense_fingerprint in self.seen_expenses:
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "DUPLICATE_OR_CONFLICT",
                    "description": "An expense with this date, description, and split group already exists.",
                    "proposed_action": "SKIP",
                    "options": ["SKIP", "IMPORT_AS_DUPLICATE"]
                })
                is_anomaly = True
                continue
            self.seen_expenses.add(expense_fingerprint)

            # Anomaly 6: Currency pretending to be INR (USD trip)
            if "USD" in row.get("Description", "").upper() or "TRIP" in row.get("Description", "").upper():
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "CURRENCY_MISMATCH",
                    "description": "This looks like a USD trip expense, but the spreadsheet treats it as INR.",
                    "proposed_action": "APPLY_EXCHANGE_RATE",
                    "options": ["APPLY_EXCHANGE_RATE", "IMPORT_AS_INR"]
                })
                is_anomaly = True
                continue

            # Anomaly 8 & 9 & 10: Timeline bounds (Meera leaving, Sam joining)
            splits = row.get("Split With", "").split(";")
            if "Meera" in splits and parsed_date > datetime(2026, 3, 31):
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "MEMBER_OUT_OF_BOUNDS",
                    "description": "Meera moved out at the end of March, but is included in an expense after March.",
                    "proposed_action": "REMOVE_MEMBER_FROM_SPLIT",
                    "options": ["REMOVE_MEMBER_FROM_SPLIT", "KEEP_MEMBER"]
                })
                is_anomaly = True
                continue
                
            if "Sam" in splits and parsed_date < datetime(2026, 4, 15):
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "MEMBER_OUT_OF_BOUNDS",
                    "description": "Sam moved in mid-April, but is charged for an expense before that.",
                    "proposed_action": "REMOVE_MEMBER_FROM_SPLIT",
                    "options": ["REMOVE_MEMBER_FROM_SPLIT", "KEEP_MEMBER"]
                })
                is_anomaly = True
                continue

            # Anomaly 8: Settlement logged as an expense
            if "paid" in row.get("Description", "").lower() or "settled" in row.get("Description", "").lower():
                report["anomalies"].append({
                    "row_index": row_index,
                    "original_data": row,
                    "anomaly_type": "SETTLEMENT_LOGGED_AS_EXPENSE",
                    "description": "This appears to be a debt settlement, not a shared expense.",
                    "proposed_action": "CONVERT_TO_SETTLEMENT",
                    "options": ["CONVERT_TO_SETTLEMENT", "IMPORT_AS_EXPENSE"]
                })
                is_anomaly = True
                continue

            if not is_anomaly:
                report["clean_rows"].append(row)

        return report

import_engine = AnomalyDetector()
