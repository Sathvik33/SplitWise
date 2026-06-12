from typing import List, Dict, Any
from uuid import UUID
from fastapi import HTTPException
from app.schemas.expense import ExpenseSplitBase

def calculate_splits(amount: float, split_type: str, participants: List[UUID], splits: List[ExpenseSplitBase]) -> Dict[UUID, float]:
    result = {}
    total_amount = round(amount, 2)
    
    if split_type == 'equal':
        base_split = round(total_amount / len(participants), 2)
        total_calculated = 0.0
        
        for i, p in enumerate(participants):
            if i == len(participants) - 1:
                # Assign remainder to the last participant
                user_amount = round(total_amount - total_calculated, 2)
            else:
                user_amount = base_split
            result[p] = user_amount
            total_calculated += user_amount
            
    elif split_type == 'unequal':
        total_calculated = sum(s.amount_owed or 0 for s in splits)
        if round(total_calculated, 2) != total_amount:
            raise HTTPException(status_code=400, detail="Unequal splits must sum to total amount")
        for s in splits:
            result[s.user_id] = round(s.amount_owed, 2)
            
    elif split_type == 'percentage':
        total_percent = sum(s.percentage or 0 for s in splits)
        if round(total_percent, 2) != 100.0:
            raise HTTPException(status_code=400, detail="Percentages must sum to 100")
            
        total_calculated = 0.0
        for i, s in enumerate(splits):
            if i == len(splits) - 1:
                user_amount = round(total_amount - total_calculated, 2)
            else:
                user_amount = round(total_amount * (s.percentage / 100.0), 2)
            result[s.user_id] = user_amount
            total_calculated += user_amount
            
    elif split_type == 'share':
        total_shares = sum(s.shares or 0 for s in splits)
        if total_shares == 0:
            raise HTTPException(status_code=400, detail="Total shares must be greater than 0")
            
        total_calculated = 0.0
        for i, s in enumerate(splits):
            if i == len(splits) - 1:
                user_amount = round(total_amount - total_calculated, 2)
            else:
                user_amount = round(total_amount * (s.shares / total_shares), 2)
            result[s.user_id] = user_amount
            total_calculated += user_amount
    else:
        raise HTTPException(status_code=400, detail="Invalid split type")
        
    return result
