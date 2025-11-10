from fastapi import FastAPI
from pydantic import BaseModel
import uvicorn
from dbmodel import Product
from database import Session, engine, Base

Base.metadata.create_all(bind=engine)


class ProductSchema(BaseModel):
    """Pydantic schema for request/response validation"""
    id: int = None
    name: str
    price: float
    description: str

    class Config:
        from_attributes = True


app = FastAPI()


@app.get('/')
def greet():
    return 'hello man'


@app.get('/product')
def get_product():
    db = Session()
    products = db.query(Product).all()
    db.close()
    return products


@app.get('/product/{id}')
def get_product_by_id(id: int):
    db = Session()
    product = db.query(Product).filter(Product.id == id).first()
    db.close()
    if product:
        return product
    return {'error': 'product not found'}


@app.post('/product')
def add_product(product: ProductSchema):
    db = Session()
    db_product = Product(
        name=product.name,
        price=product.price,
        description=product.description
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    db.close()
    return db_product


@app.put('/product/{id}')
def update_product(id: int, product: ProductSchema):
    db = Session()
    existing = db.query(Product).filter(Product.id == id).first()
    if existing:
        existing.name = product.name
        existing.description = product.description
        existing.price = product.price
        db.commit()
        db.refresh(existing)
        db.close()
        return 'product updated successfully'
    db.close()
    return {'error': 'product not found'}


@app.delete('/product/{id}')
def delete_product(id: int):
    db = Session()
    product = db.query(Product).filter(Product.id == id).first()
    if product:
        db.delete(product)
        db.commit()
        db.close()
        return 'product deleted successfully'
    db.close()
    return 'product not found'