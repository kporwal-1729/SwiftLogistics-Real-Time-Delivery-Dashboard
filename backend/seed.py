"""
Seed script: creates the database tables and inserts initial data.
Run from backend/ directory: python seed.py
"""
import asyncio
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from app.config import settings
from app.database import Base
from app.models.user import User
from app.models.driver import Driver
from app.core.auth import hash_password

engine = create_async_engine(settings.DATABASE_URL, echo=True)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

USERS = [
    {"name": "Admin Dispatcher", "email": "admin@swift.com", "password": "admin123", "role": "admin"},
    {"name": "Alice Customer", "email": "customer@swift.com", "password": "customer123", "role": "customer"},
    {"name": "Bob Customer", "email": "bob@swift.com", "password": "bob123", "role": "customer"},
]

DRIVERS = [
    {"name": "Rajan Sharma", "phone_number": "9876543210", "vehicle_type": "Bike"},
    {"name": "Priya Patel", "phone_number": "9876543211", "vehicle_type": "Car"},
    {"name": "Mohammed Ali", "phone_number": "9876543212", "vehicle_type": "Van"},
    {"name": "Sunita Rao", "phone_number": "9876543213", "vehicle_type": "Bike"},
    {"name": "Vikram Singh", "phone_number": "9876543214", "vehicle_type": "Car"},
]


async def seed():
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables created")

    async with AsyncSessionLocal() as session:
        # Seed users
        users_added = 0
        for u in USERS:
            existing = await session.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": u["email"]},
            )
            if existing.fetchone() is None:
                user = User(
                    id=uuid.uuid4(),
                    name=u["name"],
                    email=u["email"],
                    password_hash=hash_password(u["password"]),
                    role=u["role"],
                )
                session.add(user)
                users_added += 1
        print(f"✅ {users_added} users added (skipped {len(USERS) - users_added} duplicates)")

        # Seed drivers
        drivers_added = 0
        for d in DRIVERS:
            existing = await session.execute(
                text("SELECT id FROM drivers WHERE phone_number = :phone"),
                {"phone": d["phone_number"]},
            )
            if existing.fetchone() is None:
                driver = Driver(
                    id=uuid.uuid4(),
                    name=d["name"],
                    phone_number=d["phone_number"],
                    vehicle_type=d["vehicle_type"],
                    status="available",
                )
                session.add(driver)
                drivers_added += 1
        print(f"✅ {drivers_added} drivers added (skipped {len(DRIVERS) - drivers_added} duplicates)")

        await session.commit()

    print("\n🎉 Database seeded successfully!")
    print("\nLogin credentials:")
    print("  Admin:    admin@swift.com    / admin123")
    print("  Customer: customer@swift.com / customer123")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
