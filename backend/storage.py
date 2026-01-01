import os
import asyncio
from typing import Dict, Any, Optional

try:
    import asyncpg  # type: ignore
except Exception:
    asyncpg = None  # Optional; only required when using Postgres


class InMemoryUserStore:
    def __init__(self):
        self._users: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def get_user(self, user_id: str) -> Dict[str, Any]:
        async with self._lock:
            return dict(self._users.get(user_id, {}))

    async def upsert_profile(self, user_id: str, profile_updates: Dict[str, Any]) -> Dict[str, Any]:
        async with self._lock:
            profile = self._users.get(user_id, {})
            for key in ("display_name", "username", "bio", "email", "avatar_url"):
                if key in profile_updates and profile_updates[key] is not None:
                    profile[key] = profile_updates[key]
            self._users[user_id] = profile
            return dict(profile)

    async def set_password_hash(self, user_id: str, password_hash: str) -> None:
        async with self._lock:
            profile = self._users.get(user_id, {})
            profile["password_hash"] = password_hash
            self._users[user_id] = profile


class PostgresUserStore:
    def __init__(self, dsn: str):
        if asyncpg is None:
            raise RuntimeError("asyncpg is not installed; cannot use PostgresUserStore")
        self._dsn = dsn
        self._pool: Optional[asyncpg.pool.Pool] = None

    async def init(self) -> None:
        self._pool = await asyncpg.create_pool(self._dsn, max_size=10)
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT,
                    display_name TEXT,
                    bio TEXT,
                    email TEXT,
                    avatar_url TEXT,
                    password_hash TEXT,
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                );
                """
            )

    async def get_user(self, user_id: str) -> Dict[str, Any]:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
            return dict(row) if row else {}

    async def upsert_profile(self, user_id: str, profile_updates: Dict[str, Any]) -> Dict[str, Any]:
        assert self._pool is not None
        # Normalize keys
        username = profile_updates.get("username")
        display_name = profile_updates.get("display_name")
        bio = profile_updates.get("bio")
        email = profile_updates.get("email")
        avatar_url = profile_updates.get("avatar_url")

        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (id, username, display_name, bio, email, avatar_url)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id) DO UPDATE SET
                    username = COALESCE(EXCLUDED.username, users.username),
                    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
                    bio = COALESCE(EXCLUDED.bio, users.bio),
                    email = COALESCE(EXCLUDED.email, users.email),
                    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
                    updated_at = NOW();
                """,
                user_id, username, display_name, bio, email, avatar_url,
            )
            row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
            return dict(row) if row else {}

    async def set_password_hash(self, user_id: str, password_hash: str) -> None:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (id, password_hash)
                VALUES ($1, $2)
                ON CONFLICT (id) DO UPDATE SET
                    password_hash = EXCLUDED.password_hash,
                    updated_at = NOW();
                """,
                user_id, password_hash,
            )


async def create_user_store() -> Any:
    dsn = os.getenv("DATABASE_URL")
    if dsn:
        store = PostgresUserStore(dsn)
        await store.init()
        return store
    return InMemoryUserStore()
