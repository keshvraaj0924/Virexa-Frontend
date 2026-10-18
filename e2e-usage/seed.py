"""Explicit synthetic fixtures for isolated PostgreSQL browser tests only."""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    email, action, *extra = sys.argv[1:]
    if not email.startswith('usage-') or not email.endswith('@example.com'):
        raise ValueError('Only synthetic usage accounts are accepted')
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.begin() as connection:
        row = (await connection.execute(text('SELECT id, organization_id FROM users WHERE email = :email'), {'email': email})).one()
        if action == 'join':
            other = extra[0]
            if not other.startswith('usage-') or not other.endswith('@example.com'):
                raise ValueError('Only synthetic organizations are accepted')
            tenant = (await connection.execute(text('SELECT organization_id FROM users WHERE email = :email'), {'email': other})).scalar_one()
            await connection.execute(text("UPDATE users SET organization_id = :org, role = 'operator' WHERE id = :id"), {'org': tenant, 'id': row.id})
            await connection.execute(text('UPDATE sessions SET organization_id = :org WHERE user_id = :id'), {'org': tenant, 'id': row.id})
        elif action == 'viewer':
            await connection.execute(text("UPDATE users SET role = 'viewer' WHERE id = :id"), {'id': row.id})
        elif action == 'history':
            period = (await connection.execute(text('SELECT id FROM usage_periods WHERE organization_id = :org ORDER BY starts_at DESC LIMIT 1'), {'org': row.organization_id})).scalar_one()
            for i in range(30):
                await connection.execute(text("INSERT INTO usage_events (id, organization_id, user_id, period_id, idempotency_key, operation, meter, quantity, state, error_code, created_at, updated_at) VALUES (:id, :org, :user, :period, :key, 'document_intake', 'document_uploads', 1, 'failed', 'SYNTHETIC_TEST_FAILURE', :at, :at)"), {'id': uuid4(), 'org': row.organization_id, 'user': row.id, 'period': period, 'key': f'synthetic-history-{uuid4()}', 'at': datetime.now(timezone.utc) - timedelta(minutes=i + 1)})
        else:
            raise ValueError('Unknown fixture action')
    await engine.dispose()

asyncio.run(main())
