from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
import models
import schemas
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=schemas.TokenResponse)
def register(body: schemas.UserRegister, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="このメールアドレスはすでに登録されています")

    user = models.User(
        email=body.email,
        hashed_password=hash_password(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id)
    return schemas.TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
    )


@router.post("/login", response_model=schemas.TokenResponse)
def login(body: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="メールアドレスまたはパスワードが間違っています")

    token = create_access_token(user.id)
    return schemas.TokenResponse(
        access_token=token,
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
    )


@router.get("/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user
