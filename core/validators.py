"""
Validators Module: Reusable Input Validation and Sanitization
Handles:
- Null, undefined, empty string checks
- Out-of-bounds numbers (thresholds, dimensions, confidence limits)
- Structural type mismatches
- Base URL stripping and normalization
- Image file payload format validation
"""

import os
import re
from typing import Any, Tuple, Optional
import numpy as np


def sanitize_base_url(url: Optional[str]) -> str:
    """
    Sanitizes API Base URL by trimming whitespace and trailing slashes.
    Prevents silent URL breakage from minor environment typos.
    """
    if not url or not isinstance(url, str):
        return "http://127.0.0.1:8000"
    cleaned = url.strip()
    # Strip any trailing slashes
    while cleaned.endswith("/"):
        cleaned = cleaned[:-1]
    return cleaned


def validate_threshold(val: Any, default: float = 0.60, min_val: float = 0.0, max_val: float = 1.0) -> float:
    """
    Validates and bounds similarity threshold values.
    """
    if val is None:
        return default
    try:
        f_val = float(val)
        if np.isnan(f_val) or np.isinf(f_val):
            return default
        return max(min_val, min(max_val, f_val))
    except (ValueError, TypeError):
        return default


def validate_model_selection(
    detector: Optional[str],
    recognizer: Optional[str]
) -> Tuple[str, str]:
    """
    Validates detector and recognizer names against allowed open-source models.
    """
    allowed_detectors = {"blazeface", "yunet", "haar"}
    allowed_recognizers = {"facenet", "sface"}

    det = "blazeface"
    if detector and isinstance(detector, str):
        cleaned_det = detector.strip().lower()
        if cleaned_det in allowed_detectors:
            det = cleaned_det

    rec = "facenet"
    if recognizer and isinstance(recognizer, str):
        cleaned_rec = recognizer.strip().lower()
        if cleaned_rec in allowed_recognizers:
            rec = cleaned_rec

    return det, rec


def validate_image_bytes(data: bytes, max_size_mb: int = 15) -> Tuple[bool, Optional[str]]:
    """
    Validates uploaded raw image byte stream for length, nulls, and size bounds.
    """
    if not data or len(data) == 0:
        return False, "Image payload is empty or missing."

    max_bytes = max_size_mb * 1024 * 1024
    if len(data) > max_bytes:
        return False, f"Image file size ({len(data) / (1024*1024):.2f}MB) exceeds limit of {max_size_mb}MB."

    return True, None


def validate_image_matrix(img: Optional[np.ndarray]) -> Tuple[bool, Optional[str]]:
    """
    Validates that decoded image matrix is non-empty, has proper dimensions and channels.
    """
    if img is None:
        return False, "Failed to decode image. Unsupported or corrupted file format."

    if not isinstance(img, np.ndarray):
        return False, "Image structure mismatch: Expected numpy ndarray."

    if img.ndim != 3 or img.shape[2] != 3:
        return False, f"Invalid image shape {img.shape}. Expected 3-channel BGR color image."

    h, w = img.shape[:2]
    if h < 20 or w < 20:
        return False, f"Image dimensions ({w}x{h}) are too small for facial verification (min 20x20)."

    return True, None
