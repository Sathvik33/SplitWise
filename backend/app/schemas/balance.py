from pydantic import BaseModel
from uuid import UUID

class BalanceEntry(BaseModel):
    user_id: UUID
    name: str
    net_amount: float
