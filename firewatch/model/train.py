import pandas as pd
import numpy as np
import xgboost as xgb
import pickle

from sklearn.model_selection import GroupShuffleSplit
from sklearn.utils.class_weight import compute_class_weight
from sklearn.metrics import classification_report, confusion_matrix


DATA_PATH = "labeled_training_data.csv"
MODEL_PATH = "xgboost_disaster_model.pkl"
RANDOM_STATE = 42


df = pd.read_csv(DATA_PATH)

df["label"] = df["label"].replace({3: 2})


target = "label"

non_feature_columns = [
    "sensor_id",
    "location",
    "server_time",
    "event_id",
    "global_location",
    "status",
]

existing_drop_cols = [c for c in non_feature_columns if c in df.columns]

X = df.drop(columns=[target] + existing_drop_cols)
y = df[target].values

# Keep sequence-like records from the same event together in one split.
if "event_id" in df.columns:
    groups = df["event_id"].astype(str).values
elif "sensor_id" in df.columns:
    groups = df["sensor_id"].astype(str).values
else:
    groups = np.arange(len(df)).astype(str)


X = X.select_dtypes(include=["int64", "float64", "int32", "float32", "bool"])


classes = np.unique(y)
class_weights = compute_class_weight(
    class_weight="balanced",
    classes=classes,
    y=y,
)

weight_map = dict(zip(classes, class_weights))
sample_weights = np.array([weight_map[label] for label in y])


gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=RANDOM_STATE)
train_idx, val_idx = next(gss.split(X, y, groups=groups))

X_train = X.iloc[train_idx]
X_val = X.iloc[val_idx]
y_train = y[train_idx]
y_val = y[val_idx]
w_train = sample_weights[train_idx]
w_val = sample_weights[val_idx]


dtrain = xgb.DMatrix(X_train, label=y_train, weight=w_train)
dval = xgb.DMatrix(X_val, label=y_val, weight=w_val)


params = {
    "objective": "multi:softprob",
    "num_class": 3,
    "eval_metric": "mlogloss",
    "learning_rate": 0.05,
    "max_depth": 4,
    "min_child_weight": 5,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "gamma": 0.5,
    "reg_alpha": 0.5,
    "reg_lambda": 1.5,
    "tree_method": "hist",
    "random_state": RANDOM_STATE,
}


model = xgb.train(
    params,
    dtrain,
    num_boost_round=500,
    evals=[(dtrain, "train"), (dval, "val")],
    early_stopping_rounds=30,
    verbose_eval=25,
)


probs = model.predict(dval)

preds = []
for p in probs:
    if p[2] > 0.35:
        preds.append(2)
    elif p[1] > 0.4:
        preds.append(1)
    else:
        preds.append(0)

preds = np.array(preds)


print("Confusion Matrix:")
print(confusion_matrix(y_val, preds))
print()
print("Classification Report:")
print(classification_report(y_val, preds))

print("Train class counts:", dict(zip(*np.unique(y_train, return_counts=True))))
print("Val class counts:", dict(zip(*np.unique(y_val, return_counts=True))))
print("Train groups:", len(np.unique(groups[train_idx])))
print("Val groups:", len(np.unique(groups[val_idx])))


with open(MODEL_PATH, "wb") as f:
    pickle.dump(model, f)
