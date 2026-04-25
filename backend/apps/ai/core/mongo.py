"""Optional MongoDB client.

In proxy mode (the default, driven by the Node backend) this service never touches
Mongo directly — Node owns the database. `init_mongo()` is therefore a no-op when
MONGODB_URI is unset, so the AI service can run standalone for local dev.
"""
from __future__ import annotations

import os

import motor.motor_asyncio

_client: motor.motor_asyncio.AsyncIOMotorClient | None = None  # type: ignore[type-arg]


async def init_mongo() -> None:
    global _client
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        # Proxy-only mode — skip DB init.
        return
    _client = motor.motor_asyncio.AsyncIOMotorClient(uri)


async def close_mongo() -> None:
    if _client is not None:
        _client.close()


def get_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:  # type: ignore[type-arg]
    if _client is None:
        raise RuntimeError(
            "MongoDB not initialized — set MONGODB_URI or use the /ai/generate proxy endpoint."
        )
    return _client.get_default_database()
