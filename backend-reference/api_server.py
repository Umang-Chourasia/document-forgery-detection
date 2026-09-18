"""
FastAPI wrapper around the existing CAT-Net v2 inference pipeline
(same model-loading and forward-pass code as tools/infer.py), exposing
it over HTTP for the frontend on the local network.

Run from the CAT-Net project root (relative paths/config depend on it):
    catnet_env\\Scripts\\activate
    uvicorn api_server:app --host 0.0.0.0 --port 8000
"""
import argparse
import base64
import io
import uuid
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
import torch
import torch.backends.cudnn as cudnn
import torch.nn as nn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from torch.nn import functional as F

from lib import models
from lib.config import config, update_config
from lib.core.criterion import CrossEntropy
from lib.utils.utils import FullModel
from Splicing.data.data_core import SplicingDataset as splicing_dataset

sns.set_theme()

PROJECT_ROOT = Path(__file__).parent
INPUT_DIR = PROJECT_ROOT / "input"
INPUT_DIR.mkdir(exist_ok=True)

EVIDENCE_THRESHOLD = 0.5
EVIDENCE_AREA_FRACTION = 0.02

app = FastAPI(title="CAT-Net Inference API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None
_analyses: dict[str, dict] = {}


def load_model():
    global _model
    args = argparse.Namespace(
        cfg="experiments/CAT_full.yaml",
        opts=[
            "TEST.MODEL_FILE", "output/splicing_dataset/CAT_full/CAT_full_v2.pth.tar",
            "TEST.FLIP_TEST", "False",
            "TEST.NUM_SAMPLES", "0",
        ],
    )
    update_config(config, args)

    cudnn.benchmark = config.CUDNN.BENCHMARK
    cudnn.deterministic = config.CUDNN.DETERMINISTIC
    cudnn.enabled = config.CUDNN.ENABLED

    criterion = CrossEntropy(
        ignore_label=config.TRAIN.IGNORE_LABEL,
        weight=torch.FloatTensor([1.0, 1.0]),
    ).cuda()
    model = eval("models." + config.MODEL.NAME + ".get_seg_model")(config)
    model = FullModel(model, criterion)
    checkpoint = torch.load(config.TEST.MODEL_FILE)
    model.model.load_state_dict(checkpoint["state_dict"])
    print(f"[api_server] Loaded CAT-Net checkpoint from epoch {checkpoint['epoch']}")
    model = nn.DataParallel(model, device_ids=list(config.GPUS)).cuda()
    model.eval()
    _model = model


@app.on_event("startup")
def on_startup():
    load_model()


def clear_input_dir():
    for f in INPUT_DIR.iterdir():
        if f.is_file():
            f.unlink()


def run_inference() -> np.ndarray:
    """Runs the same forward pass as tools/infer.py against whatever
    single image currently sits in ./input/."""
    dataset = splicing_dataset(
        crop_size=None,
        grid_crop=True,
        blocks=("RGB", "DCTvol", "qtable"),
        DCT_channels=1,
        mode="arbitrary",
        read_from_jpeg=True,
    )
    if len(dataset) == 0:
        raise RuntimeError("No image found in input/ for inference")

    image, label, qtable = dataset[0]
    image = image.unsqueeze(0).cuda()
    label = label.unsqueeze(0).long().cuda()
    qtable = qtable.unsqueeze(0)

    with torch.no_grad():
        _, pred = _model(image, label, qtable)
        pred = torch.squeeze(pred, 0)
        pred = F.softmax(pred, dim=0)[1]
        pred = pred.cpu().numpy()

    return pred


def render_heatmap_png(pred: np.ndarray) -> bytes:
    width = pred.shape[1]
    dpi = 40
    fig = plt.figure(frameon=False)
    fig.set_size_inches(width / dpi, (width * pred.shape[0] / pred.shape[1]) / dpi)
    sns.heatmap(pred, vmin=0, vmax=1, cbar=False, cmap="jet")
    plt.axis("off")
    buf = io.BytesIO()
    plt.savefig(buf, format="png", bbox_inches="tight", transparent=True, pad_inches=0)
    plt.close(fig)
    buf.seek(0)
    return buf.read()


@app.post("/api/analyze")
async def analyze(file: UploadFile = File(...)):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image uploads are supported.")

    analysis_id = str(uuid.uuid4())
    ext = Path(file.filename or "upload.jpg").suffix or ".jpg"
    saved_path = INPUT_DIR / f"{analysis_id}{ext}"

    content = await file.read()
    clear_input_dir()
    saved_path.write_bytes(content)

    try:
        pred = run_inference()
        heatmap_bytes = render_heatmap_png(pred)
    except Exception as exc:
        _analyses[analysis_id] = {"id": analysis_id, "status": "FAILED", "error": str(exc)}
        raise HTTPException(500, f"Inference failed: {exc}") from exc

    original_b64 = base64.b64encode(content).decode()
    heatmap_b64 = base64.b64encode(heatmap_bytes).decode()
    has_evidence = bool(np.mean(pred > EVIDENCE_THRESHOLD) > EVIDENCE_AREA_FRACTION)

    result = {
        "id": analysis_id,
        "documentName": file.filename or "upload.jpg",
        "documentType": file.content_type,
        "pageCount": 1,
        "status": "COMPLETED",
        "stage": "REPORT",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "pages": [
            {
                "pageNumber": 1,
                "originalImageUrl": f"data:{file.content_type};base64,{original_b64}",
                "catnet": {
                    "heatmapUrl": f"data:image/png;base64,{heatmap_b64}",
                    "hasEvidence": has_evidence,
                },
            }
        ],
    }
    _analyses[analysis_id] = result
    return result


@app.get("/api/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    result = _analyses.get(analysis_id)
    if result is None:
        raise HTTPException(404, "Analysis not found")
    return result
