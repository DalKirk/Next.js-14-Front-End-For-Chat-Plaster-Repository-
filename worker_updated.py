#!/usr/bin/env python3
"""
GPU Worker API for 3D Model Generation - Enhanced Version
Handles requests from Railway backend and generates 3D models using RTX GPU
Enhanced with quality refinement, progress tracking, and optimization
"""

from fastapi import FastAPI, BackgroundTasks, HTTPException, Header, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
import subprocess
import os
import requests
import uuid
from pathlib import Path
import json
from datetime import datetime
import logging
from typing import Optional
import psutil
import GPUtil
import sys
import io
from PIL import Image
import zipfile
import tempfile

# Configuration
OUTPUT_DIR = Path("outputs")
TEMP_DIR = Path("temp")
LOG_DIR = Path("logs")
IMAGES_DIR = Path("images")

# Create directories
OUTPUT_DIR.mkdir(exist_ok=True)
TEMP_DIR.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)
IMAGES_DIR.mkdir(exist_ok=True)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_DIR / 'worker.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Environment variables
BUNNY_API_KEY = os.getenv("BUNNY_API_KEY", "")
BUNNY_ZONE = os.getenv("BUNNY_ZONE", "")
BUNNY_CDN_URL = os.getenv("BUNNY_CDN_URL", "")
API_KEY = os.getenv("WORKER_API_KEY", "")  # Optional: for security

