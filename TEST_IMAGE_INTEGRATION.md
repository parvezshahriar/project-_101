# Image Integration Testing Guide

## System Architecture

### Backend Flow
1. **Upload Endpoint** (`POST /upload-image/`)
   - Receives image file
   - Creates thumbnail with PIL (max 800x800)
   - Saves as UUID.png to `/uploads/` directory
   - Stores URL path `/uploads/uuid.png` in database
   - Returns image metadata with filepath

2. **Product Endpoint** (`GET /product`)
   - Fetches all products
   - Maps images to products by index (first product gets first image, etc.)
   - Returns `image_path` field for each product (e.g., `/uploads/abc123.png`)
   - Returns `image_id` field (database image ID)

3. **Static Files**
   - `/uploads` directory mounted with StaticFiles
   - Serves images at `http://localhost:8000/uploads/filename.png`

### Frontend Flow
1. **Load Products** (`loadProducts()`)
   - Fetches from `GET /product`
   - Maps `image_path` from API to `product.image`
   - Stores products in `appState.products`

2. **Display Products** (`displayProducts()`)
   - Checks if `product.image.startsWith('/')`
   - Constructs full URL: `${API_BASE_URL}${product.image}`
   - Result: `http://localhost:8000/uploads/uuid.png`
   - Sets as `<img src>` attribute
   - Falls back to 📦 emoji if image fails

3. **Product Modal** (`openProductModal()`)
   - Same URL construction as displayProducts
   - Shows full-size image (max 400px height)
   - Emoji fallback on error

4. **Shopping Cart** (`displayCart()`)
   - Retrieves cart from localStorage
   - Maps images same way as products
   - Shows thumbnail in cart items

## Testing Checklist

### Pre-Flight Checks
- [ ] `/uploads` directory exists at project root
- [ ] `/uploads` directory is readable and writable
- [ ] `shop.html` file exists in `/frontend` folder
- [ ] Database has Product and ImageModel tables created

### Test Steps

#### 1. Start Backend
```powershell
cd c:\Users\shahriar.shaon\Desktop\Nagad_demo
python -m uvicorn main:app --reload
```
Expected: Server runs on `http://localhost:8000`

#### 2. Start Frontend Server
```powershell
# In new terminal, from project root
python -m http.server 3000 --directory frontend
```
Expected: Server runs on `http://localhost:3000`

#### 3. Open Shopping Website
- Navigate to `http://localhost:3000/shop.html`
- Should see product grid with 📦 emojis (no images yet)

#### 4. Upload Test Image
Via Postman or curl:
```bash
curl -X POST http://localhost:8000/upload-image/ \
  -F "file=@/path/to/test/image.jpg"
```
Expected response:
```json
{
  "id": 1,
  "filename": "test/image.jpg",
  "filepath": "/uploads/abc123xyz789.png"
}
```

#### 5. Verify Database
Check that:
- Image is stored in `uploads/` directory as `abc123xyz789.png`
- Database ImageModel table has entry with `filepath = "/uploads/abc123xyz789.png"`

#### 6. Create/View Product
- POST a new product to `POST /product`
- Refresh shopping website
- Should see product in grid
- Product should have thumbnail image (not just text path)
- Image should be visible in product modal

#### 7. Verify Image URLs
Open browser console (F12):
1. Check Network tab for image requests
2. Images should request from `http://localhost:8000/uploads/uuid.png`
3. Check for 200 status (success) or errors

#### 8. Test Cart
- Add product with image to cart
- View cart
- Product should show thumbnail in cart items
- Check F12 console for image load errors

## Expected URL Patterns

### Backend Returns
```json
{
  "id": 1,
  "name": "Product Name",
  "price": 99.99,
  "description": "...",
  "image_path": "/uploads/abc123.png",
  "image_id": 1
}
```

### Frontend Renders
```html
<img src="http://localhost:8000/uploads/abc123.png" alt="Product Name" class="product-image">
```

## Troubleshooting

### Images Show as 📦 Emoji
1. **Check F12 Console**: What error appears?
2. **Common Issues**:
   - Image path in DB is wrong format (check it starts with `/uploads/`)
   - Image file not actually saved to disk
   - Browser hasn't loaded CSS with emoji fallback
   - CORS issue (should be enabled with `allow_origins=["*"]`)

### Images Return 404
1. Check `/uploads` directory exists
2. Check file actually saved: `ls -la uploads/`
3. Verify static files mount: `app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR)...`

### Product Appears Without Image
1. Verify images exist in database
2. Check image_path field in database (should start with `/`)
3. Check image file exists on disk

### Image Path Shows as Text Instead of Image
1. This was the original issue - should be fixed
2. Verify frontend code has: `product.image.startsWith('/')`
3. Verify full URL is constructed: `${API_BASE_URL}${product.image}`
4. Clear browser cache and reload

## Code Verification

### Backend Image Storage
- **File**: `main.py` lines 88-115
- **Check**: `url_path = f"/uploads/{safe_filename}"` creates proper URL format

### Backend Product Endpoint  
- **File**: `main.py` lines 130-161
- **Check**: Returns `image_path` with leading `/` for each product

### Frontend Product Display
- **File**: `shop-script.js` lines 63-77
- **Check**: `const imageUrl = hasImage ? ${API_BASE_URL}${product.image} : null;`

### Frontend Modal
- **File**: `shop-script.js` lines 97-110
- **Check**: Same URL construction with `${API_BASE_URL}${product.image}`

### Frontend Cart
- **File**: `shop-script.js` lines 220-226
- **Check**: Uses same `imageUrl` pattern for cart items

## Success Criteria

✅ System is working correctly when:
1. Uploading image returns proper `/uploads/uuid.png` path
2. Image file is saved to disk in uploads directory
3. GET /product returns image_path with leading slash
4. Product grid shows actual images (not emoji or paths)
5. Product modal shows full-size image
6. Cart shows images for products
7. Browser console has no image loading errors (404, CORS, etc.)
8. Emoji fallback only appears when image intentionally fails to load

## Quick Debug Script

```bash
# Check if uploads directory exists and has files
ls -la uploads/

# Check database images table
sqlite3 database.db "SELECT id, filename, filepath FROM images LIMIT 5;"

# Check database products table  
sqlite3 database.db "SELECT id, name, price FROM products LIMIT 5;"

# Test image endpoint
curl http://localhost:8000/product | jq '.[] | {id, name, image_path}'
```
