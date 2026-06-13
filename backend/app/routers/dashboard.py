from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.services.group_service import get_user_groups
from app.services.balance_service import calculate_group_balances
from app.models.expense import Expense, ExpenseSplit
from app.models.payment import Payment
from app.models.group import Group
from sqlalchemy.future import select
from sqlalchemy import or_
from typing import Dict, Any, List

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("")
async def get_dashboard(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    groups = await get_user_groups(db, current_user.id)
    
    total_owed_to_me = 0.0
    total_i_owe = 0.0
    
    owed_list: List[Dict[str, Any]] = []
    owe_list: List[Dict[str, Any]] = []
    
    for group in groups:
        balances = await calculate_group_balances(db, group.id)
        for b in balances:
            if b.user_id == current_user.id:
                if b.net_amount > 0:
                    total_owed_to_me += b.net_amount
                elif b.net_amount < 0:
                    total_i_owe += abs(b.net_amount)
                    
            # For simplicity in this endpoint, we could also compute who owes exactly who 
            # but standard Splitwise global balance is net. Let's just return net.
            
    return {
        "total_balance": round(total_owed_to_me - total_i_owe, 2),
        "total_owed_to_me": round(total_owed_to_me, 2),
        "total_i_owe": round(total_i_owe, 2),
    }

@router.get("/breakdown")
async def get_dashboard_breakdown(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """
    Rohan's Request: Returns exactly which expenses/payments make up the user's balance.
    """
    # 1. Expenses where user is involved (either paid by them, or split involves them)
    # 2. Payments where user is involved (sent or received)
    
    breakdown = []
    
    # Get expenses paid BY the user
    paid_expenses_res = await db.execute(
        select(Expense, Group.name)
        .join(Group, Expense.group_id == Group.id)
        .filter(Expense.paid_by == current_user.id)
    )
    for exp, group_name in paid_expenses_res.all():
        # User paid for it, but their own share is not owed to them.
        # Find out how much OTHERS owe them from this expense.
        splits_res = await db.execute(
            select(ExpenseSplit).filter(ExpenseSplit.expense_id == exp.id)
        )
        splits = splits_res.scalars().all()
        others_share = sum(s.amount_owed for s in splits if s.user_id != current_user.id)
        
        if others_share > 0:
            breakdown.append({
                "type": "expense_paid",
                "id": str(exp.id),
                "description": exp.title,
                "group_name": group_name,
                "date": exp.created_at.isoformat() if exp.created_at else None,
                "amount": round(others_share, 2),
                "action": "You lent"
            })
            
    # Get expenses split WITH the user (someone else paid)
    owed_expenses_res = await db.execute(
        select(Expense, ExpenseSplit.amount_owed, Group.name, User.name)
        .join(ExpenseSplit, ExpenseSplit.expense_id == Expense.id)
        .join(Group, Expense.group_id == Group.id)
        .join(User, Expense.paid_by == User.id)
        .filter(ExpenseSplit.user_id == current_user.id, Expense.paid_by != current_user.id)
    )
    for exp, amount_owed, group_name, payer_name in owed_expenses_res.all():
        breakdown.append({
            "type": "expense_owed",
            "id": str(exp.id),
            "description": exp.title,
            "group_name": group_name,
            "date": exp.created_at.isoformat() if exp.created_at else None,
            "amount": -round(amount_owed, 2),
            "action": f"You owe {payer_name}"
        })
        
    # Get Payments
    payments_res = await db.execute(
        select(Payment, Group.name, User.name.label("other_user"))
        .join(Group, Payment.group_id == Group.id)
        .join(User, or_(
            (Payment.paid_by == current_user.id) & (Payment.paid_to == User.id),
            (Payment.paid_to == current_user.id) & (Payment.paid_by == User.id)
        ))
        .filter(or_(Payment.paid_by == current_user.id, Payment.paid_to == current_user.id))
    )
    
    for payment, group_name, other_user in payments_res.all():
        if payment.paid_by == current_user.id:
            # User sent money, so it reduces their debt (increases net balance)
            breakdown.append({
                "type": "payment_sent",
                "id": str(payment.id),
                "description": f"Payment to {other_user}",
                "group_name": group_name,
                "date": payment.created_at.isoformat() if payment.created_at else None,
                "amount": round(float(payment.amount), 2),
                "action": "You paid"
            })
        else:
            # User received money, so it reduces what others owe them (decreases net balance)
            breakdown.append({
                "type": "payment_received",
                "id": str(payment.id),
                "description": f"Payment from {other_user}",
                "group_name": group_name,
                "date": payment.created_at.isoformat() if payment.created_at else None,
                "amount": -round(float(payment.amount), 2),
                "action": "You received"
            })
            
    # Sort by date descending (handle missing dates by putting them last)
    breakdown.sort(key=lambda x: x["date"] or "", reverse=True)
    return breakdown
