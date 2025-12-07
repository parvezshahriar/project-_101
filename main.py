from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import TYPE_CHECKING
if TYPE_CHECKING:
   from sqlalchemy.ext.asyncio import AsyncSession
import uvicorn
import csv 
import os
from dbmodel import Product, User
from database import Session, engine, Base, AsyncSessionLocal, async_engine
from models import ProductSchema, UserCreat, Userlogin, ImageResponseModel, Country
from passlib.context import CryptContext
import hashlib
from PIL import Image
import io
import uuid
from typing import List, Any
from sqlalchemy import select
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

app = FastAPI()

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (for development only)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

   
##CSV upload endpoint
@app.post('/csv-upload')
async def upload_csv(file: UploadFile = File(...)):
    """Upload products from CSV or Excel file"""
    print(f"[DEBUG] Received file: {file.filename}, Content-Type: {file.content_type}")
    
    # Validate file extension
    valid_extensions = ('.csv', '.xlsx', '.xls')
    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in valid_extensions):
        raise HTTPException(status_code=400, detail="Invalid file format. Please upload a CSV or Excel file (.csv, .xlsx, .xls)")
    
    try:
        content = await file.read()
        print(f"[DEBUG] File size: {len(content)} bytes")
        
        db = Session()
        
        try:
            # Handle different file formats
            if file.filename.lower().endswith('.csv'):
                # CSV format
                print("[DEBUG] Processing CSV file")
                decoded = content.decode('utf-8').splitlines()
                print(f"[DEBUG] Decoded lines: {len(decoded)}")
                reader = csv.DictReader(decoded)
                rows = list(reader)
                print(f"[DEBUG] Rows parsed: {len(rows)}")
            else:
                # Excel format (.xlsx, .xls)
                print("[DEBUG] Processing Excel file")
                import openpyxl
                from io import BytesIO
                excel_file = BytesIO(content)
                workbook = openpyxl.load_workbook(excel_file)
                worksheet = workbook.active
                
                # Get headers from first row
                headers = []
                for cell in worksheet[1]:
                    headers.append(cell.value)
                print(f"[DEBUG] Headers: {headers}")
                
                # Read data rows
                rows = []
                for row in worksheet.iter_rows(min_row=2, values_only=True):
                    if any(cell is not None for cell in row):  # Skip empty rows
                        rows.append(dict(zip(headers, row)))
                print(f"[DEBUG] Rows parsed: {len(rows)}")
            
            if not rows:
                print("[DEBUG] No rows found in file")
                raise HTTPException(status_code=400, detail="File is empty or has no data rows")
            
            # Process each row
            success_count = 0
            errors = []
            
            for idx, row in enumerate(rows, start=2):  # Start at 2 because row 1 is headers
                try:
                    print(f"[DEBUG] Processing row {idx}: {row}")
                    
                    # Validate required fields
                    if not row.get('name'):
                        errors.append(f"Row {idx}: Missing 'name' field")
                        continue
                    if not row.get('price'):
                        errors.append(f"Row {idx}: Missing 'price' field")
                        continue
                    
                    try:
                        price = float(row['price'])
                    except (ValueError, TypeError):
                        errors.append(f"Row {idx}: Invalid price value '{row['price']}'")
                        continue
                    
                    # Create product (database will auto-assign ID)
                    product = Product(
                        name=str(row['name']).strip(),
                        price=price,
                        description=str(row.get('description', '')).strip() if row.get('description') else None
                    )
                    db.add(product)
                    success_count += 1
                    print(f"[DEBUG] Row {idx} queued for insertion")
                except Exception as e:
                    errors.append(f"Row {idx}: {str(e)}")
                    print(f"[DEBUG] Row {idx} Exception: {e}")
            
            print(f"[DEBUG] Total queued: {success_count}, errors: {len(errors)}")
            
            # Commit all successful rows
            try:
                if success_count > 0:
                    db.commit()
                    print(f"[DEBUG] Successfully committed {success_count} products")
                else:
                    print("[DEBUG] No products to commit")
            except Exception as e:
                db.rollback()
                errors.insert(0, f"Database error: {str(e)}")
                success_count = 0
                print(f"[DEBUG] Commit failed: {e}")
            
            db.close()
            
            # Return result with summary
            result = {
                "message": f"Successfully imported {success_count} products",
                "success_count": success_count,
                "error_count": len(errors)
            }
            
            if errors:
                result["errors"] = errors[:10]  # Return first 10 errors
                if len(errors) > 10:
                    result["message"] += f" ({len(errors)} total errors)"
                else:
                    result["message"] += f" with {len(errors)} error(s)"
            
            print(f"[DEBUG] Returning result: {result}")
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            print(f"[DEBUG] Exception during processing: {e}")
            import traceback
            traceback.print_exc()
            db.close()
            raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"[DEBUG] Outer exception: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Server error: {str(e)}")

