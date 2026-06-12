from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from uuid import UUID
from app.database import get_db
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.schemas.expense import ExpenseCreate, ExpenseResponse
from app.services.expense_service import create_expense, get_group_expenses, get_expense_by_id

router = APIRouter(tags=["expenses"])

@router.post("/api/groups/{id}/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_new_expense(id: UUID, expense: ExpenseCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await create_expense(db, id, expense, current_user.id)

@router.get("/api/groups/{id}/expenses", response_model=List[ExpenseResponse])
async def list_group_expenses(id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_group_expenses(db, id, current_user.id)

@router.get("/api/expenses/{id}", response_model=ExpenseResponse)
async def get_expense(id: UUID, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    return await get_expense_by_id(db, id, current_user.id)
