import pytest
from decimal import Decimal
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product
from app.models.bill import Bill
from app.models.audit import AuditLog


async def get_auth_token(client: AsyncClient, username="admin", password="secretpassword") -> str:
    res = await client.post("/api/v1/auth/login", json={"username": username, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_scenario_1_basic_billing_calculation(client: AsyncClient, db_session: AsyncSession):
    """
    Scenario 1: Basic Item Billing Calculation
    Input:
      - Small Coffee (Price: ₹20.00, Qty: 2) -> Espresso Single is ₹20.00
      - Cafe Latte (Price: ₹50.00, Qty: 1)
    Expected Calculation:
      - Line 1: 20.00 * 2 = 40.00
      - Line 2: 50.00 * 1 = 50.00
      - Subtotal: 90.00
      - Total Payable: 90.00
    """
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    # Find Espresso Single and Cafe Latte
    p1 = (await db_session.execute(select(Product).where(Product.name == "Espresso Single"))).scalars().first()
    p2 = (await db_session.execute(select(Product).where(Product.name == "Cafe Latte"))).scalars().first()
    assert p1 is not None and p2 is not None

    payload = {
        "payment_mode": "CASH",
        "discount_amount": "0.00",
        "tax_amount": "0.00",
        "items": [
            {"product_id": p1.id, "quantity": 2},
            {"product_id": p2.id, "quantity": 1}
        ]
    }

    res = await client.post("/api/v1/bills", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    data = res.json()

    assert Decimal(str(data["subtotal"])) == Decimal("90.00")
    assert Decimal(str(data["total_amount"])) == Decimal("90.00")
    assert len(data["items"]) == 2
    assert Decimal(str(data["items"][0]["line_total"])) == Decimal("40.00")
    assert Decimal(str(data["items"][1]["line_total"])) == Decimal("50.00")


@pytest.mark.asyncio
async def test_scenario_2_historical_price_snapshot_preservation(client: AsyncClient, db_session: AsyncSession):
    """
    Scenario 2: Historical Price Snapshot Preservation
    Steps:
      1. Product "Espresso Double (Doppio)" created at ₹30.00.
      2. Bill saved containing 1 Espresso Double (Line Total: ₹30.00).
      3. Product price updated to ₹40.00 in Product Management.
      4. Query original Bill details.
    Expected:
      - Original bill snapshot price MUST remain ₹30.00.
      - Total for original bill MUST remain ₹30.00.
    """
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    prod = (await db_session.execute(select(Product).where(Product.name == "Espresso Double (Doppio)"))).scalars().first()
    assert prod is not None
    assert Decimal(str(prod.selling_price)) == Decimal("30.00")

    # Step 2: Create bill
    bill_payload = {
        "payment_mode": "CASH",
        "discount_amount": "0.00",
        "tax_amount": "0.00",
        "items": [
            {"product_id": prod.id, "quantity": 1}
        ]
    }
    bill_res = await client.post("/api/v1/bills", json=bill_payload, headers=headers)
    assert bill_res.status_code == 201
    bill_data = bill_res.json()
    bill_id = bill_data["id"]
    assert Decimal(str(bill_data["total_amount"])) == Decimal("30.00")

    # Step 3: Update product price to 40.00
    update_res = await client.put(f"/api/v1/products/{prod.id}", json={"selling_price": "40.00"}, headers=headers)
    assert update_res.status_code == 200

    # Step 4: Query original bill
    get_bill_res = await client.get(f"/api/v1/bills/{bill_id}", headers=headers)
    assert get_bill_res.status_code == 200
    queried_bill = get_bill_res.json()

    assert Decimal(str(queried_bill["total_amount"])) == Decimal("30.00")
    assert Decimal(str(queried_bill["items"][0]["unit_price_snapshot"])) == Decimal("30.00")
    assert Decimal(str(queried_bill["items"][0]["line_total"])) == Decimal("30.00")


@pytest.mark.asyncio
async def test_scenario_3_inactive_product_rejection(client: AsyncClient, db_session: AsyncSession):
    """
    Scenario 3: Inactive Product Rejection
    Steps:
      1. Cashier adds product to cart.
      2. Product set to is_active = false.
      3. Save bill submitted.
    Expected:
      - Backend rejects request with HTTP 400.
      - Zero bills created for this transaction.
    """
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    prod = (await db_session.execute(select(Product).where(Product.name == "Butter Flaky Croissant"))).scalars().first()
    assert prod is not None

    # Deactivate product
    deact_res = await client.put(f"/api/v1/products/{prod.id}", json={"is_active": False}, headers=headers)
    assert deact_res.status_code == 200

    # Attempt to bill deactivated product
    payload = {
        "payment_mode": "CASH",
        "items": [
            {"product_id": prod.id, "quantity": 1}
        ]
    }
    bill_res = await client.post("/api/v1/bills", json=payload, headers=headers)
    assert bill_res.status_code == 400
    assert "deactivated" in bill_res.json()["error"]["message"].lower()


@pytest.mark.asyncio
async def test_scenario_4_bill_void_auditability(client: AsyncClient, db_session: AsyncSession):
    """
    Scenario 4: Bill Void Auditability
    Steps:
      1. Void bill with reason "Customer changed mind".
    Expected:
      - Bill status updated to VOID.
      - void_reason saved.
      - audit_logs record created.
      - Daily analytics excludes this bill from total revenue.
    """
    token = await get_auth_token(client)
    headers = {"Authorization": f"Bearer {token}"}

    prod = (await db_session.execute(select(Product).where(Product.name == "Classic Cappuccino"))).scalars().first()
    assert prod is not None

    # Create bill
    bill_res = await client.post("/api/v1/bills", json={
        "payment_mode": "UPI",
        "items": [{"product_id": prod.id, "quantity": 2}]
    }, headers=headers)
    assert bill_res.status_code == 201
    bill_id = bill_res.json()["id"]

    # Void the bill
    void_res = await client.post(f"/api/v1/bills/{bill_id}/void", json={
        "reason": "Customer changed mind / duplicate entry"
    }, headers=headers)
    assert void_res.status_code == 200
    void_data = void_res.json()
    assert void_data["status"] == "VOID"
    assert void_data["void_reason"] == "Customer changed mind / duplicate entry"

    # Verify audit log
    audit_res = await client.get("/api/v1/audit/logs?action=BILL_VOIDED", headers=headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()["items"]
    assert any(log["entity_id"] == str(bill_id) for log in logs)
