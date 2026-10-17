"""Synthetic integration fixtures only; invoked against the isolated CI database."""
import asyncio
import hashlib
import os
import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    email, action = sys.argv[1:]
    if not email.startswith('sessions-') or not email.endswith('@example.com'):
        raise ValueError('Only synthetic session test accounts are accepted')
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.begin() as connection:
        row = (await connection.execute(text('SELECT id, organization_id FROM users WHERE email = :email'), {'email': email})).one()
        if action == 'expire':
            await connection.execute(text('UPDATE sessions SET expires_at = :expires WHERE user_id = :user_id'), {'expires': datetime.now(timezone.utc) - timedelta(minutes=1), 'user_id': row.id})
        elif action == 'paginate':
            for _ in range(22):
                await connection.execute(text('INSERT INTO sessions (id, user_id, organization_id, token_digest, expires_at) VALUES (:id, :user_id, :organization_id, :digest, :expires)'), {'id': uuid4(), 'user_id': row.id, 'organization_id': row.organization_id, 'digest': hashlib.sha256(os.urandom(32)).hexdigest(), 'expires': datetime.now(timezone.utc) + timedelta(days=1)})
        else:
            raise ValueError('Unknown fixture action')
    await engine.dispose()

asyncio.run(main())