##upload image endpoint
UPLOADS_DIR = "uploads"
os.makedirs(UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# --- Dependency for Database Session ---
async def get_db()->Any:
    if AsyncSessionLocal is None:
        raise HTTPException(status_code=503, detail="Async DB engine not available. Install 'asyncpg' or set ASYNC_DATABASE_URL.")
    async with AsyncSessionLocal() as session:
        yield session

@app.on_event("startup")
async def startup_event():
    # Startup now does not create tables. Schema should be created separately
    # using the provided script `scripts/create_tables.py` or via Alembic.
    return

##main image upload endpoint
@app.post("/upload-image/", response_model=ImageResponseModel)
async def upload_image(file: UploadFile = File(...), db: Any = Depends(get_db)):
    content = await file.read()

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload an image.")

    pil_image = None
    safe_filename = f"{uuid.uuid4()}.png"
    save_path = os.path.join(UPLOADS_DIR, safe_filename)

    try:
        pil_image = Image.open(io.BytesIO(content))
        pil_image.thumbnail((800, 800))
        pil_image.save(save_path, 'PNG')
    except Exception:
        if pil_image:
            try:
                pil_image.close()
            except Exception:
                pass
        raise HTTPException(status_code=400, detail="Error processing image.")
    finally:
        if pil_image:
            try:
                pil_image.close()
            except Exception:
                pass

    # Save metadata to database
    from dbmodel import ImageModel
    # Store the URL path, not the file system path
    url_path = f"/uploads/{safe_filename}"
    new_image = ImageModel(filename=file.filename, filepath=url_path)

    try:
        db.add(new_image)
        await db.commit()
        await db.refresh(new_image)
        return {"id": new_image.id, "filename": new_image.filename, "filepath": new_image.filepath}
    except Exception:
        await db.rollback()
        if os.path.exists(save_path):
            os.remove(save_path)
        raise HTTPException(status_code=500, detail="Error saving image to database.")
##GET Image by id endpoint
@app.get("/images/{image_id}", response_model=ImageResponseModel)
async def get_image(image_id: int, db: Any = Depends(get_db)):
    from dbmodel import ImageModel
    result = await db.execute(select(ImageModel).where(ImageModel.id == image_id))
    db_image = result.scalars().first()
    if not db_image:
        raise HTTPException(status_code=404, detail="Image not found")
    return db_image

##Clear all products endpoint
@app.delete('/product-clear')
def clear_products():
    """DELETE all products from database (use with caution)"""
    db = Session()
    try:
        count = db.query(Product).delete()
        db.commit()
        db.close()
        return {"message": f"Deleted {count} products", "count": count}
    except Exception as e:
        db.rollback()
        db.close()
        raise HTTPException(status_code=400, detail=f"Error clearing products: {str(e)}")

##Product CRUD endpoints - get all products
@app.get('/product', name='get_all_products')
def get_all_products():
    db = Session()
    try:
        products = db.query(Product).all()
        # Load images from database
        from dbmodel import ImageModel
        images = db.query(ImageModel).all()
        
        # Create a result list with product-image mapping
        result = []
        for idx, product in enumerate(products):
            product_data = {
                'id': product.id,
                'name': product.name,
                'price': product.price,
                'description': product.description,
                'image_path': None,
                'image_id': None
            }
            # Try to match image with product by index
            if idx < len(images):
                product_data['image_id'] = images[idx].id
                # Ensure filepath is a URL path
                filepath = images[idx].filepath
                if not filepath.startswith('/'):
                    filepath = f'/uploads/{filepath}'
                product_data['image_path'] = filepath
            result.append(product_data)
        
        return result
    finally:
        db.close()

##product by id endpoint
@app.get('/product/{id}')
def get_product_by_id(id: int):
    db = Session()
    try:
        product = db.query(Product).filter(Product.id == id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product with ID {id} not found")
        return product
    finally:
        db.close()

##add product endpoint
@app.post('/product')
def add_product(product: ProductSchema):
    db = Session()
    try:
        db_product = Product(
            name=product.name,
            price=product.price,
            description=product.description
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Product with this ID already exists or database integrity error") from e
    finally:
        db.close()

##add Country endpoint
@app.post('/country')
def add_country(country: Country):
    db = Session()
    try:
        # Create DB model instance
        from dbmodel import Country as DBCountry

        # Check for existing country by name or code to avoid unique constraint errors
        existing = db.query(DBCountry).filter(
            or_(DBCountry.name == country.name, DBCountry.code == country.code)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Country with same name or code already exists")

        db_country = DBCountry(
            name=country.name,
            code=country.code,
        )
        db.add(db_country)
        try:
            db.commit()
        except IntegrityError as e:
            db.rollback()
            raise HTTPException(status_code=400, detail="Database integrity error when inserting country") from e
        db.refresh(db_country)
        return db_country
    finally:
        db.close()

##update product endpoint
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

##  delete product endpoint
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