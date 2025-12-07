// API Configuration
const API_BASE_URL = 'http://localhost:8000';

// ============ UTILITY FUNCTIONS ============

function jsonToTable(data) {
    if (!data) return '<p>No data available</p>';
    
    // Handle single object (not an array)
    if (!Array.isArray(data)) {
        return objectToTable(data);
    }
    
    // Handle array
    if (Array.isArray(data) && data.length === 0) {
        return '<p>No data available</p>';
    }
    
    return arrayToTable(data);
}

function arrayToTable(array) {
    if (array.length === 0) return '<p>No data available</p>';
    
    // Get all unique keys from all objects and sort with 'id' first
    const allKeys = new Set();
    array.forEach(obj => {
        if (typeof obj === 'object' && obj !== null) {
            Object.keys(obj).forEach(key => allKeys.add(key));
        }
    });
    
    let keys = Array.from(allKeys);
    // Sort keys with 'id' first
    keys.sort((a, b) => {
        if (a === 'id') return -1;
        if (b === 'id') return 1;
        return a.localeCompare(b);
    });
    
    let html = '<table class="data-table"><thead><tr>';
    keys.forEach(key => {
        html += `<th>${formatColumnName(key)}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    array.forEach(item => {
        html += '<tr>';
        keys.forEach(key => {
            const value = item[key];
            let displayValue = value === null ? '—' : String(value);
            // Highlight ID column
            const idClass = key === 'id' ? ' class="id-cell"' : '';
            html += `<td${idClass}>${escapeHtml(displayValue)}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
}

function objectToTable(obj) {
    let html = '<div class="object-display">';
    
    if (typeof obj === 'object' && obj !== null) {
        let keys = Object.keys(obj);
        // Sort keys with 'id' first
        keys.sort((a, b) => {
            if (a === 'id') return -1;
            if (b === 'id') return 1;
            return a.localeCompare(b);
        });
        
        html += '<table class="data-table"><tbody>';
        keys.forEach(key => {
            const value = obj[key];
            let displayValue = value === null ? '—' : String(value);
            const idClass = key === 'id' ? ' class="id-row"' : '';
            html += `<tr${idClass}><td class="key"><strong>${formatColumnName(key)}</strong></td><td>${escapeHtml(displayValue)}</td></tr>`;
        });
        html += '</tbody></table>';
    }
    
    html += '</div>';
    return html;
}

function formatColumnName(name) {
    // Convert snake_case or camelCase to Title Case
    return name
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status ${type}`;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            element.className = 'status';
        }, 5000);
    }
}
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        // Remove active class from all buttons and sections
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(section => section.classList.remove('active'));
        
        // Add active class to clicked button and corresponding section
        btn.classList.add('active');
        document.getElementById(tabName).classList.add('active');
    });
});

// ============ PRODUCT FUNCTIONS ============

// Add Product
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('productName').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const description = document.getElementById('productDescription').value;
    
    const statusDiv = document.getElementById('addProductStatus');
    
    try {
        const response = await fetch(`${API_BASE_URL}/product`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                price,
                description: description || null
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showStatus(statusDiv, `Product added successfully! ID: ${data.id}`, 'success');
            document.getElementById('addProductForm').reset();
        } else {
            const error = await response.json();
            showStatus(statusDiv, `Error: ${error.detail || 'Failed to add product'}`, 'error');
        }
    } catch (error) {
        showStatus(statusDiv, `Error: ${error.message}`, 'error');
    }
});

// Get All Products
async function getAllProducts() {
    const resultDiv = document.getElementById('allProductsResult');
    resultDiv.classList.remove('active');
    resultDiv.innerHTML = '<p>Loading...</p>';
    resultDiv.classList.add('active');
    
    try {
        const response = await fetch(`${API_BASE_URL}/product`);
        const products = await response.json();
        
        resultDiv.innerHTML = jsonToTable(products);
    } catch (error) {
        resultDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

// Get Product by ID
async function getProductById() {
    const id = document.getElementById('getProductId').value;
    const resultDiv = document.getElementById('getProductResult');
    
    if (!id) {
        resultDiv.classList.remove('active');
        resultDiv.innerHTML = '<p style="color: #e53e3e; font-weight: bold;">Please enter a product ID</p>';
        resultDiv.classList.add('active');
        return;
    }
    
    resultDiv.classList.remove('active');
    resultDiv.innerHTML = '<p style="color: #2c5282;">Loading...</p>';
    resultDiv.classList.add('active');
    
    try {
        console.log(`Fetching product with ID: ${id}`);
        const response = await fetch(`${API_BASE_URL}/product/${id}`);
        console.log(`Response status: ${response.status}`);
        
        if (response.ok) {
            const product = await response.json();
            console.log('Product received:', product);
            resultDiv.innerHTML = jsonToTable(product);
        } else {
            const error = await response.json();
            console.error('Error response:', error);
            resultDiv.innerHTML = `<p style="color: red;">Error: ${error.detail || 'Product not found'}</p>`;
        }
    } catch (error) {
        console.error('Fetch error:', error);
        resultDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

// Update Product
document.getElementById('updateProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const id = document.getElementById('updateProductId').value;
    const name = document.getElementById('updateProductName').value;
    const price = parseFloat(document.getElementById('updateProductPrice').value);
    const description = document.getElementById('updateProductDescription').value;
    
    const statusDiv = document.getElementById('updateProductStatus');
    
    try {
        const response = await fetch(`${API_BASE_URL}/product/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                price,
                description: description || null
            })
        });
        
        if (response.ok) {
            showStatus(statusDiv, 'Product updated successfully!', 'success');
            document.getElementById('updateProductForm').reset();
        } else {
            const error = await response.json();
            showStatus(statusDiv, `Error: ${error.detail || 'Failed to update product'}`, 'error');
        }
    } catch (error) {
        showStatus(statusDiv, `Error: ${error.message}`, 'error');
    }
});

