import joblib
import xgboost as xgb
from pathlib import Path
from onnxmltools import convert_xgboost
from onnxmltools.convert.common.data_types import FloatTensorType

ROOT_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT_DIR / "xgboost_disaster_model.pkl"
PUBLIC_ONNX_PATH = ROOT_DIR / "public" / "disaster_model.onnx"

model = joblib.load(MODEL_PATH)

if isinstance(model, xgb.Booster):
    model.feature_names = None

initial_types = [("input", FloatTensorType([None, 11]))]

onnx_model = convert_xgboost(
    model,
    initial_types=initial_types,
    target_opset=12,
)

PUBLIC_ONNX_PATH.parent.mkdir(parents=True, exist_ok=True)

with open(PUBLIC_ONNX_PATH, "wb") as f:
    f.write(onnx_model.SerializeToString())

print(f"Model converted to ONNX: {PUBLIC_ONNX_PATH}")
