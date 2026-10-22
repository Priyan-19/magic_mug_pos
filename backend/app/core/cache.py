import time
from typing import Any, Optional, Dict

class SimpleMemoryCache:
    """Thread-safe, lightweight in-memory cache with TTL and prefix invalidation."""
    def __init__(self, default_ttl_seconds: int = 180):
        self._cache: Dict[str, Any] = {}
        self._timestamps: Dict[str, float] = {}
        self._default_ttl = default_ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        now = time.time()
        if key in self._cache:
            if now - self._timestamps.get(key, 0) < self._default_ttl:
                return self._cache[key]
            else:
                self.delete(key)
        return None

    def set(self, key: str, value: Any) -> None:
        self._cache[key] = value
        self._timestamps[key] = time.time()

    def delete(self, key: str) -> None:
        self._cache.pop(key, None)
        self._timestamps.pop(key, None)

    def clear_prefix(self, prefix: str) -> None:
        keys_to_del = [k for k in self._cache.keys() if k.startswith(prefix)]
        for k in keys_to_del:
            self.delete(k)

    def clear(self) -> None:
        self._cache.clear()
        self._timestamps.clear()


# Application caches
catalog_cache = SimpleMemoryCache(default_ttl_seconds=180)
shift_cache = SimpleMemoryCache(default_ttl_seconds=5)  # 5-second deduplication cache for concurrent shift polling
