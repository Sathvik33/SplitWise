from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from uuid import UUID
from typing import List
from app.models.user import User
from app.models.group import GroupMember
from app.models.expense import Expense, ExpenseSplit
from app.models.payment import Payment
from app.schemas.balance import BalanceEntry

async def calculate_group_balances(db: AsyncSession, group_id: UUID) -> List[BalanceEntry]:
    # Get all group members
    members_result = await db.execute(
        select(GroupMember.user_id, User.name)
        .join(User, GroupMember.user_id == User.id)
        .filter(GroupMember.group_id == group_id)
    )
    members = members_result.all()
    
    balances = []
    
    for user_id, name in members:
        # total_paid
        paid_res = await db.execute(
            select(func.sum(Expense.amount))
            .filter(Expense.group_id == group_id, Expense.paid_by == user_id)
        )
        total_paid = paid_res.scalar() or 0.0

        # total_owed
        owed_res = await db.execute(
            select(func.sum(ExpenseSplit.amount_owed))
            .join(Expense, ExpenseSplit.expense_id == Expense.id)
            .filter(Expense.group_id == group_id, ExpenseSplit.user_id == user_id)
        )
        total_owed = owed_res.scalar() or 0.0

        # received
        received_res = await db.execute(
            select(func.sum(Payment.amount))
            .filter(Payment.group_id == group_id, Payment.paid_to == user_id)
        )
        received = received_res.scalar() or 0.0

        # sent
        sent_res = await db.execute(
            select(func.sum(Payment.amount))
            .filter(Payment.group_id == group_id, Payment.paid_by == user_id)
        )
        sent = sent_res.scalar() or 0.0

        net_balance = float(total_paid) - float(total_owed) + float(received) - float(sent)
        
        balances.append(BalanceEntry(user_id=user_id, name=name, net_amount=round(net_balance, 2)))
        
    balances.sort(key=lambda x: x.net_amount, reverse=True)
    return balances
