import pytest
import time
from decimal import Decimal
from app.core.cache import SimpleMemoryCache


def test_simple_memory_cache_ttl_and_eviction():
    cache = SimpleMemoryCache(default_ttl_seconds=1)
    cache.set("key1", "value1")
    assert cache.get("key1") == "value1"

    # Prefix deletion
    cache.set("products:cat1", [1, 2, 3])
    cache.set("products:cat2", [4, 5])
    cache.set("categories:all", ["Coffee", "Tea"])

    cache.clear_prefix("products")
    assert cache.get("products:cat1") is None
    assert cache.get("products:cat2") is None
    assert cache.get("categories:all") == ["Coffee", "Tea"]

    # Expiration
    time.sleep(1.05)
    assert cache.get("categories:all") is None


def test_cache_clear_all():
    cache = SimpleMemoryCache(default_ttl_seconds=60)
    cache.set("a", 100)
    cache.set("b", 200)
    assert cache.get("a") == 100
    cache.clear()
    assert cache.get("a") is None
    assert cache.get("b") is None


@pytest.mark.asyncio
async def test_middleware_latency_headers():
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/health")
        assert response.status_code == 200
        assert "x-process-time-ms" in response.headers
        assert "server-timing" in response.headers
        assert "app;dur=" in response.headers["server-timing"]
        process_time = float(response.headers["x-process-time-ms"])
        assert process_time >= 0.0


@pytest.mark.asyncio
async def test_gzip_compression_middleware():
    from httpx import AsyncClient, ASGITransport
    from app.main import app

    transport = ASGITransport(app=app)
    # Request with Accept-Encoding: gzip
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Root endpoint
        response = await client.get("/", headers={"Accept-Encoding": "gzip"})
        assert response.status_code == 200
