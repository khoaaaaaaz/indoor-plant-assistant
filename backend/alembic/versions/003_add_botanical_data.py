"""add botanical_data json column to plants

Revision ID: 003_add_botanical_data
Revises: e9d54da691bd
Create Date: 2026-05-19
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '003_add_botanical_data'
down_revision = 'e9d54da691bd'
branch_labels = None
depends_on = None


def upgrade():
    # Add botanical_data JSON column to plants table
    op.add_column('plants', sa.Column('botanical_data', sa.JSON(), nullable=True))


def downgrade():
    op.drop_column('plants', 'botanical_data')
