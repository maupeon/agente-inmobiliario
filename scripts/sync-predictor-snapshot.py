#!/usr/bin/env python3
"""Importa metadatos y gain desde un paquete XGBoost, sin entrenar ni evaluar."""
import argparse
import hashlib
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Carpeta con metadatos.json y modelo.json")
    parser.add_argument("--service-evidence", type=Path,
                        help="Carpeta servicio con manifiesto, evidencia sintética y paridad del mismo paquete")
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
        "source": f"{args.source.resolve().parents[2].name}/data/models/paquete_produccion/modelo.json",
        "sha256": hashlib.sha256(raw_model).hexdigest(),
        "method": f"gain: mean loss_changes over non-leaf splits using each feature, across all {len(trees)} trees",
        "reference": "https://xgboost.readthedocs.io/en/stable/python/python_api.html#xgboost.Booster.get_score",
        "features": features,
    }
    public_data = {}
    if args.service_evidence:
        for name in ("manifiesto_v3.json", "evidencia_modelo_v3.json", "paridad_v3.json"):
            public_data[name] = (args.service_evidence / name).read_bytes()
        manifest = json.loads(public_data["manifiesto_v3.json"])
        for name, expected in manifest["sha256"].items():
            if hashlib.sha256((args.source / name).read_bytes()).hexdigest() != expected:
                raise ValueError(f"La evidencia pertenece a otro paquete: {name}")
        package_hash = hashlib.sha256(json.dumps(manifest["sha256"], sort_keys=True,
                                                separators=(",", ":")).encode()).hexdigest()
        if manifest.get("paquete_sha256") != package_hash:
            raise ValueError("Identidad del paquete inconsistente")
        evidence = json.loads(public_data["evidencia_modelo_v3.json"])
        parity = json.loads(public_data["paridad_v3.json"])
        for record in (evidence["salud"], parity):
            if (record["model_version"] != manifest["model_version"]
                    or record["modelo_sha256"] != importance["sha256"]
                    or record["paquete_sha256"] != package_hash):
                raise ValueError("Evidencia o paridad obsoleta: no se publica")
        public_data["predictor-metadata.json"] = raw_meta
        public_data["predictor-importance.json"] = (json.dumps(importance, indent=2) + "\n").encode()
    app = Path(__file__).resolve().parents[1]
    target = app / "app" / "presentacion"
    (target / "predictor-metadata.json").write_bytes(raw_meta)
    (target / "predictor-importance.json").write_text(json.dumps(importance, indent=2) + "\n")
    if public_data:
        public_target = app / "public" / "model-results"
        public_target.mkdir(parents=True, exist_ok=True)
        for name, payload in public_data.items():
            (public_target / name).write_bytes(payload)
    print(json.dumps({"exportado": meta["exportado"], "arboles": len(trees),
                      "modelo_sha256": importance["sha256"],
                      "metadatos_sha256": hashlib.sha256(raw_meta).hexdigest(),
                      "top5": features[:5]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
