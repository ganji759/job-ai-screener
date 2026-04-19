import os
import motor.motor_asyncio

_client: motor.motor_asyncio.AsyncIOMotorClient | None = None  # type: ignore[type-arg]


async def init_mongo() -> None:
    global _client
    uri = os.environ.get("MONGODB_URI")
    if not uri:
        raise RuntimeError("MONGODB_URI not set")
    _client = motor.motor_asyncio.AsyncIOMotorClient(uri)


async def close_mongo() -> None:
    if _client is not None:
        _client.close()


def get_db() -> motor.motor_asyncio.AsyncIOMotorDatabase:  # type: ignore[type-arg]
    if _client is None:
        raise RuntimeError("MongoDB not initialized — call init_mongo() first")
    return _client.get_default_database()