# FastAPI app
app = FastAPI(
    title="3D Generation Worker - Enhanced",
    description="GPU-powered 3D model generation service with quality enhancements",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your Railway domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Job tracking
jobs = {}

# Models
class GenerationRequest(BaseModel):
    prompt: str
    method: str = "triposr"
    optimize: bool = True
    texture_resolution: int = 2048
    mc_resolution: int = 384
    
class JobResponse(BaseModel):
    job_id: str
    status: str
    created_at: str
    model_url: Optional[str] = None
    error: Optional[str] = None
    generation_time: Optional[float] = None
    progress: int = 0
    message: str = ""

# Helper functions
def get_gpu_info():
    """Get GPU status"""
    try:
        gpus = GPUtil.getGPUs()
        if gpus:
            gpu = gpus[0]
            return {
                "name": gpu.name,
                "memory_used": f"{gpu.memoryUsed}MB",
                "memory_total": f"{gpu.memoryTotal}MB",
                "memory_percent": f"{gpu.memoryUtil * 100:.1f}%",
                "gpu_load": f"{gpu.load * 100:.1f}%",
                "temperature": f"{gpu.temperature}°C"
            }
    except:
        pass
    return {"error": "GPU info unavailable"}

def get_system_info():
    """Get system resource usage"""
    return {
        "cpu_percent": psutil.cpu_percent(interval=1),
        "ram_percent": psutil.virtual_memory().percent,
        "ram_available": f"{psutil.virtual_memory().available / (1024**3):.1f}GB",
        "disk_percent": psutil.disk_usage('/').percent
    }

def upload_to_bunny(file_path: Path, filename: str) -> str:
    """Upload generated model to Bunny CDN"""
    if not BUNNY_API_KEY or not BUNNY_ZONE:
        # Return local URL if Bunny CDN not configured
        logger.warning("Bunny CDN not configured, returning local URL")
        job_id = filename.replace('.glb', '')
        return f"/outputs/{job_id}/model.glb"
    
    try:
        with open(file_path, "rb") as f:
            response = requests.put(
                f"https://storage.bunnycdn.com/{BUNNY_ZONE}/{filename}",
                headers={"AccessKey": BUNNY_API_KEY},
                data=f,
                timeout=60
            )
        
        if response.status_code == 201:
            cdn_url = f"{BUNNY_CDN_URL}/{filename}"
            logger.info(f"Uploaded to Bunny CDN: {cdn_url}")
            return cdn_url
        else:
            logger.error(f"Bunny upload failed: {response.status_code} - {response.text}")
            raise Exception(f"Bunny upload failed: {response.text}")
    
    except Exception as e:
        logger.error(f"Error uploading to Bunny: {e}")
        raise

def run_generation(job_id: str, image_path: Optional[Path], prompt: Optional[str], 
                   method: str, optimize: bool, texture_resolution: int = 2048,
                   mc_resolution: int = 384):
    """
    Enhanced background task to generate high-quality 3D models
    """
    # Create job-specific output directory
    job_output_dir = OUTPUT_DIR / job_id
    job_output_dir.mkdir(exist_ok=True)
    
    output_path = job_output_dir / "model.glb"
    start_time = datetime.now()
    
    try:
        logger.info(f"🎨 Starting generation for job {job_id}")
        logger.info(f"Settings: MC={mc_resolution}, Texture={texture_resolution}")
        
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["message"] = "Preparing generation..."
        jobs[job_id]["progress"] = 10
        
        # Build command with enhanced settings
        if image_path:
            cmd = [
                sys.executable, "TripoSR/run.py",
                "--device", "cuda",
                "--mc-resolution", str(mc_resolution),
                "--model-save-format", "obj",
                "--bake-texture",
                "--texture-resolution", str(texture_resolution),
                "--output-dir", str(job_output_dir),
                str(image_path)
            ]
            logger.info(f"Generating from image: {image_path}")
        else:
            cmd = [
                sys.executable, "simple_3d_pipeline.py",
                prompt,
                str(output_path),
                "--method", method,
                "--texture-resolution", str(texture_resolution),
                "--mc-resolution", str(mc_resolution),
            ]
            logger.info(f"Generating from prompt: '{prompt}'")
            
            # Only add optimize flag for non-TripoSR methods
            if optimize:
                cmd.append("--optimize")
        
        logger.info(f"Running: {' '.join(cmd)}")
        
        # Update progress
        jobs[job_id]["message"] = "Generating 3D model with TripoSR..."
        jobs[job_id]["progress"] = 30
        
        # Run generation with extended timeout
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=600,  # 10 minutes
            cwd=Path.cwd()
        )
        
        if result.returncode != 0:
            error_msg = f"Generation failed: {result.stderr}"
            logger.error(error_msg)
            raise Exception(error_msg)
        
        logger.info(f"✅ Model generated")
        
        # TripoSR creates a subdirectory "0" for the first image
        triposr_subdir = job_output_dir / "0"
        obj_path = job_output_dir / "mesh.obj"
        
        # Check for files in the "0" subdirectory first
        if triposr_subdir.exists():
            logger.info(f"Found TripoSR subdirectory: {triposr_subdir}")
            obj_path = triposr_subdir / "mesh.obj"
        
        logger.info(f"Looking for output files in: {job_output_dir}")
        logger.info(f"Checking for mesh.obj: {obj_path.exists()}")
        logger.info(f"Checking for model.glb: {output_path.exists()}")
        
        if obj_path.exists() and not output_path.exists():
            # Convert OBJ to GLB with textures
            logger.info("Converting OBJ to GLB with textures...")
            jobs[job_id]["message"] = "Converting to GLB format..."
            jobs[job_id]["progress"] = 70
            
            try:
                import trimesh
                import numpy as np
                from PIL import Image as PILImage
                
                # Load the mesh (this reads geometry and material info)
                scene_or_mesh = trimesh.load(str(obj_path), process=True)
                
                # Handle both Scene and Mesh objects
                if isinstance(scene_or_mesh, trimesh.Scene):
                    mesh = scene_or_mesh.dump(concatenate=True)
                else:
                    mesh = scene_or_mesh
                
                # Look for texture.png in the same directory as the OBJ
                texture_path = obj_path.parent / "texture.png"
                
                if texture_path.exists():
                    logger.info(f"Found texture file: {texture_path}")
                    
                    # Load texture image
                    texture_image = PILImage.open(str(texture_path))
                    
                    # Create material with texture
                    material = trimesh.visual.material.PBRMaterial(
                        baseColorTexture=texture_image,
                        metallicFactor=0.0,
                        roughnessFactor=0.8
                    )
                    
                    # Apply material to mesh
                    mesh.visual = trimesh.visual.TextureVisuals(
                        uv=mesh.visual.uv if hasattr(mesh.visual, 'uv') else None,
                        image=texture_image,
                        material=material
                    )
                    
                    logger.info("Texture embedded into mesh")
                else:
                    logger.warning(f"Texture file not found at: {texture_path}")
                
                # Export to GLB with textures
                mesh.export(str(output_path), file_type='glb', include_normals=True)
                logger.info(f"GLB conversion successful with textures: {output_path}")
                
            except Exception as e:
                logger.error(f"GLB conversion with textures failed: {e}")
                logger.exception("Full traceback:")
                
                # Try basic conversion without textures as fallback
                try:
                    mesh = trimesh.load(str(obj_path), process=False)
                    mesh.export(str(output_path), file_type='glb')
                    logger.warning(f"GLB created without textures (fallback)")
                except:
                    # Use OBJ as final fallback
                    output_path = obj_path
                    logger.info(f"Using OBJ as output: {output_path}")
        
        # Verify output exists
        if not output_path.exists():
            # List what files were actually created
            created_files = list(job_output_dir.glob('**/*'))
            logger.error(f"Output file not found. Files in directory: {created_files}")
            raise Exception(f"Output file was not created. Found: {[str(f) for f in created_files]}")
        
        file_size = output_path.stat().st_size / (1024 * 1024)
        logger.info(f"Model size: {file_size:.2f}MB")
        
        jobs[job_id]["message"] = "Finalizing..."
        jobs[job_id]["progress"] = 90
        
        # Model URL for Railway to proxy
        model_url = f"/outputs/{job_id}/model.glb"
        
        # Calculate generation time
        generation_time = (datetime.now() - start_time).total_seconds()
        
        # Update job status
        jobs[job_id]["status"] = "complete"
        jobs[job_id]["model_url"] = model_url
        jobs[job_id]["generation_time"] = generation_time
        jobs[job_id]["file_size_mb"] = file_size
        jobs[job_id]["progress"] = 100
        jobs[job_id]["message"] = "Model generated successfully!"
        
        logger.info(f"✅ Job {job_id} completed in {generation_time:.1f}s")
        
        # Clean up temp image
        if image_path and image_path.exists():
            image_path.unlink()
        
    except subprocess.TimeoutExpired:
        error_msg = "Generation timed out after 10 minutes"
        logger.error(f"Job {job_id}: {error_msg}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = error_msg
        jobs[job_id]["progress"] = 0
        jobs[job_id]["message"] = error_msg
        
    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Job {job_id} failed: {error_msg}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = error_msg
        jobs[job_id]["progress"] = 0
        jobs[job_id]["message"] = "Generation failed"
        
        # Clean up failed outputs
        if output_path.exists():
            output_path.unlink()
        
        if image_path and image_path.exists():
            image_path.unlink()

# API Endpoints
@app.get("/")
async def root():
    """Health check and worker info"""
    processing_jobs = len([j for j in jobs.values() if j["status"] == "processing"])
    completed_jobs = len([j for j in jobs.values() if j["status"] == "complete"])
    failed_jobs = len([j for j in jobs.values() if j["status"] == "failed"])
    
    return {
        "service": "3D Generation Worker - Enhanced",
        "status": "online",
        "version": "2.0.0",
        "gpu": get_gpu_info(),
        "system": get_system_info(),
        "stats": {
            "total_jobs": len(jobs),
            "processing": processing_jobs,
            "completed": completed_jobs,
            "failed": failed_jobs
        }
    }

@app.get("/health")
async def health():
    """Detailed health check"""
    gpu_info = get_gpu_info()
    system_info = get_system_info()
    
    # Check if GPU is available
    import torch
    cuda_available = torch.cuda.is_available()
    
    # Check if TripoSR is loaded
    triposr_available = Path("TripoSR/run.py").exists()
    
    # Check if GLB conversion is available
    try:
        import trimesh
        glb_conversion_available = True
    except:
        glb_conversion_available = False
    
    health_status = {
        "status": "healthy" if cuda_available else "degraded",
        "cuda_available": cuda_available,
        "triposr_available": triposr_available,
        "glb_conversion_available": glb_conversion_available,
        "gpu": gpu_info,
        "system": system_info,
        "timestamp": datetime.now().isoformat()
    }
    
    return health_status

@app.post("/generate-from-image")
async def generate_from_image(
    background_tasks: BackgroundTasks,
    image: UploadFile = File(...),
    texture_resolution: int = Form(2048),
    mc_resolution: int = Form(384),
    method: str = Form("triposr"),
    optimize: bool = Form(True),
    x_api_key: Optional[str] = Header(None)
):
    """
    Generate high-quality 3D model from uploaded image
    
    Parameters:
    - image: Image file (PNG, JPG, etc.)
    - texture_resolution: Texture quality (512, 1024, 2048, 4096)
    - mc_resolution: Mesh detail (128, 256, 384, 512)
    - method: Generation method (triposr, instant-mesh, shap-e)
    - optimize: Apply mesh optimization
    """
    
    # Optional API key authentication
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Validate method
    valid_methods = ["triposr", "instant-mesh", "shap-e"]
    if method not in valid_methods:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid method. Choose from: {', '.join(valid_methods)}"
        )
    
    # Save uploaded image
    try:
        # Validate image
        image_data = await image.read()
        img = Image.open(io.BytesIO(image_data))
        img.verify()
        
        # Re-open for saving (verify() closes it)
        img = Image.open(io.BytesIO(image_data))
        
        # Save image
        job_id = str(uuid.uuid4())
        image_filename = f"{job_id}.png"
        image_path = TEMP_DIR / image_filename
        
        # Convert to RGB if needed and save as PNG
        if img.mode != 'RGB':
            img = img.convert('RGB')
        img.save(image_path, 'PNG')
        
        logger.info(f"Image saved: {image_path}")
        
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image file: {str(e)}"
        )
    
    # Create job
    jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "method": method,
        "texture_resolution": texture_resolution,
        "mc_resolution": mc_resolution,
        "created_at": datetime.now().isoformat(),
        "model_url": None,
        "error": None,
        "generation_time": None,
        "progress": 0,
        "message": "Job queued for generation"
    }
    
    logger.info(f"📝 Created job {job_id}")
    logger.info(f"⚙️ Settings: MC={mc_resolution}, Texture={texture_resolution}")
    
    # Start generation in background
    background_tasks.add_task(
        run_generation,
        job_id,
        image_path,
        None,
        method,
        optimize,
        texture_resolution,
        mc_resolution
    )
    
    return {
        "job_id": job_id,
        "status": "queued",
        "message": "Generation started"
    }

