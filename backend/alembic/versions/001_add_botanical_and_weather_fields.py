"""Add botanical and weather fields to plants and disease_logs

Revision ID: 001
Revises: 
Create Date: 2024-05-13 10:00:00.000000

Week 3 Migration:
- Plants: Add sunlight_requirement, watering_guide, care_level, is_toxic_to_pets, updated_at
- DiseaseLog: Add env_temperature, env_humidity, soil_moisture, detected_species
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply migration: add Week 3 fields"""
    
    # Add new columns to plants table
    op.add_column('plants', sa.Column('sunlight_requirement', sa.String(), nullable=True))
    op.add_column('plants', sa.Column('watering_guide', sa.String(), nullable=True))
    op.add_column('plants', sa.Column('care_level', sa.String(), nullable=True))
    op.add_column('plants', sa.Column('is_toxic_to_pets', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('plants', sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True))
    
    # Add new columns to disease_logs table
    op.add_column('disease_logs', sa.Column('env_temperature', sa.Float(), nullable=True))
    op.add_column('disease_logs', sa.Column('env_humidity', sa.Float(), nullable=True))
    op.add_column('disease_logs', sa.Column('soil_moisture', sa.Float(), nullable=True))
    op.add_column('disease_logs', sa.Column('detected_species', sa.String(), nullable=True))
    
    # Make disease_name and confidence nullable (they will be populated by AI later)
    op.alter_column('disease_logs', 'disease_name', existing_type=sa.String(), nullable=True)
    op.alter_column('disease_logs', 'confidence', existing_type=sa.Float(), nullable=True)
    op.alter_column('disease_logs', 'image_url', existing_type=sa.String(), nullable=True)


def downgrade() -> None:
    """Rollback migration: remove Week 3 fields"""
    
    # Remove columns from disease_logs table
    op.drop_column('disease_logs', 'detected_species')
    op.drop_column('disease_logs', 'soil_moisture')
    op.drop_column('disease_logs', 'env_humidity')
    op.drop_column('disease_logs', 'env_temperature')
    
    # Revert nullable changes
    op.alter_column('disease_logs', 'image_url', existing_type=sa.String(), nullable=False)
    op.alter_column('disease_logs', 'confidence', existing_type=sa.Float(), nullable=False)
    op.alter_column('disease_logs', 'disease_name', existing_type=sa.String(), nullable=False)
    
    # Remove columns from plants table
    op.drop_column('plants', 'updated_at')
    op.drop_column('plants', 'is_toxic_to_pets')
    op.drop_column('plants', 'care_level')
    op.drop_column('plants', 'watering_guide')
    op.drop_column('plants', 'sunlight_requirement')
