"""
Seed script — populates SQLite with carrier profiles and a test admin user.
Run: python scripts/seed_data.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal, init_db
from app.models.carrier import CarrierProfile
from app.models.user import User, UserRole
from app.core.security import hash_password
# Import all models so tables are created
from app.models import user, shipment, tracking, carrier, document, escalation  # noqa
import uuid


CARRIERS = [
    {
        "carrier_code": "FEDEX",
        "carrier_name": "FedEx",
        "supported_services": ["FEDEX_GROUND", "FEDEX_EXPRESS_SAVER", "PRIORITY_OVERNIGHT"],
        "api_provider": "easypost",
        "avg_on_time_rate": 0.94,
        "avg_delay_hours": 1.2,
        "reliability_score": 0.94,
        "base_rate_per_kg": 8.50,
        "avg_carbon_per_kg_km": 0.150,
        "has_ev_fleet": True,
        "green_certified": True,
    },
    {
        "carrier_code": "UPS",
        "carrier_name": "UPS",
        "supported_services": ["UPS_GROUND", "UPS_2ND_DAY_AIR", "UPS_NEXT_DAY_AIR"],
        "api_provider": "easypost",
        "avg_on_time_rate": 0.96,
        "avg_delay_hours": 0.8,
        "reliability_score": 0.96,
        "base_rate_per_kg": 9.00,
        "avg_carbon_per_kg_km": 0.140,
        "has_ev_fleet": True,
        "green_certified": True,
    },
    {
        "carrier_code": "DHL",
        "carrier_name": "DHL Express",
        "supported_services": ["DHL_EXPRESS_WORLDWIDE", "DHL_EXPRESS_12"],
        "api_provider": "easypost",
        "avg_on_time_rate": 0.97,
        "avg_delay_hours": 0.5,
        "reliability_score": 0.97,
        "base_rate_per_kg": 12.00,
        "avg_carbon_per_kg_km": 0.120,
        "has_ev_fleet": True,
        "green_certified": True,
    },
    {
        "carrier_code": "USPS",
        "carrier_name": "USPS",
        "supported_services": ["Priority Mail", "Priority Mail Express"],
        "api_provider": "easypost",
        "avg_on_time_rate": 0.91,
        "avg_delay_hours": 2.5,
        "reliability_score": 0.91,
        "base_rate_per_kg": 5.50,
        "avg_carbon_per_kg_km": 0.096,
        "has_ev_fleet": False,
        "green_certified": False,
    },
]

ADMIN_USER = {
    "email": "admin@agenticshipping.com",
    "full_name": "System Admin",
    "password": "Admin1234",
    "role": UserRole.ADMIN,
}


async def seed():
    print("Initializing SQLite database...")
    await init_db()

    async with AsyncSessionLocal() as db:
        print("\nSeeding carriers:")
        for carrier_data in CARRIERS:
            c = CarrierProfile(id=uuid.uuid4(), **carrier_data)
            db.add(c)
            print(f"  + {carrier_data['carrier_name']}")

        print("\nSeeding admin user:")
        admin = User(
            id=uuid.uuid4(),
            email=ADMIN_USER["email"],
            full_name=ADMIN_USER["full_name"],
            hashed_password=hash_password(ADMIN_USER["password"]),
            role=ADMIN_USER["role"],
        )
        db.add(admin)
        print(f"  + Email:    {ADMIN_USER['email']}")
        print(f"  + Password: {ADMIN_USER['password']}")

        await db.commit()

    print("\nSeed completed! Database: ./shipping.db")
    print("\nNext step:")
    print("  uvicorn app.main:app --reload --port 8000")
    print("  Open: http://localhost:8000/docs")


if __name__ == "__main__":
    asyncio.run(seed())
