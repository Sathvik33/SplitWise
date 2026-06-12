from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from uuid import UUID
from fastapi import HTTPException
from app.models.expense import Expense, ExpenseSplit
from app.models.group import GroupMember
from app.schemas.expense import ExpenseCreate
from app.utils.balance import calculate_splits

async def create_expense(db: AsyncSession, group_id: UUID, expense_data: ExpenseCreate, user_id: UUID):
    # Check if creator is member
    member_res = await db.execute(select(GroupMember).filter_by(group_id=group_id, user_id=user_id))
    if not member_res.scalars().first():
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    # Check if payer is member
    payer_res = await db.execute(select(GroupMember).filter_by(group_id=group_id, user_id=expense_data.paid_by))
    if not payer_res.scalars().first():
        raise HTTPException(status_code=400, detail="Payer is not a member of this group")

    # Check all participants are members
    participant_ids = [s.user_id for s in expense_data.splits]
    participants_res = await db.execute(select(GroupMember.user_id).filter(GroupMember.group_id == group_id))
    group_member_ids = [row[0] for row in participants_res.all()]
    
    for pid in participant_ids:
        if pid not in group_member_ids:
            raise HTTPException(status_code=400, detail=f"User {pid} is not a member of this group")

    # Calculate splits
    calculated_splits = calculate_splits(
        amount=expense_data.amount,
        split_type=expense_data.split_type,
        participants=participant_ids,
        splits=expense_data.splits
    )

    new_expense = Expense(
        group_id=group_id,
        title=expense_data.title,
        amount=expense_data.amount,
        paid_by=expense_data.paid_by,
        split_type=expense_data.split_type,
        created_by=user_id
    )
    db.add(new_expense)
    await db.flush()

    for pid, amount in calculated_splits.items():
        split = ExpenseSplit(
            expense_id=new_expense.id,
            user_id=pid,
            amount_owed=amount
        )
        db.add(split)
        
    await db.commit()
    await db.refresh(new_expense)
    
    # Reload with splits
    res = await db.execute(select(Expense).filter_by(id=new_expense.id).options(selectinload(Expense.splits)))
    return res.scalars().first()

async def get_group_expenses(db: AsyncSession, group_id: UUID, user_id: UUID):
    # Check member
    member_res = await db.execute(select(GroupMember).filter_by(group_id=group_id, user_id=user_id))
    if not member_res.scalars().first():
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    result = await db.execute(
        select(Expense)
        .filter(Expense.group_id == group_id)
        .options(selectinload(Expense.splits))
        .order_by(Expense.created_at.desc())
    )
    return result.scalars().all()

async def get_expense_by_id(db: AsyncSession, expense_id: UUID, user_id: UUID):
    result = await db.execute(
        select(Expense)
        .filter(Expense.id == expense_id)
        .options(selectinload(Expense.splits))
    )
    expense = result.scalars().first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    # Check member of group
    member_res = await db.execute(select(GroupMember).filter_by(group_id=expense.group_id, user_id=user_id))
    if not member_res.scalars().first():
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    return expense
