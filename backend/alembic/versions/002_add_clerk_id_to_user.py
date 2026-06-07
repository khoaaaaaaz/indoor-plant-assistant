"""Add clerk_id to User

Revision ID: 002
Revises: 001
Create Date: 2026-05-09 10:00:00.000000

Week 4 Migration:
- User: Add clerk_id, make hashed_password nullable
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002'
down_revision: Union[str, None] = '001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply migration: add clerk_id"""
    
    # Add clerk_id to users table
    op.add_column('users', sa.Column('clerk_id', sa.String(), nullable=True))
    op.create_index(op.f('ix_users_clerk_id'), 'users', ['clerk_id'], unique=True)
    
    # Make hashed_password nullable
    op.alter_column('users', 'hashed_password', existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    """Rollback migration: remove clerk_id"""
    
    # Revert hashed_password to not nullable
    # Note: If there are nulls, this will fail. We don't try to fill them here.
    op.alter_column('users', 'hashed_password', existing_type=sa.String(), nullable=False)
    
    # Drop clerk_id
    op.drop_index(op.f('ix_users_clerk_id'), table_name='users')
    op.drop_column('users', 'clerk_id')
