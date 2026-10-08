"""
Face Engine: CPU-Optimized 1:1 Facial Verification Pipeline
Implements:
- Detectors: MediaPipe BlazeFace (Google, ~8ms), OpenCV YuNet (libfacedetection, ~12ms), OpenCV Haar
- Feature Extractors: FaceNet (Inception-ResNet-v1, 512-d ONNX), OpenCV SFace (128-d)
- Metrics: Cosine Similarity, Euclidean L2 Distance, Millisecond Latency Benchmarking
"""

import os
import time
import base64
from typing import Dict, Any, Tuple, Optional, List
import numpy as np
import cv2
import onnxruntime as ort

import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision


class FaceEngine:
    """Manages CPU face detection and feature extraction models."""

    def __init__(self, models_dir: str = "models"):
        self.models_dir = models_dir
        self.blazeface_path = os.path.join(models_dir, "blaze_face_short_range.tflite")
        self.yunet_path = os.path.join(models_dir, "face_detection_yunet_2023mar.onnx")
        self.sface_path = os.path.join(models_dir, "face_recognition_sface_2021dec.onnx")
        self.facenet_path = os.path.join(models_dir, "facenet.onnx")

        # Status tracking
        self.blazeface_ready = False
        self.yunet_ready = False
        self.haar_ready = False
        self.facenet_ready = False
        self.sface_ready = False

        self._init_models()

    def _init_models(self):
        """Initializes all models on CPU."""
        # 1. MediaPipe BlazeFace
        try:
            if os.path.exists(self.blazeface_path):
                base_options = mp_python.BaseOptions(model_asset_path=self.blazeface_path)
                options = mp_vision.FaceDetectorOptions(
                    base_options=base_options,
                    min_detection_confidence=0.45
                )
                self.blazeface_detector = mp_vision.FaceDetector.create_from_options(options)
                self.blazeface_ready = True
            else:
                self.blazeface_detector = None
        except Exception as e:
            print(f"[FaceEngine] BlazeFace initialization error: {e}")
            self.blazeface_detector = None

        # 2. OpenCV YuNet
        try:
            if os.path.exists(self.yunet_path):
                self.yunet_detector = cv2.FaceDetectorYN.create(
                    self.yunet_path,
                    "",
                    (320, 320),
                    score_threshold=0.5,
                    nms_threshold=0.3,
                    top_k=5000
                )
                self.yunet_ready = True
            else:
                self.yunet_detector = None
        except Exception as e:
            print(f"[FaceEngine] YuNet initialization error: {e}")
            self.yunet_detector = None

        # 3. OpenCV Haar Cascade (fallback)
        try:
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            if os.path.exists(cascade_path):
                self.haar_detector = cv2.CascadeClassifier(cascade_path)
                self.haar_ready = True
            else:
                self.haar_detector = None
        except Exception as e:
            self.haar_detector = None

        # 4. FaceNet (Inception-ResNet-v1, 512-d)
        try:
            if os.path.exists(self.facenet_path):
                opts = ort.SessionOptions()
                opts.intra_op_num_threads = 4
                opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
                opts.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
                self.facenet_session = ort.InferenceSession(
                    self.facenet_path,
                    sess_options=opts,
                    providers=["CPUExecutionProvider"]
                )
                self.facenet_input_name = self.facenet_session.get_inputs()[0].name
                self.facenet_output_name = self.facenet_session.get_outputs()[0].name
                self.facenet_ready = True
            else:
                self.facenet_session = None
        except Exception as e:
            print(f"[FaceEngine] FaceNet ONNX initialization error: {e}")
            self.facenet_session = None

        # 5. OpenCV SFace (128-d)
        try:
            if os.path.exists(self.sface_path):
                self.sface_recognizer = cv2.FaceRecognizerSF.create(self.sface_path, "")
                self.sface_ready = True
            else:
                self.sface_recognizer = None
        except Exception as e:
            print(f"[FaceEngine] SFace initialization error: {e}")
            self.sface_recognizer = None

    def get_available_models(self) -> Dict[str, Any]:
        """Returns catalog of models and operational readiness."""
        return {
            "detectors": [
                {
                    "id": "blazeface",
                    "name": "MediaPipe BlazeFace",
                    "creator": "Google",
                    "architecture": "Single-Shot Lightweight CNN with FPN",
                    "license": "Apache 2.0 (Commercial Friendly)",
                    "model_size": "230 KB",
                    "typical_cpu_latency_ms": "8 - 15 ms",
                    "ready": self.blazeface_ready,
                    "description": "Ultra-lightweight edge detector optimized for varied mobile lighting and angles."
                },
                {
                    "id": "yunet",
                    "name": "OpenCV YuNet",
                    "creator": "OpenCV / libfacedetection",
                    "architecture": "Custom Anchor-free Face Detector",
                    "license": "MIT (Commercial Friendly)",
                    "model_size": "232 KB",
                    "typical_cpu_latency_ms": "10 - 20 ms",
                    "ready": self.yunet_ready,
                    "description": "High-efficiency detector providing 5 key facial landmarks directly in OpenCV."
                },
                {
                    "id": "haar",
                    "name": "OpenCV Haar Cascade",
                    "creator": "Viola-Jones / OpenCV",
                    "architecture": "Cascaded AdaBoost Classifiers",
                    "license": "Apache 2.0",
                    "model_size": "900 KB",
                    "typical_cpu_latency_ms": "25 - 45 ms",
                    "ready": self.haar_ready,
                    "description": "Traditional computer vision baseline."
                }
            ],
            "recognizers": [
                {
                    "id": "facenet",
                    "name": "FaceNet (Inception-ResNet-v1)",
                    "creator": "Google / VGGFace2",
                    "architecture": "Inception-ResNet-v1 Deep ConvNet",
                    "embedding_dimension": 512,
                    "license": "MIT (Commercially Permissive)",
                    "model_size": "90 MB",
                    "typical_cpu_latency_ms": "30 - 65 ms",
                    "recommended_threshold": 0.60,
                    "ready": self.facenet_ready,
                    "description": "State-of-the-art 512-dimensional vector embedding model for identity verification."
                },
                {
                    "id": "sface",
                    "name": "OpenCV SFace",
                    "creator": "Shenzhen Institute / OpenCV",
                    "architecture": "ResNet-like Hypersphere Loss Network",
                    "embedding_dimension": 128,
                    "license": "Apache 2.0 (Commercially Permissive)",
                    "model_size": "37 MB",
                    "typical_cpu_latency_ms": "20 - 45 ms",
                    "recommended_threshold": 0.363,
                    "ready": self.sface_ready,
                    "description": "Compact 128-dimensional embedding model running natively inside OpenCV DNN."
                }
            ]
        }

    # -------------------------------------------------------------
    # Face Detection
    # -------------------------------------------------------------
    def detect_face(self, img_bgr: np.ndarray, detector_name: str = "blazeface") -> Dict[str, Any]:
        """
        Detect face bounding box and keypoints.
        Includes automatic scale optimization for high-resolution input images.
        """
        start_time = time.perf_counter()
        orig_h, orig_w = img_bgr.shape[:2]
        detector_name = (detector_name or "blazeface").lower().strip()

        # Scale down for fast detection if image is larger than 720px
        max_dim = 720
        if max(orig_h, orig_w) > max_dim:
            det_scale = max_dim / float(max(orig_h, orig_w))
            dw, dh = int(orig_w * det_scale), int(orig_h * det_scale)
            scaled_bgr = cv2.resize(img_bgr, (dw, dh), interpolation=cv2.INTER_AREA)
        else:
            det_scale = 1.0
            scaled_bgr = img_bgr
            dw, dh = orig_w, orig_h

        box = None
        landmarks = []
        confidence = 0.0

        if detector_name == "blazeface" and self.blazeface_ready:
            scaled_rgb = cv2.cvtColor(scaled_bgr, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=scaled_rgb)
            result = self.blazeface_detector.detect(mp_image)

            if result.detections:
                best_det = max(result.detections, key=lambda d: d.categories[0].score if d.categories else 0.0)
                confidence = float(best_det.categories[0].score) if best_det.categories else 0.8
                bb = best_det.bounding_box

                inv_scale = 1.0 / det_scale
                box = [
                    int(bb.origin_x * inv_scale),
                    int(bb.origin_y * inv_scale),
                    int(bb.width * inv_scale),
                    int(bb.height * inv_scale)
                ]

                if best_det.keypoints:
                    for kp in best_det.keypoints:
                        landmarks.append((
                            int(kp.x * orig_w),
                            int(kp.y * orig_h)
                        ))

        elif detector_name == "yunet" and self.yunet_ready:
            self.yunet_detector.setInputSize((dw, dh))
            _, faces = self.yunet_detector.detect(scaled_bgr)

            if faces is not None and len(faces) > 0:
                best_face = faces[0]
                inv_scale = 1.0 / det_scale
                box = [
                    int(best_face[0] * inv_scale),
                    int(best_face[1] * inv_scale),
                    int(best_face[2] * inv_scale),
                    int(best_face[3] * inv_scale)
                ]
                confidence = float(best_face[-1])
                for i in range(5):
                    landmarks.append((
                        int(best_face[4 + i * 2] * inv_scale),
                        int(best_face[5 + i * 2] * inv_scale)
                    ))

        elif detector_name == "haar" and self.haar_ready:
            gray = cv2.cvtColor(scaled_bgr, cv2.COLOR_BGR2GRAY)
            faces = self.haar_detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(30, 30))
            if len(faces) > 0:
                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                fx, fy, fw, fh = faces[0]
                inv_scale = 1.0 / det_scale
                box = [
                    int(fx * inv_scale),
                    int(fy * inv_scale),
                    int(fw * inv_scale),
                    int(fh * inv_scale)
                ]
                confidence = 0.85

        latency_ms = (time.perf_counter() - start_time) * 1000.0

        annotated_bgr = img_bgr.copy()
        cropped_face = None

        if box is not None and confidence >= 0.4:
            bx, by, bw, bh = box
            bx1 = max(0, bx)
            by1 = max(0, by)
            bx2 = min(orig_w, bx + bw)
            by2 = min(orig_h, by + bh)

            # 18% margin for facial context
            margin_x = int(bw * 0.18)
            margin_y = int(bh * 0.18)
            crop_x1 = max(0, bx1 - margin_x)
            crop_y1 = max(0, by1 - margin_y)
            crop_x2 = min(orig_w, bx2 + margin_x)
            crop_y2 = min(orig_h, by2 + margin_y)

            if crop_x2 > crop_x1 and crop_y2 > crop_y1:
                cropped_face = img_bgr[crop_y1:crop_y2, crop_x1:crop_x2].copy()

            # Theme annotations (HSL Primary cyan-blue translated to BGR: (230, 150, 25))
            cv2.rectangle(annotated_bgr, (bx1, by1), (bx2, by2), (230, 150, 25), 2)

            label = f"{detector_name.upper()}: {confidence*100:.1f}%"
            # Label background pill
            t_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
            cv2.rectangle(
                annotated_bgr,
                (bx1, max(0, by1 - 22)),
                (bx1 + t_size[0] + 8, max(0, by1)),
                (20, 24, 34),
                -1
            )
            cv2.putText(
                annotated_bgr,
                label,
                (bx1 + 4, max(14, by1 - 6)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                (230, 150, 25),
                1,
                cv2.LINE_AA
            )

            # Landmarks (theme green)
            for lm in landmarks:
                cv2.circle(annotated_bgr, lm, 3, (80, 220, 100), -1, cv2.LINE_AA)
        else:
            # Fallback to whole frame
            cropped_face = img_bgr.copy()
            box = [0, 0, orig_w, orig_h]
            confidence = 0.5

        return {
            "found": (box is not None and confidence >= 0.4),
            "box": box,
            "landmarks": landmarks,
            "confidence": round(confidence, 4),
            "cropped_face": cropped_face,
            "annotated_bgr": annotated_bgr,
            "latency_ms": round(latency_ms, 2)
        }

    # -------------------------------------------------------------
    # Feature Extraction
    # -------------------------------------------------------------
    def extract_embedding(self, face_bgr: np.ndarray, recognizer_name: str = "facenet") -> Dict[str, Any]:
        """Extracts normalized feature vector from face crop."""
        start_time = time.perf_counter()
        recognizer_name = (recognizer_name or "facenet").lower().strip()

        if recognizer_name == "facenet" and self.facenet_ready:
            face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
            face_resized = cv2.resize(face_rgb, (160, 160), interpolation=cv2.INTER_AREA)
            img_tensor = face_resized.astype(np.float32) / 255.0
            img_tensor = (img_tensor - 0.5) / 0.5
            img_tensor = np.transpose(img_tensor, (2, 0, 1))
            img_tensor = np.expand_dims(img_tensor, axis=0)

            ort_inputs = {self.facenet_input_name: img_tensor}
            ort_outputs = self.facenet_session.run([self.facenet_output_name], ort_inputs)
            raw_embedding = ort_outputs[0][0].astype(np.float32)

            norm = np.linalg.norm(raw_embedding)
            embedding = (raw_embedding / norm) if norm > 1e-6 else raw_embedding
            dim = 512

        elif recognizer_name == "sface" and self.sface_ready:
            face_112 = cv2.resize(face_bgr, (112, 112), interpolation=cv2.INTER_AREA)
            feature = self.sface_recognizer.feature(face_112)
            raw_embedding = feature[0].astype(np.float32)

            norm = np.linalg.norm(raw_embedding)
            embedding = (raw_embedding / norm) if norm > 1e-6 else raw_embedding
            dim = 128

        else:
            raise ValueError(f"Feature extractor '{recognizer_name}' is not operational or loaded.")

        latency_ms = (time.perf_counter() - start_time) * 1000.0

        return {
            "embedding": embedding,
            "dimension": dim,
            "latency_ms": round(latency_ms, 2)
        }

    # -------------------------------------------------------------
    # 1:1 Verification
    # -------------------------------------------------------------
    def verify(
        self,
        img1_bgr: np.ndarray,
        img2_bgr: np.ndarray,
        detector_name: str = "blazeface",
        recognizer_name: str = "facenet",
        threshold: Optional[float] = None
    ) -> Dict[str, Any]:
        """Runs 1:1 Face Verification Pipeline on CPU."""
        pipeline_start = time.perf_counter()

        # Default calibrated thresholds
        if threshold is None or threshold <= 0.0:
            if recognizer_name.lower() == "sface":
                threshold = 0.363
            else:
                threshold = 0.60

        # Step 1: Detect Faces
        det1 = self.detect_face(img1_bgr, detector_name=detector_name)
        det2 = self.detect_face(img2_bgr, detector_name=detector_name)

        warnings = []
        if not det1["found"]:
            warnings.append("No face detected in Image 1. Verification processed on full image.")
        if not det2["found"]:
            warnings.append("No face detected in Image 2. Verification processed on full image.")

        # Step 2: Extract Embeddings
        emb1_res = self.extract_embedding(det1["cropped_face"], recognizer_name=recognizer_name)
        emb2_res = self.extract_embedding(det2["cropped_face"], recognizer_name=recognizer_name)

        e1 = emb1_res["embedding"]
        e2 = emb2_res["embedding"]

        # Step 3: Compute Similarity Metrics
        cosine_sim = float(np.dot(e1, e2))
        cosine_sim = max(-1.0, min(1.0, cosine_sim))

        euclidean_dist = float(np.linalg.norm(e1 - e2))

        is_match = bool(cosine_sim >= threshold)

        # Calibrate confidence score
        if recognizer_name.lower() == "sface":
            score_normalized = (cosine_sim - 0.1) / (0.8 - 0.1)
        else:
            score_normalized = (cosine_sim - 0.25) / (0.85 - 0.25)

        confidence_pct = max(0.0, min(100.0, score_normalized * 100.0))
        total_latency_ms = (time.perf_counter() - pipeline_start) * 1000.0

        def to_base64_jpeg(img_in: np.ndarray, max_dim: int = 500) -> str:
            if img_in is None:
                return ""
            ih, iw = img_in.shape[:2]
            if max(ih, iw) > max_dim:
                scale = max_dim / float(max(ih, iw))
                resized = cv2.resize(img_in, (int(iw * scale), int(ih * scale)), interpolation=cv2.INTER_AREA)
            else:
                resized = img_in
            _, buf = cv2.imencode(".jpg", resized, [int(cv2.IMWRITE_JPEG_QUALITY), 82])
            return "data:image/jpeg;base64," + base64.b64encode(buf).decode("utf-8")

        return {
            "is_match": is_match,
            "cosine_similarity": round(cosine_sim, 4),
            "euclidean_distance": round(euclidean_dist, 4),
            "confidence_percentage": round(confidence_pct, 1),
            "threshold": round(threshold, 4),
            "models_used": {
                "detector": detector_name,
                "recognizer": recognizer_name,
                "embedding_dimension": emb1_res["dimension"]
            },
            "latencies_ms": {
                "detection_image1": det1["latency_ms"],
                "detection_image2": det2["latency_ms"],
                "embedding_image1": emb1_res["latency_ms"],
                "embedding_image2": emb2_res["latency_ms"],
                "total_cpu_time": round(total_latency_ms, 2)
            },
            "face1_info": {
                "detected": det1["found"],
                "confidence": det1["confidence"],
                "bounding_box": det1["box"]
            },
            "face2_info": {
                "detected": det2["found"],
                "confidence": det2["confidence"],
                "bounding_box": det2["box"]
            },
            "warnings": warnings,
            "annotated_image1": to_base64_jpeg(det1["annotated_bgr"]),
            "annotated_image2": to_base64_jpeg(det2["annotated_bgr"]),
            "crop_image1": to_base64_jpeg(det1["cropped_face"], max_dim=200),
            "crop_image2": to_base64_jpeg(det2["cropped_face"], max_dim=200)
        }
