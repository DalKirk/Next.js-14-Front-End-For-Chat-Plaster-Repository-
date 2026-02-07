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
            for key in ("display_name", "username", "bio", "email", "avatar_url", "avatar_urls"):
                if key in profile_updates and profile_updates[key] is not None:
                    profile[key] = profile_updates[key]
            self._users[user_id] = profile
            return dict(profile)

    async def set_password_hash(self, user_id: str, password_hash: str) -> None:
        async with self._lock:
            profile = self._users.get(user_id, {})
            profile["password_hash"] = password_hash
            self._users[user_id] = profile

    async def get_theme(self, user_id: str) -> Optional[Dict[str, Any]]:
        async with self._lock:
            profile = self._users.get(user_id, {})
            return profile.get("theme_config")

    async def set_theme(self, user_id: str, theme_config: Dict[str, Any]) -> None:
        async with self._lock:
            profile = self._users.get(user_id, {})
            profile["theme_config"] = theme_config
            self._users[user_id] = profile

    async def get_gallery(self, user_id: str) -> list:
        async with self._lock:
            profile = self._users.get(user_id, {})
            return profile.get("gallery", [])

    async def set_gallery(self, user_id: str, items: list) -> None:
        async with self._lock:
            profile = self._users.get(user_id, {})
            profile["gallery"] = items
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
                    avatar_urls JSONB,
                    password_hash TEXT,
                    theme_config JSONB,
                    gallery JSONB DEFAULT '[]'::jsonb,
                    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
                );
                """
            )
            # Add columns if upgrading from older schema
            for col, coltype, default in [
                ("theme_config", "JSONB", None),
                ("gallery", "JSONB", "'[]'::jsonb"),
                ("avatar_urls", "JSONB", None),
                ("created_at", "TIMESTAMP", "NOW()"),
            ]:
                try:
                    default_clause = f" DEFAULT {default}" if default else ""
                    await conn.execute(
                        f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {coltype}{default_clause};"
                    )
                except Exception:
                    pass  # column already exists

    async def get_user(self, user_id: str) -> Dict[str, Any]:
        assert self._pool is not None
        import json
        async with self._pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
            if not row:
                return {}
            result = dict(row)
            # Parse JSONB fields back to Python dicts/lists
            for jcol in ("avatar_urls", "theme_config", "gallery"):
                if jcol in result and isinstance(result[jcol], str):
                    try:
                        result[jcol] = json.loads(result[jcol])
                    except Exception:
                        pass
            return result

    async def upsert_profile(self, user_id: str, profile_updates: Dict[str, Any]) -> Dict[str, Any]:
        assert self._pool is not None
        import json
        # Normalize keys
        username = profile_updates.get("username")
        display_name = profile_updates.get("display_name")
        bio = profile_updates.get("bio")
        email = profile_updates.get("email")
        avatar_url = profile_updates.get("avatar_url")
        avatar_urls_raw = profile_updates.get("avatar_urls")
        avatar_urls_json = json.dumps(avatar_urls_raw) if avatar_urls_raw else None

        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (id, username, display_name, bio, email, avatar_url, avatar_urls)
                VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
                ON CONFLICT (id) DO UPDATE SET
                    username = COALESCE(EXCLUDED.username, users.username),
                    display_name = COALESCE(EXCLUDED.display_name, users.display_name),
                    bio = COALESCE(EXCLUDED.bio, users.bio),
                    email = COALESCE(EXCLUDED.email, users.email),
                    avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
                    avatar_urls = COALESCE(EXCLUDED.avatar_urls, users.avatar_urls),
                    updated_at = NOW();
                """,
                user_id, username, display_name, bio, email, avatar_url, avatar_urls_json,
            )
            row = await conn.fetchrow("SELECT * FROM users WHERE id = $1", user_id)
            if row:
                result = dict(row)
                # Parse JSONB fields back to dicts for the API response
                for jcol in ("avatar_urls", "theme_config", "gallery"):
                    if jcol in result and isinstance(result[jcol], str):
                        try:
                            result[jcol] = json.loads(result[jcol])
                        except Exception:
                            pass
                return result
            return {}

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

    async def get_theme(self, user_id: str) -> Optional[Dict[str, Any]]:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            row = await conn.fetchval(
                "SELECT theme_config FROM users WHERE id = $1", user_id
            )
            if row is None:
                return None
            import json
            return json.loads(row) if isinstance(row, str) else row

    async def set_theme(self, user_id: str, theme_config: Dict[str, Any]) -> None:
        assert self._pool is not None
        import json
        tc_json = json.dumps(theme_config)
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (id, theme_config)
                VALUES ($1, $2::jsonb)
                ON CONFLICT (id) DO UPDATE SET
                    theme_config = EXCLUDED.theme_config,
                    updated_at = NOW();
                """,
                user_id, tc_json,
            )

    async def get_gallery(self, user_id: str) -> list:
        assert self._pool is not None
        async with self._pool.acquire() as conn:
            row = await conn.fetchval(
                "SELECT gallery FROM users WHERE id = $1", user_id
            )
            if row is None:
                return []
            import json
            items = json.loads(row) if isinstance(row, str) else row
            return items if isinstance(items, list) else []

    async def set_gallery(self, user_id: str, items: list) -> None:
        assert self._pool is not None
        import json
        gallery_json = json.dumps(items)
        async with self._pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO users (id, gallery)
                VALUES ($1, $2::jsonb)
                ON CONFLICT (id) DO UPDATE SET
                    gallery = EXCLUDED.gallery,
                    updated_at = NOW();
                """,
                user_id, gallery_json,
            )


async def create_user_store() -> Any:
    dsn = os.getenv("DATABASE_URL")
    if dsn:
        store = PostgresUserStore(dsn)
        await store.init()
        return store
    return InMemoryUserStore()
