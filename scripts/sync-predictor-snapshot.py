#!/usr/bin/env python3
"""Importa metadatos y gain desde un paquete XGBoost, sin entrenar ni evaluar."""
import argparse
import hashlib
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Carpeta con metadatos.json y modelo.json")
    args = parser.parse_args()
    raw_meta = (args.source / "metadatos.json").read_bytes()
    raw_model = (args.source / "modelo.json").read_bytes()
    meta = json.loads(raw_meta)
    learner = json.loads(raw_model)["learner"]
    trees = learner["gradient_booster"]["model"]["trees"]
    columns = meta["columnas"]
    if (learner["feature_names"] != columns or len(trees) != meta["params"]["n_estimators"]
            or meta["familia"] != "xgboost" or meta["ano_base"] != 2018):
        raise ValueError("El modelo nativo y sus metadatos no concuerdan")
    totals, counts = [0.0] * len(columns), [0] * len(columns)
    for tree in trees:
        for child, index, gain in zip(tree["left_children"], tree["split_indices"], tree["loss_changes"]):
            if child != -1:
                totals[index] += gain
                counts[index] += 1
    features = sorted((dict(feature=name, gain=totals[i] / counts[i], splits=counts[i])
                       for i, name in enumerate(columns) if counts[i]),
                      key=lambda feature: feature["gain"], reverse=True)
    importance = {
        "source": "nuevo_modelo/data/models/paquete_produccion/modelo.json",
        "sha256": hashlib.sha256(raw_model).hexdigest(),
        "method": f"gain: mean loss_changes over non-leaf splits using each feature, across all {len(trees)} trees",
        "reference": "https://xgboost.readthedocs.io/en/stable/python/python_api.html#xgboost.Booster.get_score",
        "features": features,
    }
    target = Path(__file__).resolve().parents[1] / "app" / "presentacion"
    (target / "predictor-metadata.json").write_bytes(raw_meta)
    (target / "predictor-importance.json").write_text(json.dumps(importance, indent=2) + "\n")
    print(json.dumps({"exportado": meta["exportado"], "arboles": len(trees),
                      "modelo_sha256": importance["sha256"],
                      "metadatos_sha256": hashlib.sha256(raw_meta).hexdigest(),
                      "top5": features[:5]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
