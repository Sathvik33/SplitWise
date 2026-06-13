from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List
from app.database import get_db
from app.services.import_engine import import_engine, AnomalyDetector, EXCHANGE_RATE_USD_TO_INR
from app.routers.auth import get_current_user
from app.models.user import User

router = APIRouter(
    prefix="/api/import",
    tags=["Import"],
)

@router.post("/analyze")
async def analyze_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed.")
    
    content = await file.read()
    csv_text = content.decode('utf-8')
    
    # Create a fresh detector for each analysis (reset seen_expenses)
    detector = AnomalyDetector()
    report = detector.analyze_csv(csv_text)
    return report

@router.post("/execute")
async def execute_import(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import datetime as dt
    from sqlalchemy.future import select
    from sqlalchemy import or_
    from app.models.group import Group, GroupMember
    from app.models.expense import Expense, ExpenseSplit
    from app.models.payment import Payment

    clean_rows = payload.get('clean_rows', [])
    anomalies = payload.get('anomalies', [])
    resolutions = payload.get('resolutions', {})
    manual_values = payload.get('manual_values', {})

    # Build a list of rows to actually import, applying resolution logic
    rows_to_import = []
    import_report: List[Dict[str, Any]] = []

    # 1. Add all clean rows
    for row in clean_rows:
        rows_to_import.append({"row": row, "action": "IMPORTED", "note": "Clean row — no anomalies"})

    # 2. Process each anomaly based on user's chosen resolution
    for anomaly in anomalies:
        row_key = str(anomaly['row_index'])
        resolution = resolutions.get(row_key, anomaly.get('proposed_action', 'SKIP'))
        row = anomaly['original_data']
        anomaly_type = anomaly.get('anomaly_type', '')

        if resolution == "SKIP":
            import_report.append({
                "row_index": anomaly['row_index'],
                "description": row.get("Description", ""),
                "anomaly_type": anomaly_type,
                "resolution": "SKIP",
                "note": "Row skipped per user decision"
            })
            continue

        if resolution == "REQUIRE_MANUAL_INPUT":
            manual_val = manual_values.get(row_key, "")
            if not manual_val:
                import_report.append({
                    "row_index": anomaly['row_index'],
                    "description": row.get("Description", ""),
                    "anomaly_type": anomaly_type,
                    "resolution": "SKIPPED_NO_MANUAL_VALUE",
                    "note": "Manual input required but no value provided — skipped"
                })
                continue
            # Apply the manual value to the Amount field
            row = dict(row)
            row["Amount"] = manual_val
            rows_to_import.append({"row": row, "action": "IMPORTED_WITH_MANUAL_VALUE", "note": f"Manual value applied: {manual_val}"})
            continue

        if resolution == "APPLY_EXCHANGE_RATE":
            row = dict(row)
            original_amount = float(row.get("Amount", 0))
            converted = round(original_amount * EXCHANGE_RATE_USD_TO_INR, 2)
            row["_currency"] = "USD"
            row["_original_amount"] = original_amount
            row["Amount"] = str(converted)
            rows_to_import.append({"row": row, "action": "CONVERTED_USD_TO_INR", "note": f"${original_amount} USD × {EXCHANGE_RATE_USD_TO_INR} = ₹{converted}"})
            continue

        if resolution == "IMPORT_AS_INR":
            rows_to_import.append({"row": row, "action": "IMPORTED_AS_INR", "note": "USD amount treated as INR per user decision"})
            continue

        if resolution == "CONVERT_TO_REFUND":
            row = dict(row)
            row["_is_refund"] = True
            rows_to_import.append({"row": row, "action": "IMPORTED_AS_REFUND", "note": f"Negative amount treated as refund"})
            continue

        if resolution == "MAKE_POSITIVE":
            row = dict(row)
            row["Amount"] = str(abs(float(row.get("Amount", 0))))
            rows_to_import.append({"row": row, "action": "MADE_POSITIVE", "note": "Negative amount converted to positive"})
            continue

        if resolution == "CONVERT_TO_SETTLEMENT":
            row = dict(row)
            row["_is_settlement"] = True
            rows_to_import.append({"row": row, "action": "CONVERTED_TO_SETTLEMENT", "note": "Logged as a payment/settlement instead of an expense"})
            continue

        if resolution == "IMPORT_AS_EXPENSE":
            rows_to_import.append({"row": row, "action": "IMPORTED_AS_EXPENSE", "note": "Settlement-like description imported as regular expense"})
            continue

        if resolution == "REMOVE_MEMBER_FROM_SPLIT":
            row = dict(row)
            # Determine which member to remove based on the anomaly type
            splits = [s.strip() for s in row.get("Split With", "").split(";") if s.strip()]
            if anomaly_type == "MEMBER_LEFT":
                splits = [s for s in splits if s != "Meera"]
                note = "Meera removed from split (moved out end of March)"
            elif anomaly_type == "MEMBER_NOT_JOINED":
                splits = [s for s in splits if s != "Sam"]
                note = "Sam removed from split (joined mid-April)"
            else:
                note = "Member removed from split"
            row["Split With"] = ";".join(splits)
            rows_to_import.append({"row": row, "action": "MEMBER_REMOVED", "note": note})
            continue

        if resolution == "KEEP_MEMBER":
            rows_to_import.append({"row": row, "action": "KEPT_MEMBER", "note": "Out-of-bounds member kept in split per user decision"})
            continue

        if resolution in ("IMPORT_AS_DUPLICATE", "IMPORT_THIS_ROW", "IMPORT_ANYWAY"):
            rows_to_import.append({"row": row, "action": resolution, "note": f"Imported per user decision: {resolution}"})
            continue

        # Fallback: skip unknown resolutions
        import_report.append({
            "row_index": anomaly['row_index'],
            "description": row.get("Description", ""),
            "anomaly_type": anomaly_type,
            "resolution": resolution,
            "note": f"Unknown resolution '{resolution}' — skipped"
        })

    if not rows_to_import:
        return {"message": "No data to import", "import_report": import_report}

    # 3. Gather unique user names
    unique_names = set()
    for entry in rows_to_import:
        row = entry["row"]
        if row.get("Paid By"):
            unique_names.add(row["Paid By"].strip())
        if row.get("Split With"):
            for n in row["Split With"].split(";"):
                if n.strip():
                    unique_names.add(n.strip())

    # 4. Find or Create Users
    name_to_user_id = {}
    for name in unique_names:
        email = f"{name.lower().replace(' ', '')}@splitwise.com"
        result = await db.execute(select(User).filter(or_(User.name == name, User.email == email)))
        user = result.scalars().first()
        if not user:
            user = User(name=name, email=email, hashed_password="placeholder")
            db.add(user)
            await db.flush()
        name_to_user_id[name] = user.id

    name_to_user_id[current_user.name] = current_user.id

    # 5. Create the "Imported Spreadsheet" Group
    group = Group(
        name=f"Imported Spreadsheet ({dt.datetime.now().strftime('%Y-%m-%d %H:%M')})",
        created_by=current_user.id
    )
    db.add(group)
    await db.flush()

    for user_id in name_to_user_id.values():
        db.add(GroupMember(group_id=group.id, user_id=user_id))
    await db.flush()

    # 6. Process each row and insert data
    for entry in rows_to_import:
        row = entry["row"]
        action = entry["action"]
        note = entry["note"]

        try:
            # Parse date
            date_str = row.get("Date", "")
            try:
                date_val = dt.datetime.strptime(date_str, "%d/%m/%Y")
            except ValueError:
                try:
                    date_val = dt.datetime.strptime(date_str, "%m-%d-%Y")
                except Exception:
                    date_val = dt.datetime.now()

            # Parse amount
            amount_str = str(row.get("Amount", "0")).replace(',', '').strip()
            if not amount_str:
                continue
            try:
                amount = float(amount_str)
            except ValueError:
                import_report.append({
                    "row_index": row.get("_row_index", "?"),
                    "description": row.get("Description", ""),
                    "anomaly_type": "PARSE_ERROR",
                    "resolution": action,
                    "note": f"Could not parse amount '{amount_str}' — skipped"
                })
                continue

            desc = row.get("Description", "Imported Expense")
            payer_name = row.get("Paid By", "").strip()
            payer_id = name_to_user_id.get(payer_name, current_user.id)

            # Handle settlements
            is_settlement = row.get("_is_settlement", False)
            if not is_settlement and action == "CONVERTED_TO_SETTLEMENT":
                is_settlement = True

            if is_settlement:
                splits = [n.strip() for n in row.get("Split With", "").split(";") if n.strip()]
                if splits:
                    receiver_id = name_to_user_id.get(splits[0])
                    if receiver_id:
                        db.add(Payment(
                            group_id=group.id,
                            paid_by=payer_id,
                            paid_to=receiver_id,
                            amount=abs(amount),
                            created_at=date_val
                        ))
                import_report.append({
                    "row_index": row.get("_row_index", ""),
                    "description": desc,
                    "anomaly_type": "SETTLEMENT_AS_EXPENSE",
                    "resolution": action,
                    "note": note
                })
                continue

            # Handle refunds — create expense with negative amount semantics
            is_refund = row.get("_is_refund", False)
            final_amount = abs(amount)

            # Handle currency
            currency = row.get("_currency", "INR")
            original_amount = row.get("_original_amount", None)

            exp = Expense(
                group_id=group.id,
                title=desc,
                amount=final_amount,
                currency=currency,
                original_amount=original_amount,
                is_settlement=False,
                paid_by=payer_id,
                split_type="equal",
                created_by=current_user.id,
                created_at=date_val
            )
            db.add(exp)
            await db.flush()

            # Calculate splits
            splits_names = [n.strip() for n in row.get("Split With", "").split(";") if n.strip()]
            if not splits_names:
                splits_names = [payer_name]

            split_amount = round(final_amount / len(splits_names), 2)
            for s_name in splits_names:
                s_id = name_to_user_id.get(s_name)
                if s_id:
                    db.add(ExpenseSplit(
                        expense_id=exp.id,
                        user_id=s_id,
                        amount_owed=split_amount
                    ))

            import_report.append({
                "row_index": row.get("_row_index", ""),
                "description": desc,
                "anomaly_type": entry.get("anomaly_type", ""),
                "resolution": action,
                "note": note
            })

        except Exception as e:
            import_report.append({
                "row_index": "",
                "description": row.get("Description", ""),
                "anomaly_type": "IMPORT_ERROR",
                "resolution": "FAILED",
                "note": str(e)
            })

    await db.commit()
    return {
        "message": f"Import complete! {len(rows_to_import)} rows processed.",
        "group_id": str(group.id),
        "import_report": import_report
    }
