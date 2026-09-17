#!/usr/bin/env python3
"""Crea Equipo_7_HabitIA_Campus.zip con un límite estricto de 16 MB.

Uso: python3 scripts/build_campus_delivery.py [--delivery-dir RUTA]
Lee el PDF y README Apple de «entrega final». El código y los modelos se
referencian mediante la entrega pública completa, que no modifica. Conserva
el PDF byte a byte y registra el hash del paquete externo. Solo usa stdlib.
"""

import argparse
import hashlib
import json
import shutil
import tempfile
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlsplit

from build_final_delivery import Links, install_bundle, safe_name, sha256, zip_info


NAME = "Equipo_7_HabitIA_Campus"
LIMIT = 16_000_000
FULL_NAME = "Equipo_7_HabitIA.zip"
FULL_URL = "https://github.com/maupeon/habitia-tfm/releases/download/tfm-equipo-7-final/" + FULL_NAME
FULL_SHA256 = "8b51ca585114e4f13dd947f95cafbfa6b5e566850133eda1cad22a95019aa58d"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--delivery-dir", type=Path,
                        default=Path(__file__).resolve().parents[2] / "entrega final")
    delivery = parser.parse_args().delivery_dir.resolve()
    full_path = delivery / FULL_NAME
    if sha256(full_path) != FULL_SHA256:
        raise ValueError("El paquete completo local no coincide con la entrega pública referenciada")
    with zipfile.ZipFile(full_path) as full:
        versions = json.loads(full.read("Equipo_7_HabitIA/VERSIONES.json"))
        original_pdf = full.read("Equipo_7_HabitIA/HabitIA_memoria.pdf")
    if original_pdf != (delivery / "HabitIA_memoria.pdf").read_bytes():
        raise ValueError("La memoria local no coincide con la entrega pública")

    with tempfile.TemporaryDirectory(prefix=".Equipo_7_Campus-", dir=delivery) as temp:
        scratch = Path(temp)
        staging = scratch / NAME
        staging.mkdir()
        for source, target in (
            ("HabitIA_memoria.pdf", "HabitIA_memoria.pdf"),
            ("README-Apple.html", "README.html"),
            ("DERECHOS_DE_USO.md", "DERECHOS_DE_USO.md"),
        ):
            shutil.copyfile(delivery / source, staging / target)
        readme = (staging / "README.html").read_text(encoding="utf-8")
        if FULL_URL not in readme or NAME not in readme:
            raise ValueError("El README debe identificar la variante Campus y enlazar el paquete completo")
        links = Links()
        links.feed(readme)
        for href in links.hrefs:
            parsed = urlsplit(href)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            path = unquote(parsed.path)
            if not safe_name(path) or not (staging / path).is_file():
                raise ValueError(f"Enlace local inexistente: {href}")
        metadata = {
            "equipo": 7,
            "nombre": NAME,
            "variante": "Entrega para el Campus; código y modelos mediante enlaces públicos",
            "limite_bytes": LIMIT,
            "documentos": versions["documentos"],
            "pdf_sha256": hashlib.sha256(original_pdf).hexdigest(),
            "materiales_tecnicos_externos": {
                "url": FULL_URL,
                "sha256": FULL_SHA256,
                "bytes": full_path.stat().st_size,
                "repositorios": versions["repositorios"],
                "manifiesto": "Equipo_7_HabitIA/VERSIONES.json dentro del ZIP completo",
                "rutas_anexo_12": "03_codigo/ y 04_modelo/ pertenecen al ZIP completo",
            },
            "archivos_incluidos": ["HabitIA_memoria.pdf", "README.html", "DERECHOS_DE_USO.md", "VERSIONES.json", "SHA256SUMS.txt"],
        }
        (staging / "VERSIONES.json").write_text(
            json.dumps(metadata, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        sums = {p.name: sha256(p) for p in sorted(staging.iterdir())}
        (staging / "SHA256SUMS.txt").write_text(
            "".join(f"{digest}  {name}\n" for name, digest in sums.items()), encoding="utf-8")
        candidate = scratch / f"{NAME}.zip"
        with zipfile.ZipFile(candidate, "w", compression=zipfile.ZIP_DEFLATED) as archive:
            for path in sorted(staging.iterdir()):
                archive.writestr(zip_info(f"{NAME}/{path.name}"), path.read_bytes())
        if candidate.stat().st_size >= LIMIT:
            raise ValueError(f"La entrega supera el límite de {LIMIT} bytes")
        with zipfile.ZipFile(candidate) as archive:
            assert archive.testzip() is None
            assert len(archive.namelist()) == len(metadata["archivos_incluidos"])
            for name, digest in sums.items():
                assert hashlib.sha256(archive.read(f"{NAME}/{name}")).hexdigest() == digest
        install_bundle(staging, candidate, delivery / NAME, delivery / f"{NAME}.zip", scratch)
    output = delivery / f"{NAME}.zip"
    print(json.dumps({"zip": str(output), "bytes": output.stat().st_size,
                      "limite_bytes": LIMIT, "sha256": sha256(output)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
