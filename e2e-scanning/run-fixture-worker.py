"""CI-only synthetic ClamAV protocol fixture, not a real malware engine.

Drives the backend's actual internal worker against PostgreSQL and private bytes.
No HTTP mutation route or verdict SQL shortcut is introduced.
"""
import asyncio
import os
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.domain.documents.scan_jobs import run_once
from app.domain.documents.storage import QuarantineStorage


async def main():
    if os.environ.get('ENVIRONMENT') != 'test':
        raise ValueError('Synthetic scanner fixture requires the isolated test environment')
    verdict = sys.argv[1]
    expected = {'clean': b'stream: OK', 'rejected': b'stream: SyntheticFixture FOUND',
                'error': b'stream: unavailable ERROR'}[verdict]
    bodies = []

    async def serve(reader, writer):
        try:
            command = await reader.readuntil(b'\0')
            if command == b'zVERSION\0':
                reply = ('ClamAV 1.4.3/12345/' + datetime.now(timezone.utc).strftime(
                    '%a %b %d %H:%M:%S %Y')).encode()
            else:
                assert command == b'zINSTREAM\0'
                content = b''
                while True:
                    length = int.from_bytes(await reader.readexactly(4), 'big')
                    if not length:
                        break
                    content += await reader.readexactly(length)
                assert content.startswith(b'%PDF-')
                bodies.append(content)
                reply = expected
            writer.write(reply + b'\0')
            await writer.drain()
        finally:
            writer.close()
            await writer.wait_closed()

    engine = create_async_engine(os.environ['DATABASE_URL'])
    try:
        with tempfile.TemporaryDirectory() as directory:
            socket = str(Path(directory) / 'scanner.sock')
            server = await asyncio.start_unix_server(serve, socket)
            os.chmod(socket, 0o600)
            try:
                assert await run_once(async_sessionmaker(engine, expire_on_commit=False),
                                      QuarantineStorage(os.environ['DOCUMENT_STORAGE_ROOT']), socket)
                assert len(bodies) == 1
            finally:
                server.close()
                await server.wait_closed()
    finally:
        await engine.dispose()


asyncio.run(main())