// Delete Product
async function deleteProduct() {
    const id = document.getElementById('deleteProductId').value;
    const statusDiv = document.getElementById('deleteProductStatus');
    
    if (!id) {
        showStatus(statusDiv, 'Please enter a product ID', 'error');
        return;
    }
    
    if (!confirm(`Are you sure you want to delete product ${id}?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/product/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showStatus(statusDiv, 'Product deleted successfully!', 'success');
            document.getElementById('deleteProductId').value = '';
        } else {
            const error = await response.json();
            showStatus(statusDiv, `Error: ${error.detail || 'Failed to delete product'}`, 'error');
        }
    } catch (error) {
        showStatus(statusDiv, `Error: ${error.message}`, 'error');
    }
}

// ============ CSV UPLOAD FUNCTION ============

async function uploadCSV() {
    const file = document.getElementById('csvFile').files[0];
    const statusDiv = document.getElementById('csvStatus');
    
    if (!file) {
        showStatus(statusDiv, 'Please select a CSV file', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/csv-upload`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            showStatus(statusDiv, data.message, 'success');
            document.getElementById('csvFile').value = '';
        } else {
            const error = await response.json();
            showStatus(statusDiv, `Error: ${error.detail || 'Failed to upload CSV'}`, 'error');
        }
    } catch (error) {
        showStatus(statusDiv, `Error: ${error.message}`, 'error');
    }
}

// ============ IMAGE FUNCTIONS ============

// Upload Image
async function uploadImage() {
    const file = document.getElementById('imageFile').files[0];
    const statusDiv = document.getElementById('uploadImageStatus');
    
    if (!file) {
        showStatus(statusDiv, 'Please select an image file', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const response = await fetch(`${API_BASE_URL}/upload-image/`, {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            const data = await response.json();
            showStatus(statusDiv, `Image uploaded successfully! ID: ${data.id}`, 'success');
            document.getElementById('imageFile').value = '';
        } else {
            const error = await response.json();
            showStatus(statusDiv, `Error: ${error.detail || 'Failed to upload image'}`, 'error');
        }
    } catch (error) {
        showStatus(statusDiv, `Error: ${error.message}`, 'error');
    }
}

// Get Image
async function getImage() {
    const id = document.getElementById('getImageId').value;
    const resultDiv = document.getElementById('getImageResult');
    
    if (!id) {
        showStatus(resultDiv, 'Please enter an image ID', 'error');
        return;
    }
    
    resultDiv.classList.remove('active');
    resultDiv.innerHTML = '<p>Loading...</p>';
    resultDiv.classList.add('active');
    
    try {
        const response = await fetch(`${API_BASE_URL}/images/${id}`);
        
        if (response.ok) {
            const image = await response.json();
            resultDiv.innerHTML = `
                ${jsonToTable(image)}
                <img src="${API_BASE_URL}${image.filepath}" alt="Image" style="margin-top: 15px; max-width: 100%; max-height: 300px; border-radius: 6px;">
            `;
        } else {
            const error = await response.json();
            resultDiv.innerHTML = `<p style="color: red;">${error.detail || 'Image not found'}</p>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
    }
}

// ============ COUNTRY FUNCTIONS ============

// Add Country
document.getElementById('addCountryForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('countryName').value;
    const code = document.getElementById('countryCode').value.toUpperCase();
    
    const statusDiv = document.getElementById('addCountryStatus');
    
    try {
        const response = await fetch(`${API_BASE_URL}/country`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                code
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            showStatus(statusDiv, `Country added successfully! ID: ${data.id}`, 'success');
            document.getElementById('addCountryForm').reset();
        } else {
            const error = await response.json();
            showStatus(statusDiv, `Error: ${error.detail || 'Failed to add country'}`, 'error');
        }
    } catch (error) {
        showStatus(statusDiv, `Error: ${error.message}`, 'error');
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    console.log('Frontend loaded. API Base URL:', API_BASE_URL);
    console.log('Make sure your FastAPI backend is running on port 8000');
});
