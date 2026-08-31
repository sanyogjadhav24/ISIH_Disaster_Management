import pandas as pd
import numpy as np


def label_dataset(csv_path):
    df = pd.read_csv(csv_path)

    group_col = "event_id" if "event_id" in df.columns else None

    if "server_time" in df.columns:
        df["server_time"] = pd.to_datetime(df["server_time"], errors="coerce")
        sort_cols = [c for c in [group_col, "server_time"] if c]
        if sort_cols:
            df = df.sort_values(sort_cols).reset_index(drop=True)

    if group_col:
        df["smoke_slope"] = (
            df.groupby(group_col)["smoke"].diff().fillna(0)
        )
        df["co_slope"] = (
            df.groupby(group_col)["co"].diff().fillna(0)
        )
    else:
        df["smoke_slope"] = df["smoke"].diff().fillna(0)
        df["co_slope"] = df["co"].diff().fillna(0)

    df["label"] = 0

    df.loc[
        (df["smoke"] > 700) & (df["smoke"] < 3000),
        "label",
    ] = 1

    df.loc[
        (df["smoke_slope"] > 150) & (df["smoke"] >= 700) & (df["smoke"] < 3500),
        "label",
    ] = 2

    df.loc[
        (df["smoke"] >= 3500) | ((df["smoke"] >= 2500) & (df["smoke_slope"] > 300)),
        "label",
    ] = 3

    lookahead_window = 3
    if group_col:
        for _, idx in df.groupby(group_col).groups.items():
            idx = list(idx)
            for k, row_idx in enumerate(idx):
                future_slice = idx[k + 1 : k + 1 + lookahead_window]
                if not future_slice:
                    continue
                future_max = df.loc[future_slice, "label"].max()
                if future_max == 3 and df.loc[row_idx, "label"] < 2:
                    df.loc[row_idx, "label"] = 2
    else:
        for i in range(len(df) - lookahead_window):
            future_max = df.iloc[i + 1 : i + 1 + lookahead_window]["label"].max()
            if future_max == 3 and df.loc[i, "label"] < 2:
                df.loc[i, "label"] = 2

    return df


df_labeled = label_dataset("disaster_dataset.csv")
df_labeled.to_csv("labeled_training_data.csv", index=False)
