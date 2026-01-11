# alembic revision -m "enable pgcrypto"
from alembic import op

revision = "0001_enable_pgcrypto"
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS pgcrypto;")