@app.post("/generate", response_model=dict)
async def generate_from_prompt(
    background_tasks: BackgroundTasks,
    prompt: str = Form(...),
    method: str = Form("triposr"),
    optimize: bool = Form(True),
    texture_resolution: int = Form(2048),
    mc_resolution: int = Form(384),
    x_api_key: Optional[str] = Header(None)
):
    """
    Generate 3D model from text prompt
    """
    
    # Optional API key authentication
    if API_KEY and x_api_key != API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    
    # Validate method
    valid_methods = ["triposr", "instant-mesh", "shap-e"]
    if method not in valid_methods:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid method. Choose from: {', '.join(valid_methods)}"
        )
    
    # Create job
    job_id = str(uuid.uuid4())
    
    jobs[job_id] = {
        "job_id": job_id,
        "status": "queued",
        "prompt": prompt,
        "method": method,
        "texture_resolution": texture_resolution,
        "mc_resolution": mc_resolution,
        "created_at": datetime.now().isoformat(),
        "model_url": None,
        "error": None,
        "generation_time": None,
        "progress": 0,
        "message": "Job queued"
    }
    
    logger.info(f"Created job {job_id} for prompt: '{prompt}'")
    
    # Start generation in background
    background_tasks.add_task(
        run_generation,
        job_id,
        None,
        prompt,
        method,
        optimize,
        texture_resolution,
        mc_resolution
    )
    
    return {
        "job_id": job_id,
        "status": "queued",
        "message": f"Generation started with method: {method}"
    }

