# 🔌 Backend Integration Guide for 3D Models

## FastAPI Backend Setup (Railway)

### **1. Install Python Dependencies**

```bash
pip install fastapi uvicorn trimesh numpy-stl pillow
```

Add to `requirements.txt`:
```
fastapi>=0.104.1
uvicorn>=0.24.0
trimesh>=4.0.0
numpy-stl>=3.0.0
pillow>=10.1.0
```

---

### **2. Create 3D Model Generator Endpoints**

Create `routers/models_3d.py`:

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
import uuid
from datetime import datetime

router = APIRouter(prefix="/3d", tags=["3D Models"])

# Request/Response Models
class Generate3DModelRequest(BaseModel):
    prompt: str
    room_id: Optional[str] = None
    user_id: Optional[str] = None
    style: Optional[str] = "realistic"  # realistic, low-poly, stylized
    complexity: Optional[str] = "medium"  # simple, medium, complex

class Generate3DModelResponse(BaseModel):
    model_id: str
    model_url: str
    status: str  # processing, completed, failed
    preview_url: Optional[str] = None
    estimated_time: Optional[int] = None

class Model3D(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    prompt: Optional[str] = None
    model_url: str
    preview_url: Optional[str] = None
    format: str
    file_size: Optional[int] = None
    created_at: str
    room_id: Optional[str] = None
    user_id: Optional[str] = None
    status: str

# In-memory storage (replace with database in production)
models_db: dict[str, Model3D] = {}

@router.post("/generate", response_model=Generate3DModelResponse)
async def generate_3d_model(request: Generate3DModelRequest):
    """
    Generate a 3D model from a text prompt.
    
    This is a placeholder - integrate with actual 3D generation service:
    - OpenAI Shap-E
    - Meshy.ai
    - Custom procedural generation
    """
    
    # Generate unique ID
    model_id = str(uuid.uuid4())
    
    # Create placeholder response
    # TODO: Replace with actual 3D generation logic
    model_url = f"/static/models/{model_id}.glb"
    preview_url = f"/static/previews/{model_id}.png"
    
    # Store in database
    model = Model3D(
        id=model_id,
        title=f"Generated: {request.prompt[:50]}",
        description=f"Generated from prompt: {request.prompt}",
        prompt=request.prompt,
        model_url=model_url,
        preview_url=preview_url,
        format="glb",
        file_size=0,
        created_at=datetime.now().isoformat(),
        room_id=request.room_id,
        user_id=request.user_id,
        status="completed"
    )
    models_db[model_id] = model
    
    return Generate3DModelResponse(
        model_id=model_id,
        model_url=model_url,
        status="completed",
        preview_url=preview_url,
        estimated_time=0
    )

@router.get("/models/{model_id}", response_model=Model3D)
async def get_3d_model(model_id: str):
    """Get a specific 3D model by ID."""
    if model_id not in models_db:
        raise HTTPException(status_code=404, detail="Model not found")
    return models_db[model_id]

@router.get("/models", response_model=List[Model3D])
async def list_3d_models(room_id: Optional[str] = None):
    """List all 3D models, optionally filtered by room."""
    if room_id:
        return [m for m in models_db.values() if m.room_id == room_id]
    return list(models_db.values())

@router.delete("/models/{model_id}")
async def delete_3d_model(model_id: str):
    """Delete a 3D model."""
    if model_id not in models_db:
        raise HTTPException(status_code=404, detail="Model not found")
    
    # TODO: Delete actual files
    del models_db[model_id]
    return {"message": "Model deleted successfully"}
```

---

### **3. Add Static File Serving**

In your main FastAPI app (`main.py` or `app.py`):

```python
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os

app = FastAPI(title="Video Chat API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create directories if they don't exist
os.makedirs("static/models", exist_ok=True)
os.makedirs("static/previews", exist_ok=True)

# Mount static files
app.mount("/static/models", StaticFiles(directory="static/models"), name="models")
app.mount("/static/previews", StaticFiles(directory="static/previews"), name="previews")

# Include 3D router
from routers.models_3d import router as models_3d_router
app.include_router(models_3d_router)
```

---

### **4. Simple Procedural 3D Generation**

Create `utils/model_generator.py`:

```python
import trimesh
import numpy as np
from pathlib import Path

def generate_simple_cube(size: float = 1.0) -> trimesh.Trimesh:
    """Generate a simple cube mesh."""
    return trimesh.creation.box(extents=[size, size, size])

def generate_simple_sphere(radius: float = 1.0, subdivisions: int = 3) -> trimesh.Trimesh:
    """Generate a simple sphere mesh."""
    return trimesh.creation.icosphere(subdivisions=subdivisions, radius=radius)

def generate_simple_cylinder(radius: float = 0.5, height: float = 2.0) -> trimesh.Trimesh:
    """Generate a simple cylinder mesh."""
    return trimesh.creation.cylinder(radius=radius, height=height)

def generate_model_from_prompt(prompt: str, output_path: str) -> str:
    """
    Generate a 3D model based on a text prompt.
    
    Simple keyword-based generation (replace with AI in production).
    """
    prompt_lower = prompt.lower()
    
    # Simple keyword matching
    if "cube" in prompt_lower or "box" in prompt_lower:
        mesh = generate_simple_cube()
    elif "sphere" in prompt_lower or "ball" in prompt_lower:
        mesh = generate_simple_sphere()
    elif "cylinder" in prompt_lower or "tube" in prompt_lower:
        mesh = generate_simple_cylinder()
    else:
        # Default to cube
        mesh = generate_simple_cube()
    
    # Apply color if specified
    if "red" in prompt_lower:
        mesh.visual.vertex_colors = [255, 0, 0, 255]
    elif "blue" in prompt_lower:
        mesh.visual.vertex_colors = [0, 0, 255, 255]
    elif "green" in prompt_lower:
        mesh.visual.vertex_colors = [0, 255, 0, 255]
    elif "yellow" in prompt_lower:
        mesh.visual.vertex_colors = [255, 255, 0, 255]
    
    # Export as GLB
    mesh.export(output_path, file_type='glb')
    return output_path

# Example usage in endpoint:
# output_path = f"static/models/{model_id}.glb"
# generate_model_from_prompt(request.prompt, output_path)
```

---

### **5. Update Generate Endpoint with Actual Generation**

Update the `/3d/generate` endpoint:

```python
from utils.model_generator import generate_model_from_prompt

@router.post("/generate", response_model=Generate3DModelResponse)
async def generate_3d_model(request: Generate3DModelRequest):
    """Generate a 3D model from a text prompt."""
    
    # Generate unique ID
    model_id = str(uuid.uuid4())
    
    # Generate actual 3D model file
    model_filename = f"{model_id}.glb"
    model_path = f"static/models/{model_filename}"
    
    try:
        generate_model_from_prompt(request.prompt, model_path)
        file_size = os.path.getsize(model_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model generation failed: {str(e)}")
    
    # Generate preview (optional)
    # TODO: Render preview image using trimesh or matplotlib
    
    model_url = f"/static/models/{model_filename}"
    preview_url = None  # TODO: Generate preview
    
    # Store in database
    model = Model3D(
        id=model_id,
        title=f"Generated: {request.prompt[:50]}",
        description=f"Generated from prompt: {request.prompt}",
        prompt=request.prompt,
        model_url=model_url,
        preview_url=preview_url,
        format="glb",
        file_size=file_size,
        created_at=datetime.now().isoformat(),
        room_id=request.room_id,
        user_id=request.user_id,
        status="completed"
    )
    models_db[model_id] = model
    
    return Generate3DModelResponse(
        model_id=model_id,
        model_url=model_url,
        status="completed",
        preview_url=preview_url,
        estimated_time=0
    )
```

---

### **6. AI-Powered Generation (Advanced)**

For real AI-powered 3D generation, integrate with:

#### **Option 1: OpenAI Shap-E (Discontinued but code available)**
```python
# Example (not production-ready)
import torch
from shap_e.diffusion.sample import sample_latents
from shap_e.diffusion.gaussian_diffusion import diffusion_from_config
from shap_e.models.download import load_model, load_config

def generate_with_shap_e(prompt: str, output_path: str):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    xm = load_model('transmitter', device=device)
    model = load_model('text300M', device=device)
    diffusion = diffusion_from_config(load_config('diffusion'))
    
    # Generate latents
    latents = sample_latents(
        batch_size=1,
        model=model,
        diffusion=diffusion,
        guidance_scale=15.0,
        model_kwargs=dict(texts=[prompt]),
        progress=True,
        clip_denoised=True,
        use_fp16=True,
        device=device,
    )
    
    # Decode to mesh
    # ... (see Shap-E documentation)
```

#### **Option 2: Meshy.ai API**
```python
import requests

def generate_with_meshy(prompt: str, api_key: str):
    response = requests.post(
        "https://api.meshy.ai/v1/text-to-3d",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "prompt": prompt,
            "art_style": "realistic",
            "negative_prompt": "low quality, blurry"
        }
    )
    return response.json()
```

#### **Option 3: Claude API + Procedural**
```python
import anthropic

def generate_with_claude_procedural(prompt: str, claude_api_key: str):
    """Use Claude to generate procedural code, then execute it."""
    client = anthropic.Anthropic(api_key=claude_api_key)
    
    message = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": f"Generate Python trimesh code to create a 3D model of: {prompt}"
        }]
    )
    
    # Extract and execute the code (with safety checks!)
    # This is dangerous - only use in controlled environment
    code = message.content[0].text
    # ... execute safely
