"""
FastAPI Server for CPU Facial Verification Microservice
Integrates MediaPipe BlazeFace, OpenCV YuNet, FaceNet Inception-ResNet-v1, and SFace.
"""

import os
import sys
import time
import base64
from typing import Optional
from pathlib import Path

from dotenv import load_dotenv
import cv2
import numpy as np

from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Request
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from core.face_engine import FaceEngine
from core.validators import (
    sanitize_base_url,
    validate_threshold,
    validate_model_selection,
    validate_image_bytes,
    validate_image_matrix
)

# Load environment variables
load_dotenv()

# Sanitize Base URL with trimming and trailing-slash stripping as per rules
RAW_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000")
API_BASE_URL = sanitize_base_url(RAW_BASE_URL)
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8000"))

app = FastAPI(
    title="Biometric Face Verification API",
    description="CPU-Optimized 1:1 Facial Verification Microservice with BlazeFace & FaceNet",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Face Engine instance
engine = FaceEngine(models_dir="models")

# Mount Static directories
STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(exist_ok=True)
CSS_DIR = STATIC_DIR / "css"
JS_DIR = STATIC_DIR / "js"
if CSS_DIR.exists():
    app.mount("/css", StaticFiles(directory=str(CSS_DIR)), name="css")
if JS_DIR.exists():
    app.mount("/js", StaticFiles(directory=str(JS_DIR)), name="js")
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


# -----------------------------------------------------------------
# Global Exception Handlers
# -----------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global catch-all exception handler to guarantee consistent JSON errors."""
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error_type": type(exc).__name__,
            "message": str(exc),
            "timestamp": time.time()
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handles schema validation errors."""
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "error_type": "ValidationError",
            "message": "Invalid request payload parameters.",
            "details": exc.errors(),
            "timestamp": time.time()
        }
    )


# -----------------------------------------------------------------
# API Endpoints
# -----------------------------------------------------------------
@app.get("/")
async def serve_index():
    """Serves the main application page."""
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return JSONResponse(
        content={
            "status": "online",
            "message": "Biometric Verification Service Running",
            "api_base_url": API_BASE_URL
        }
    )


@app.get("/api/config")
async def get_config():
    """Returns application configuration and normalized base URL."""
    return {
        "api_base_url": API_BASE_URL,
        "raw_base_url": RAW_BASE_URL,
        "environment": os.getenv("ENVIRONMENT", "development"),
        "models_status": {
            "blazeface": engine.blazeface_ready,
            "yunet": engine.yunet_ready,
            "facenet": engine.facenet_ready,
            "sface": engine.sface_ready
        }
    }


@app.get("/api/models")
async def get_models():
    """Returns available detection and embedding models with CPU benchmarks."""
    return engine.get_available_models()


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "cpu_execution": True,
        "threads": 4,
        "engine_ready": (engine.facenet_ready or engine.sface_ready),
        "api_base_url": API_BASE_URL
    }


@app.get("/api/samples")
async def get_sample_pairs():
    """
    Returns curated demo image pairs for 1-click testing.
    Includes Same-Person Match and Different-Persons Mismatch pairs.
    """
    samples_dir = Path(__file__).parent / "samples"
    pairs = []

    def img_to_base64(path: Path) -> str:
        if not path.exists():
            return ""
        data = path.read_bytes()
        return "data:image/jpeg;base64," + base64.b64encode(data).decode("utf-8")

    # Match pair 1
    p1 = samples_dir / "sample_match_1.jpg"
    p2 = samples_dir / "sample_match_2.jpg"
    if p1.exists() and p2.exists():
        pairs.append({
            "id": "pair_match_1",
            "title": "Match: Same Subject (Angle & Expression Variation)",
            "expected": "MATCH",
            "description": "Standard KYC verification case: ID card photo vs. user selfie.",
            "img1": img_to_base64(p1),
            "img2": img_to_base64(p2)
        })

    # Mismatch pair
    diff = samples_dir / "sample_diff_1.jpg"
    if p1.exists() and diff.exists():
        pairs.append({
            "id": "pair_mismatch",
            "title": "Mismatch: Two Different Individuals",
            "expected": "NO_MATCH",
            "description": "Fraud prevention case: Imposter or differing applicant photos.",
            "img1": img_to_base64(p1),
            "img2": img_to_base64(diff)
        })

    # Match pair 2
    p8 = samples_dir / "sample_pair2_1.jpg"
    p9 = samples_dir / "sample_pair2_2.jpg"
    if p8.exists() and p9.exists():
        pairs.append({
            "id": "pair_match_2",
            "title": "Match: Differing Lighting & Pose",
            "expected": "MATCH",
            "description": "Cross-pose KYC verification benchmarking test.",
            "img1": img_to_base64(p8),
            "img2": img_to_base64(p9)
        })

    return {"samples": pairs}


@app.post("/api/verify")
async def verify_faces(
    image1: UploadFile = File(...),
    image2: UploadFile = File(...),
    detector: Optional[str] = Form("blazeface"),
    recognizer: Optional[str] = Form("facenet"),
    threshold: Optional[float] = Form(None)
):
    """
    1:1 Face Verification Endpoint
    Takes two images, runs CPU detection and feature extraction, and returns similarity metrics.
    """
    # Validate model selection
    valid_detector, valid_recognizer = validate_model_selection(detector, recognizer)

    # Validate threshold
    calibrated_default = 0.363 if valid_recognizer == "sface" else 0.60
    valid_threshold = validate_threshold(threshold, default=calibrated_default, min_val=0.0, max_val=1.0)

    # Read bytes for Image 1
    bytes1 = await image1.read()
    ok1, err1 = validate_image_bytes(bytes1)
    if not ok1:
        raise HTTPException(status_code=400, detail=f"Image 1 error: {err1}")

    # Read bytes for Image 2
    bytes2 = await image2.read()
    ok2, err2 = validate_image_bytes(bytes2)
    if not ok2:
        raise HTTPException(status_code=400, detail=f"Image 2 error: {err2}")

    # Decode Image 1 with OpenCV
    nparr1 = np.frombuffer(bytes1, np.uint8)
    img1_bgr = cv2.imdecode(nparr1, cv2.IMREAD_COLOR)
    mat_ok1, mat_err1 = validate_image_matrix(img1_bgr)
    if not mat_ok1:
        raise HTTPException(status_code=400, detail=f"Image 1 error: {mat_err1}")

    # Decode Image 2 with OpenCV
    nparr2 = np.frombuffer(bytes2, np.uint8)
    img2_bgr = cv2.imdecode(nparr2, cv2.IMREAD_COLOR)
    mat_ok2, mat_err2 = validate_image_matrix(img2_bgr)
    if not mat_ok2:
        raise HTTPException(status_code=400, detail=f"Image 2 error: {mat_err2}")

    # Run verification pipeline
    try:
        result = engine.verify(
            img1_bgr=img1_bgr,
            img2_bgr=img2_bgr,
            detector_name=valid_detector,
            recognizer_name=valid_recognizer,
            threshold=valid_threshold
        )
        return {
            "success": True,
            **result
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Inference execution failed on CPU: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=HOST, port=PORT, reload=True)
