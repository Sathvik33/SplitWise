from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import List, Literal, Optional

class ExpenseSplitBase(BaseModel):
    user_id: UUID
    amount_owed: float | None = None
    percentage: float | None = None
    shares: int | None = None

class ExpenseSplitResponse(BaseModel):
    id: UUID
    user_id: UUID
    amount_owed: float
    
    model_config = ConfigDict(from_attributes=True)

class ExpenseBase(BaseModel):
    title: str
    amount: float = Field(..., gt=0)
    paid_by: UUID
    split_type: Literal['equal', 'unequal', 'percentage', 'share']

class ExpenseCreate(ExpenseBase):
    splits: List[ExpenseSplitBase]

class ExpenseResponse(ExpenseBase):
    id: UUID
    group_id: UUID
    created_by: UUID
    created_at: datetime
    splits: List[ExpenseSplitResponse]

    model_config = ConfigDict(from_attributes=True)
