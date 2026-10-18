"""Synthetic-only member fixtures; never an application account-creation route."""
import asyncio
import json
import os
import sys
from uuid import uuid4
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

async def main():
    email, action = sys.argv[1:]
    if not email.startswith('team-') or not email.endswith('@example.com') or os.environ.get('ENVIRONMENT') != 'test':
        raise ValueError('Only isolated synthetic team accounts are accepted')
    engine = create_async_engine(os.environ['DATABASE_URL'])
    async with engine.begin() as connection:
        row = (await connection.execute(text('SELECT id, organization_id, password_hash FROM users WHERE email = :email'), {'email': email})).one()
        if action == 'members':
            members = []
            for index in range(27):
                member = {'id': str(uuid4()), 'name': f'Synthetic colleague {index:02}', 'email': f'team-member-{uuid4()}@example.com', 'role': 'auditor' if index == 0 else 'viewer'}
                await connection.execute(text('INSERT INTO users (id,organization_id,display_name,email,password_hash,role,version) VALUES (:id,:org,:name,:email,:password,:role,1)'), {**member, 'org': row.organization_id, 'password': row.password_hash})
                members.append(member)
            print(json.dumps(members))
        elif action == 'individual':
            await connection.execute(text("UPDATE organizations SET account_type='individual' WHERE id=:id"), {'id': row.organization_id})
        elif action in {'viewer', 'auditor', 'organization_admin'}:
            await connection.execute(text('UPDATE users SET role=:role,version=version+1 WHERE id=:id'), {'id': row.id, 'role': action})
        else:
            raise ValueError('Unknown fixture action')
    await engine.dispose()
asyncio.run(main())
