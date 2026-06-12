from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class PaymentBase(BaseModel):
    paid_by: UUID
    paid_to: UUID
    amount: float = Field(..., gt=0)
    note: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: UUID
    group_id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
