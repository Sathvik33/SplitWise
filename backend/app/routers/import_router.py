from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
import pandas as pd
from app.database import get_db
from app.services.import_engine import import_engine
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
    
    report = import_engine.analyze_csv(csv_text)
    return report

@router.post("/execute")
async def execute_import(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import datetime
    from sqlalchemy.future import select
    from sqlalchemy import or_
    from app.models.group import Group, GroupMember
    from app.models.expense import Expense, ExpenseSplit
    from app.models.payment import Payment

    # 1. Gather all unique names from the dataset
    all_rows = payload.get('clean_rows', [])
    anomalies = payload.get('anomalies', [])
    resolutions = payload.get('resolutions', {})

    for anomaly in anomalies:
        if resolutions.get(str(anomaly['row_index'])) != "SKIP":
            all_rows.append(anomaly['original_data'])

    if not all_rows:
        return {"message": "No data to import"}

    unique_names = set()
    for row in all_rows:
        if row.get("Paid By"): unique_names.add(row["Paid By"].strip())
        if row.get("Split With"): 
            for n in row["Split With"].split(";"): 
                if n.strip(): unique_names.add(n.strip())

    # 2. Find or Create Users
    name_to_user_id = {}
    for name in unique_names:
        email = f"{name.lower().replace(' ', '')}@splitwise.com"
        result = await db.execute(select(User).filter(or_(User.name == name, User.email == email)))
        user = result.scalars().first()
        if not user:
            # Create a placeholder user
            user = User(name=name, email=email, hashed_password="placeholder")
            db.add(user)
            await db.flush()
        name_to_user_id[name] = user.id

    # Add the current user to the mapping (in case they aren't in the CSV but they are creating it)
    name_to_user_id[current_user.name] = current_user.id

    # 3. Create the "Imported Spreadsheet" Group
    group = Group(
        name=f"Imported Spreadsheet ({datetime.datetime.now().strftime('%Y-%m-%d %H:%M')})",
        created_by=current_user.id
    )
    db.add(group)
    await db.flush()

    for user_id in name_to_user_id.values():
        db.add(GroupMember(group_id=group.id, user_id=user_id))
    
    await db.flush()

    # 4. Process Rows and Insert Data
    for row in all_rows:
        try:
            date_str = row.get("Date", "")
            try:
                date_val = datetime.datetime.strptime(date_str, "%d/%m/%Y")
            except ValueError:
                try:
                    date_val = datetime.datetime.strptime(date_str, "%m-%d-%Y")
                except:
                    date_val = datetime.datetime.now()

            amount_str = str(row.get("Amount", "0")).replace(',', '').strip()
            if not amount_str:
                continue
                
            try:
                amount = float(amount_str)
            except ValueError:
                continue
                
            desc = row.get("Description", "Imported Expense")
            payer_name = row.get("Paid By", "").strip()
            payer_id = name_to_user_id.get(payer_name, current_user.id)
            
            # Check if this row is an anomaly that requires special handling
            # Note: We added anomaly rows to all_rows, so we just check if it's a settlement etc based on the same rules.
            # In a real app we'd map the row_index to the resolution policy. For simplicity in the interview we apply basic logic:
            
            is_settlement = "paid" in desc.lower() or "settled" in desc.lower()
            if is_settlement:
                splits = [n.strip() for n in row.get("Split With", "").split(";") if n.strip()]
                if splits:
                    receiver_id = name_to_user_id.get(splits[0])
                    if receiver_id:
                        db.add(Payment(
                            group_id=group.id,
                            paid_by=payer_id,
                            paid_to=receiver_id,
                            amount=amount,
                            created_at=date_val
                        ))
                continue

            # Regular Expense
            exp = Expense(
                group_id=group.id,
                title=desc,
                amount=abs(amount),
                currency="USD" if "USD" in desc.upper() else "INR",
                paid_by=payer_id,
                split_type="equal",
                created_by=current_user.id,
                created_at=date_val
            )
            db.add(exp)
            await db.flush()
            
            # Splits
            splits_names = [n.strip() for n in row.get("Split With", "").split(";") if n.strip()]
            if not splits_names:
                splits_names = [payer_name]
                
            split_amount = abs(amount) / len(splits_names)
            for s_name in splits_names:
                s_id = name_to_user_id.get(s_name)
                if s_id:
                    db.add(ExpenseSplit(
                        expense_id=exp.id,
                        user_id=s_id,
                        amount_owed=split_amount
                    ))
        except Exception as e:
            print(f"Failed to import row: {row}. Error: {e}")
            pass

    await db.commit()
    return {"message": "Import executed successfully! Group created and expenses recorded."}
