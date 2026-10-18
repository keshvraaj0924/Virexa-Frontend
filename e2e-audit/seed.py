"""Synthetic browser pagination/role fixtures, never a source of production audit records."""
import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    email, action = sys.argv[1:]
    if not email.startswith('audit-') or not email.endswith('@example.com') or os.environ.get('ENVIRONMENT') != 'test':
        raise ValueError('Only isolated synthetic audit accounts are accepted')
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.begin() as connection:
        row = (await connection.execute(text('SELECT id, organization_id FROM users WHERE email = :email'), {'email': email})).one()
        if action in {'viewer', 'auditor'}:
            await connection.execute(text('UPDATE users SET role = :role WHERE id = :id'), {'role': action, 'id': row.id})
        elif action == 'paginate':
            for i in range(52):
                await connection.execute(text("INSERT INTO audit_events (id, organization_id, actor_user_id, action, resource_type, request_id, metadata, created_at) VALUES (:id, :org, :actor, 'auth.login', 'session', :request, '{\"outcome\":\"succeeded\"}', :at)"), {'id': uuid4(), 'org': row.organization_id, 'actor': row.id, 'request': str(uuid4()), 'at': datetime.now(timezone.utc) - timedelta(days=1, minutes=i)})
        else:
            raise ValueError('Unknown fixture action')
    await engine.dispose()
asyncio.run(main())