```

---

### **7. Test the Backend**

Start your FastAPI server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Test endpoints:
```bash
# Generate a model
curl -X POST http://localhost:8000/3d/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a blue cube", "style": "low-poly"}'

# List models
curl http://localhost:8000/3d/models

# Get specific model
curl http://localhost:8000/3d/models/{model_id}
```

---

### **8. Deploy to Railway**

1. **Push to Railway:**
   ```bash
   railway login
   railway up
   ```

2. **Set Environment Variables:**
   ```bash
   railway variables set ANTHROPIC_API_KEY=your_key_here
   railway variables set MESHY_API_KEY=your_key_here
   ```

3. **Update Frontend .env:**
   ```env
   NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app
   ```

---

## 🎯 Quick Start Testing

### **1. Simple Test Model**

Place a test GLB file in `static/models/test.glb` and test:

```bash
curl http://localhost:8000/static/models/test.glb
```

### **2. Frontend Test**

Update `AI3DModelGenerator.tsx` temporarily:

```tsx
const handleGenerate = async () => {
  // Bypass API for testing
  const testUrl = `${process.env.NEXT_PUBLIC_API_URL}/static/models/test.glb`;
  setModelUrl(testUrl);
};
```

---

## ✅ Backend Checklist

- [ ] Install Python dependencies
- [ ] Create `/3d/generate` endpoint
- [ ] Create `/3d/models` endpoints
- [ ] Add static file serving
- [ ] Test with simple shapes (cube, sphere)
- [ ] Deploy to Railway
- [ ] Test from frontend
- [ ] (Optional) Integrate AI generation

---

## 🚀 Production Recommendations

1. **Use Database:** Replace in-memory `models_db` with PostgreSQL/MongoDB
2. **Add Authentication:** Protect endpoints with JWT tokens
3. **File Storage:** Use AWS S3/Cloudinary instead of local storage
4. **Rate Limiting:** Prevent abuse of generation endpoint
5. **Background Jobs:** Use Celery for async model generation
6. **CDN:** Serve models via CDN (CloudFront/Cloudflare)
7. **Monitoring:** Add logging and error tracking (Sentry)

---

Your backend is now ready to serve 3D models to your Next.js frontend! 🎉
