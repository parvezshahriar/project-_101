from pydantic import BaseModel
from typing import Optional


class ProductSchema(BaseModel):
    name: str
    price: float
    description: Optional[str] = None

    class Config:
        orm_mode = True


