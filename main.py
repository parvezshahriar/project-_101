from fastapi import FastAPI, UploadFile, File
import uvicorn
import csv 
from dbmodel import Product
from database import Session, engine, Base
from models import ProductSchema

app = FastAPI()
@app.on_event("startup")

def on_startup():
    Base.metadata.create_all(bind=engine)

@app.post('/csv-upload')
async def upolad_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV file.")
    content = await file.read()
    decoded = content.decode('utf-8').splitlines()
    reader = csv.DictReader(decoded)
    db = Session()
    for row in reader:
        product = Product(
            id=int(row['id']),
            name=row['name'],
            price=float(row['price']),
            description=row.get('description', None)
        )
        db.add(product)
    db.commit()
    db.close()
    return {"message": "CSV data uploaded successfully"}


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