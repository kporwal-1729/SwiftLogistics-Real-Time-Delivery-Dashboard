from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, UserOut
from app.core.auth import verify_password, create_access_token
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=86400,
    )
    return {
        "message": "Login successful",
        "user": {"id": str(user.id), "name": user.name, "email": user.email, "role": user.role},
    }


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token")
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
async def get_me(request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user(request, db)
    return UserOut(id=str(user.id), name=user.name, email=user.email, role=user.role)
