from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
from fastapi import HTTPException
from app.models.payment import Payment
from app.models.group import GroupMember
from app.schemas.payment import PaymentCreate

async def create_payment(db: AsyncSession, group_id: UUID, payment_data: PaymentCreate, user_id: UUID):
    # Check current user member
    member_res = await db.execute(select(GroupMember).filter_by(group_id=group_id, user_id=user_id))
    if not member_res.scalars().first():
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    # Check paid_by is member
    payer_res = await db.execute(select(GroupMember).filter_by(group_id=group_id, user_id=payment_data.paid_by))
    if not payer_res.scalars().first():
        raise HTTPException(status_code=400, detail="Payer is not a member")
        
    # Check paid_to is member
    payee_res = await db.execute(select(GroupMember).filter_by(group_id=group_id, user_id=payment_data.paid_to))
    if not payee_res.scalars().first():
        raise HTTPException(status_code=400, detail="Payee is not a member")

    new_payment = Payment(
        group_id=group_id,
        paid_by=payment_data.paid_by,
        paid_to=payment_data.paid_to,
        amount=payment_data.amount,
        note=payment_data.note
    )
    db.add(new_payment)
    await db.commit()
    await db.refresh(new_payment)
    return new_payment

async def get_group_payments(db: AsyncSession, group_id: UUID, user_id: UUID):
    # Check member
    member_res = await db.execute(select(GroupMember).filter_by(group_id=group_id, user_id=user_id))
    if not member_res.scalars().first():
        raise HTTPException(status_code=403, detail="Not a member of this group")
        
    result = await db.execute(
        select(Payment)
        .filter(Payment.group_id == group_id)
        .order_by(Payment.created_at.desc())
    )
    return result.scalars().all()
