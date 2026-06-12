from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.schemas.payment import PaymentCreate, PaymentResponse
from app.services.payment_service import create_payment, get_group_payments

router = APIRouter(prefix="/api/groups", tags=["payments"])

@router.post("/{id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_new_payment(id: UUID, payment: PaymentCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await create_payment(db, id, payment, current_user.id)

@router.get("/{id}/payments", response_model=List[PaymentResponse])
async def list_group_payments(id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_group_payments(db, id, current_user.id)
