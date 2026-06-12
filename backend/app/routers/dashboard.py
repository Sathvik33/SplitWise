from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.dependencies.auth import get_current_user
from app.services.group_service import get_user_groups
from app.services.balance_service import calculate_group_balances
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