@app.get("/status/{job_id}", response_model=JobResponse)
async def get_status(job_id: str):
    """Check generation status with progress tracking"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return JobResponse(**jobs[job_id])

@app.get("/jobs")
async def list_jobs(limit: int = 50):
    """List recent jobs"""
    recent_jobs = sorted(
        jobs.values(),
        key=lambda x: x["created_at"],
        reverse=True
    )[:limit]
    
    return {"jobs": recent_jobs, "total": len(jobs)}

@app.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and its files"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Delete output directory
    job_dir = OUTPUT_DIR / job_id
    if job_dir.exists():
        import shutil
        shutil.rmtree(job_dir)
    
    # Remove from jobs dict
    del jobs[job_id]
    
    return {"message": "Job deleted", "job_id": job_id}

@app.get("/outputs/{job_id}/model.glb")
async def get_model_glb(job_id: str):
    """Serve GLB model file"""
    file_path = OUTPUT_DIR / job_id / "model.glb"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="GLB file not found")
    
    return FileResponse(
        file_path,
        media_type="model/gltf-binary",
        filename=f"{job_id}.glb"
    )

@app.get("/outputs/{job_id}/{filename}")
async def get_output(job_id: str, filename: str):
    """Serve any output file from job directory"""
    file_path = OUTPUT_DIR / job_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Determine media type
    if filename.endswith('.glb'):
        media_type = "model/gltf-binary"
    elif filename.endswith('.obj'):
        media_type = "model/obj"
    elif filename.endswith('.mtl'):
        media_type = "text/plain"
    elif filename.endswith('.png'):
        media_type = "image/png"
    else:
        media_type = "application/octet-stream"
    
    return FileResponse(
        file_path,
        media_type=media_type,
        filename=filename
    )

@app.get("/download/{job_id}")
async def download_model(job_id: str):
    """Download complete model package as ZIP (OBJ + MTL + textures)"""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job_dir = OUTPUT_DIR / job_id
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Model files not found")
    
    # Create ZIP file in temp directory
    zip_path = tempfile.mktemp(suffix='.zip', dir=TEMP_DIR)
    
    try:
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file in job_dir.glob('*'):
                if file.is_file():
                    zipf.write(file, file.name)
        
        logger.info(f"Created ZIP for job {job_id}: {zip_path}")
        
        return FileResponse(
            zip_path,
            media_type="application/zip",
            filename=f"model_{job_id}.zip"
        )
    except Exception as e:
        logger.error(f"Failed to create ZIP: {e}")
        if Path(zip_path).exists():
            Path(zip_path).unlink()
        raise HTTPException(status_code=500, detail=f"Failed to create ZIP: {str(e)}")

# Serve static files from outputs directory (for local testing)
try:
    app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")
except:
    logger.warning("Could not mount /outputs directory")

if __name__ == "__main__":
    import uvicorn
    
    logger.info("=" * 60)
    logger.info("Starting Enhanced 3D Generation Worker v2.0")
    logger.info("=" * 60)
    logger.info(f"Output directory: {OUTPUT_DIR.absolute()}")
    logger.info(f"Images directory: {IMAGES_DIR.absolute()}")
    logger.info(f"Bunny CDN: {'Enabled' if BUNNY_API_KEY else 'Disabled (using local storage)'}")
    
    # Check GPU availability
    import torch
    if torch.cuda.is_available():
        logger.info(f"✅ GPU: {torch.cuda.get_device_name(0)}")
        logger.info(f"✅ CUDA Version: {torch.version.cuda}")
        logger.info(f"✅ GPU Memory: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f}GB")
    else:
        logger.warning("⚠️  GPU not available! Generations will be very slow.")
    
    # Check TripoSR
    if Path("TripoSR/run.py").exists():
        logger.info("✅ TripoSR found")
    else:
        logger.warning("⚠️  TripoSR run.py not found")
    
    # Check trimesh for GLB conversion
    try:
        import trimesh
        logger.info("✅ Trimesh available for GLB conversion")
    except:
        logger.warning("⚠️  Trimesh not available - GLB conversion may fail")
    
    logger.info("=" * 60)
    logger.info("🚀 Worker ready on http://0.0.0.0:8001")
    logger.info("=" * 60)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )
