# Shopping Website - Image Integration Guide

## Overview
The shopping website now automatically fetches product images from the database and displays them with matching product IDs.

## How It Works

### 1. Image Upload
- Upload images via the `/upload-image/` endpoint
- Images are saved to the `uploads/` directory
- Metadata is stored in the database

### 2. Product-Image Matching
- When products are fetched, the system looks for corresponding images
- Images are matched by index (first image with first product, etc.)
- Product image data is returned with each product

### 3. Image Display
The frontend displays images in three places:
- **Product Grid**: Thumbnail images in the product cards
- **Product Modal**: Full-size image in the detailed product view
- **Shopping Cart**: Product images next to cart items

## API Endpoints

### Upload Image
```bash
POST /upload-image/
```
Upload an image file and store its metadata.

**Response:**
```json
{
  "id": 1,
  "filename": "product-image.png",
  "filepath": "/uploads/uuid.png"
}
```

### Get Product with Image
```bash
GET /product
```
Returns all products with their associated image paths:

**Response:**
```json
[
  {
    "id": 1,
    "name": "Product Name",
    "price": 99.99,
    "description": "Product description",
    "image_id": 1,
    "image_path": "/uploads/uuid.png"
  }
]
```

### Get Image by ID
```bash
GET /images/{image_id}
```
Returns image metadata by ID.

## Testing the Feature

### 1. Upload an Image
```bash
curl -X POST -F "file=@image.png" http://localhost:8000/upload-image/
```

### 2. View Products with Images
- Navigate to `http://localhost:3000/shop.html`
- Click "Shop" to see products with their images
- Click on a product to see the full-size image

### 3. Add to Cart
- Products in the cart display their images
- Images follow the product through the checkout process

## File Structure

```
frontend/
├── shop.html           # Main shopping website
├── shop-styles.css    # Styling
├── shop-script.js     # JavaScript logic including image handling
├── index.html         # Original admin interface
├── styles.css         # Original admin styles
└── script.js          # Original admin script

backend/
├── main.py            # FastAPI app with image endpoints
├── dbmodel.py         # Database models including ImageModel
├── database.py        # Database configuration
└── models.py          # Pydantic schemas

uploads/               # Directory for uploaded images
```

## Image Fallback
If an image fails to load or is not found:
- A placeholder box appears with a 📦 emoji
- The product remains functional
- Shopping experience is not affected

## Troubleshooting

### Images Not Showing
1. Check that images were uploaded: `http://localhost:8000/images/1`
2. Verify `uploads/` directory exists and has files
3. Check browser console (F12) for error messages

### Image Upload Fails
1. Ensure `uploads/` directory exists
2. Check file permissions
3. Verify file size is reasonable

### Product-Image Mismatch
- Images are matched by upload order
- Upload images in the same order as products
- Or modify the `loadProducts()` function to use custom matching logic

## Future Enhancements

1. **Product-Image Relationship**: Add `image_id` field to Product model
2. **Multiple Images**: Support multiple images per product
3. **Image Optimization**: Compress images on upload
4. **Image Gallery**: Show multiple product images in modal
5. **Lazy Loading**: Load images only when needed
