from pydantic import BaseModel
from typing import Optional


class ProductSchema(BaseModel):
    id: Optional[int] = None
    name: str
    price: float
    description: Optional[str] = None

    class Config:
        from_attributes = True


class UserCreat(BaseModel):
    username: str
    password: str

    class Config:
        orm_mode = True

class Userlogin(BaseModel):
    id: Optional[int] = None
    username: str
    password: str

class ImageResponseModel(BaseModel):
    id: int
    filename: str
    filepath: str

    class Config:
        orm_mode = True


class Country(BaseModel):
    id: Optional[int] = None
    name: str
    code: str

    class Config:
        orm_mode = True

class Country(BaseModel):
    id: int
    name: str
    code: str

    class Config:
       from_attributes = True
