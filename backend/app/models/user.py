from sqlalchemy import Column, String, text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=text("NOW()"))

    # Relationships
    groups_created = relationship("Group", back_populates="creator")
    group_memberships = relationship("GroupMember", back_populates="user", cascade="all, delete-orphan")
    expenses_created = relationship("Expense", foreign_keys="[Expense.created_by]", back_populates="creator")
    expenses_paid = relationship("Expense", foreign_keys="[Expense.paid_by]", back_populates="payer")
    expense_splits = relationship("ExpenseSplit", back_populates="user", cascade="all, delete-orphan")
    payments_made = relationship("Payment", foreign_keys="[Payment.paid_by]", back_populates="payer")
    payments_received = relationship("Payment", foreign_keys="[Payment.paid_to]", back_populates="payee")
    messages = relationship("Message", back_populates="user", cascade="all, delete-orphan")
