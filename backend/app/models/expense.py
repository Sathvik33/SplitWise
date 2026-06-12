from sqlalchemy import Column, String, text, DateTime, ForeignKey, Numeric, UniqueConstraint, CheckConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class Expense(Base):
    __tablename__ = "expenses"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    group_id = Column(UUID(as_uuid=True), ForeignKey("groups.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    amount = Column(Numeric(12, 2), nullable=False)
    paid_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    split_type = Column(String, nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))

    __table_args__ = (
        CheckConstraint('amount > 0', name='chk_expense_amount_positive'),
        CheckConstraint("split_type IN ('equal','unequal','percentage','share')", name='chk_expense_split_type'),
    )

    # Relationships
    group = relationship("Group", back_populates="expenses")
    payer = relationship("User", foreign_keys=[paid_by], back_populates="expenses_paid")
    creator = relationship("User", foreign_keys=[created_by], back_populates="expenses_created")
    splits = relationship("ExpenseSplit", back_populates="expense", cascade="all, delete-orphan")
    messages = relationship("Message", back_populates="expense", cascade="all, delete-orphan")


class ExpenseSplit(Base):
    __tablename__ = "expense_splits"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    expense_id = Column(UUID(as_uuid=True), ForeignKey("expenses.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount_owed = Column(Numeric(12, 2), nullable=False)

    __table_args__ = (
        CheckConstraint('amount_owed >= 0', name='chk_expense_split_amount_positive'),
        UniqueConstraint('expense_id', 'user_id', name='uq_expense_user'),
    )

    # Relationships
    expense = relationship("Expense", back_populates="splits")
    user = relationship("User", back_populates="expense_splits")
