"""Synthetic role-change fixture for isolated workflow integration tests."""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    email, action = sys.argv[1:]
    if not email.startswith('workflow-') or not email.endswith('@example.com') or os.environ.get('ENVIRONMENT') != 'test':
        raise ValueError('Only isolated synthetic audit accounts are accepted')
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.begin() as connection:
        row = (await connection.execute(text('SELECT id, organization_id FROM users WHERE email = :email'), {'email': email})).one()
        if action in {'viewer', 'auditor', 'operator'}:
            await connection.execute(text('UPDATE users SET role = :role WHERE id = :id'), {'role': action, 'id': row.id})
        else:
            raise ValueError('Unknown fixture action')
    await engine.dispose()
asyncio.run(main())
