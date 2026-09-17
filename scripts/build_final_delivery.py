#!/usr/bin/env python3
"""Construye la entrega final del Equipo 7 sin publicar ni modificar las fuentes.

Uso, después de confirmar los cambios de ambos repositorios en Git y comprobar
externamente la paginación del PDF:

    python3 scripts/build_final_delivery.py --pdf-pages NUMERO_DE_PAGINAS

Por defecto, el espacio de trabajo es la carpeta que contiene este repositorio
y ``habitia-tfm``. Lee de ``entrega final`` el PDF, README-Apple.html y
DERECHOS_DE_USO.md; reutiliza los dos ZIP verificados del modelo de la entrega
``entrega/HabitIA_TFM_2026-09-16-r3``. ``--help`` permite cambiar estas rutas.

Genera exclusivamente ``entrega final/Equipo_7_HabitIA/`` y su ZIP. Si existen,
los sustituye después de construir y validar íntegramente la nueva entrega.
No incluye las antiguas memorias, informes de verificación, dependencias ni
credenciales. El código procede de los commits HEAD de repositorios limpios;
las exclusiones se registran en VERSIONES.json. La memoria tiene 19 páginas de
contenido, una página reservada a bibliografía y catorce anexos. El argumento
--pdf-pages registra el total comprobado por quien compila el documento; este
script solo verifica su cabecera PDF, no interpreta ni valida su paginación.

Solo emplea la biblioteca estándar y Git. Manteniendo los mismos archivos de
entrada y commits, los ZIP y manifiestos son reproducibles: orden, permisos y
fechas internas son constantes. No añade afirmaciones sobre pruebas nuevas.
"""

import argparse
import hashlib
import json
import re
import shutil
import stat
import subprocess
import tempfile
import zipfile
from html import escape
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit


NAME = "Equipo_7_HabitIA"
ZIP_DATE = (1980, 1, 1, 0, 0, 0)
ARTIFACTS = {
    "modelo.json", "metadatos.json", "barrios.parquet",
    "indices_distrito.parquet", "pois.parquet", "variables_barrio.parquet",
}
MODEL_ZIPS = ("habitia-modelo-v3.3.zip", "habitia_predictor_original_2026.zip")
FORBIDDEN_DIRS = {
    ".git", "node_modules", ".next", "__pycache__", "__macosx", ".ds_store",
    ".venv", "venv", "archivo-privado", "entrega", "entrega final",
    "entrega-final", "entregas", "entregas-anteriores",
}
DOCUMENT_SUFFIXES = {".pdf", ".doc", ".docx", ".odt", ".rtf", ".tex"}
ARCHIVE_SUFFIXES = {".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar"}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def git(repo, *args):
    return subprocess.check_output(["git", "-C", str(repo), *args], text=True).strip()


def clean_commit(repo):
    if git(repo, "status", "--porcelain", "--untracked-files=all"):
        raise ValueError(f"Hay cambios sin commit en {repo.name}")
    return git(repo, "rev-parse", "HEAD")


def safe_name(name):
    path = PurePosixPath(name)
    return bool(name) and not path.is_absolute() and not any(
        part in {"..", "."} for part in path.parts
    ) and not any(char in name for char in ("\\", "\n", "\r", "\x00"))


def excluded_code(name):
    """Devuelve el motivo de exclusión sin leer posibles archivos privados."""
    parts = PurePosixPath(name).parts
    if not safe_name(name):
        raise ValueError(f"Ruta no válida en el código: {name!r}")
    for part in parts:
        low = part.casefold()
        if low in FORBIDDEN_DIRS or low.startswith(".venv"):
            return "carpeta privada, regenerable o de entrega"
        if low.startswith(".env") and part != ".env.example":
            return "configuración privada"
    suffix = PurePosixPath(name).suffix.casefold()
    if suffix in {".pem", ".key", ".p12", ".pfx", ".pyc"}:
        return "credencial o archivo regenerable"
    if suffix in DOCUMENT_SUFFIXES:
        return "documento académico: la memoria vigente está en la raíz"
    if suffix in ARCHIVE_SUFFIXES:
        return "archivo anidado no necesario para reproducir el código"
    return None


def zip_info(name, executable=False):
    info = zipfile.ZipInfo(name, ZIP_DATE)
    info.create_system = 3
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = (stat.S_IFREG | (0o755 if executable else 0o644)) << 16
    return info


def copy_to_zip(archive, source, name, executable=False):
    with source.open("rb") as reader, archive.open(zip_info(name, executable), "w") as writer:
        shutil.copyfileobj(reader, writer)


def archive_code(repo, commit, destination, scratch):
    raw = scratch / f"{repo.name}-git.zip"
    subprocess.run([
        "git", "-C", str(repo), "archive", "--format=zip", "-o", str(raw), commit,
    ], check=True)
    excluded = []
    kept = 0
    with zipfile.ZipFile(raw) as source, zipfile.ZipFile(
        destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9,
    ) as target:
        for info in sorted(source.infolist(), key=lambda item: item.filename):
            if info.is_dir():
                continue
            reason = excluded_code(info.filename)
            if reason:
                excluded.append({"ruta": info.filename, "motivo": reason})
                continue
            mode = info.external_attr >> 16
            if stat.S_ISLNK(mode):
                raise ValueError(f"Enlace simbólico no admitido: {repo.name}/{info.filename}")
            output_info = zip_info(f"{repo.name}/{info.filename}", bool(mode & 0o111))
            with source.open(info) as reader, target.open(output_info, "w") as writer:
                shutil.copyfileobj(reader, writer)
            kept += 1
    raw.unlink()
    if not kept:
        raise ValueError(f"El archivo de código {repo.name} está vacío")
    validate_code_zip(destination, repo.name)
    return {"commit": commit, "archivos": kept, "exclusiones": excluded}


def validate_code_zip(path, prefix):
    with zipfile.ZipFile(path) as archive:
        if archive.testzip():
            raise ValueError(f"ZIP de código dañado: {path.name}")
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError(f"Entradas duplicadas: {path.name}")
        for name in names:
            expected_prefix = prefix + "/"
            if not name.startswith(expected_prefix) or excluded_code(name[len(expected_prefix):]):
                raise ValueError(f"Archivo no publicable en {path.name}: {name}")


def load_checksums(path):
    entries = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        digest, name = line.split("  ", 1)
        if not re.fullmatch(r"[a-f0-9]{64}", digest) or not safe_name(name) or name in entries:
            raise ValueError(f"Manifiesto SHA-256 no válido: {path}")
        entries[name] = digest
    return entries


def verify_models(source_package, manifest):
    hashes = manifest["sha256"]
    if set(hashes) != ARTIFACTS:
        raise ValueError("El manifiesto debe contener los seis artefactos esperados")
    package_hash = hashlib.sha256(json.dumps(
        hashes, sort_keys=True, separators=(",", ":"),
    ).encode()).hexdigest()
    if package_hash != manifest["paquete_sha256"]:
        raise ValueError("La huella conjunta del modelo no coincide con su manifiesto")
    checksums = load_checksums(source_package / "SHA256SUMS.txt")
    for filename in MODEL_ZIPS:
        path = source_package / "04_modelo" / filename
        relative = f"04_modelo/{filename}"
        if path.is_symlink() or sha256(path) != checksums.get(relative):
            raise ValueError(f"El ZIP del modelo no coincide con el original: {filename}")
        original = filename == MODEL_ZIPS[1]
        prefix = "habitia_predictor/data/models/paquete_produccion/" if original else ""
        expected = {prefix + name: digest for name, digest in hashes.items()}
        allowed = set(expected)
        if original:
            expected.update({
                f"habitia_predictor/src/{name}": digest
                for name, digest in manifest["source_code_sha256"].items()
            })
            allowed = set(expected) | {"habitia_predictor/LEEME.md", "habitia_predictor/requirements.txt"}
        with zipfile.ZipFile(path) as archive:
            names = archive.namelist()
            if archive.testzip() or set(names) != allowed or len(names) != len(allowed):
                raise ValueError(f"Contenido inesperado en el ZIP del modelo: {filename}")
            for name, digest in expected.items():
                if not safe_name(name) or hashlib.sha256(archive.read(name)).hexdigest() != digest:
                    raise ValueError(f"Archivo original modificado: {name}")
    return package_hash


def local_readme(source):
    """Sustituye solo la sección de descargas; mantiene los estilos del original."""
    rows = [
        ("03_codigo/agente-inmobiliario.zip", "Código de la aplicación", "agente-inmobiliario.zip"),
        ("03_codigo/habitia-tfm.zip", "Código del predictor y la API", "habitia-tfm.zip"),
        ("04_modelo/habitia-modelo-v3.3.zip", "Artefactos del modelo · paquete v3.3", MODEL_ZIPS[0]),
        ("04_modelo/habitia_predictor_original_2026.zip", "Predictor original para comprobar la paridad", MODEL_ZIPS[1]),
        ("VERSIONES.json", "Versiones de los materiales", "Commits incluidos e identidad del modelo"),
        ("SHA256SUMS.txt", "Integridad de los archivos", "Huellas SHA-256 de esta entrega"),
        ("DERECHOS_DE_USO.md", "Fuentes y derechos de uso", "Condiciones aplicables a los materiales y datos"),
    ]
    icon = '<svg class="icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>'
    links = "\n".join(
        f'      <a class="row" href="{escape(href, quote=True)}">{icon}'
        f'<div class="body"><strong>{escape(title)}</strong><code>{escape(description)}</code></div>'
        '<span class="go" aria-hidden="true">↓</span></a>'
        for href, title, description in rows
    )
    section = f'''  <section>
    <h2>Materiales técnicos</h2>
    <p class="sub">Equipo 7 · Copias incluidas en esta entrega para reproducir el sistema.</p>
    <div class="list">
{links}
    </div>
    <div class="callout"><span>La memoria vigente, con sus catorce anexos, es <a href="HabitIA_memoria.pdf">el PDF de esta carpeta</a>. Extrae los ZIP de código y sigue sus README para instalar la aplicación y el servicio. Los artefactos y el predictor original permiten reproducir la inferencia y comprobar la paridad; el entrenamiento completo se documenta en el repositorio del modelo y el anexo 13.</span></div>
  </section>'''
    pattern = r"[ \t]*<section\b[^>]*>\s*<h2(?:\s[^>]*)?>Materiales técnicos</h2>.*?</section>"
    result, count = re.subn(pattern, lambda _match: section, source, flags=re.DOTALL)
    if count != 1:
        raise ValueError("El README debe tener una única sección «Materiales técnicos»")
    return result


class Links(HTMLParser):
    def __init__(self):
        super().__init__()
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.hrefs.extend(value for key, value in attrs if key == "href" and value)


def validate_delivery(staging):
    expected = {"README.html", "HabitIA_memoria.pdf", "DERECHOS_DE_USO.md", "VERSIONES.json", "SHA256SUMS.txt"}
    expected.update(f"03_codigo/{name}.zip" for name in ("agente-inmobiliario", "habitia-tfm"))
    expected.update(f"04_modelo/{name}" for name in MODEL_ZIPS)
    actual = {path.relative_to(staging).as_posix() for path in staging.rglob("*") if path.is_file()}
    if actual != expected:
        raise ValueError(f"Inventario final inesperado: {sorted(actual ^ expected)}")
    for name in ("agente-inmobiliario", "habitia-tfm"):
        validate_code_zip(staging / "03_codigo" / f"{name}.zip", name)
    checksums = load_checksums(staging / "SHA256SUMS.txt")
    if set(checksums) != expected - {"SHA256SUMS.txt"}:
        raise ValueError("El manifiesto final no cubre todos los archivos")
    if any(sha256(staging / name) != digest for name, digest in checksums.items()):
        raise ValueError("Una huella final no coincide con el archivo")
    links = Links()
    links.feed((staging / "README.html").read_text(encoding="utf-8"))
    for href in links.hrefs:
        parsed = urlsplit(href)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        relative = unquote(parsed.path)
        if not safe_name(relative) or not (staging / relative).exists():
            raise ValueError(f"Enlace local roto en el README: {href}")
    return sorted(actual)


def install_bundle(staging, candidate_zip, destination, output_zip, scratch):
    """Sustituye únicamente los dos destinos propios, con recuperación ante error."""
    for path in (destination, output_zip):
        if path.is_symlink():
            raise ValueError(f"No se sustituye un enlace simbólico: {path}")
    if destination.exists() and not destination.is_dir():
        raise ValueError(f"El destino no es una carpeta: {destination}")
    if output_zip.exists() and not output_zip.is_file():
        raise ValueError(f"El destino del ZIP no es un archivo: {output_zip}")
    backups = []
    installed = []
    try:
        for target, backup_name in ((destination, "previous-directory"), (output_zip, "previous.zip")):
            if target.exists():
                backup = scratch / backup_name
                target.rename(backup)
                backups.append((target, backup))
        staging.rename(destination)
        installed.append(destination)
        candidate_zip.rename(output_zip)
        installed.append(output_zip)
    except BaseException:
        for target in reversed(installed):
            shutil.rmtree(target) if target.is_dir() else target.unlink()
        for target, backup in reversed(backups):
            backup.rename(target)
        raise


def positive_integer(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("Debe ser un entero positivo")
    return number


def main():
    default_workspace = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--workspace", type=Path, default=default_workspace,
                        help="Carpeta que contiene agente-inmobiliario y habitia-tfm")
    parser.add_argument("--delivery-dir", type=Path, help="Carpeta de fuentes y salida; por defecto: WORKSPACE/entrega final")
    parser.add_argument("--technical-package", type=Path, help="Paquete r3 con ZIP del modelo y SHA256SUMS.txt")
    parser.add_argument("--pdf-pages", type=positive_integer,
                        help="Total de páginas del PDF comprobado externamente, incluidos los anexos")
    args = parser.parse_args()
    workspace = args.workspace.resolve()
    delivery = (args.delivery_dir or workspace / "entrega final").resolve()
    source_package = (args.technical_package or workspace / "entrega/HabitIA_TFM_2026-09-16-r3").resolve()
    repos = {name: workspace / name for name in ("agente-inmobiliario", "habitia-tfm")}
    commits = {name: clean_commit(repo) for name, repo in repos.items()}
    manifest = json.loads(git(repos["habitia-tfm"], "show", f'{commits["habitia-tfm"]}:servicio/manifiesto_v3.json'))
    package_hash = verify_models(source_package, manifest)
    sources = {name: delivery / name for name in ("HabitIA_memoria.pdf", "README-Apple.html", "DERECHOS_DE_USO.md")}
    for name, path in sources.items():
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"Falta el archivo final o es un enlace: {name}")
    with sources["HabitIA_memoria.pdf"].open("rb") as stream:
        if stream.read(5) != b"%PDF-":
            raise ValueError("La memoria no tiene una cabecera PDF válida")
    source_hashes = {name: sha256(path) for name, path in sources.items()}
    destination = delivery / NAME
    output_zip = delivery / (NAME + ".zip")
    with tempfile.TemporaryDirectory(prefix=".Equipo_7_HabitIA-", dir=delivery) as temp:
        scratch = Path(temp)
        staging = scratch / NAME
        staging.mkdir()
        (staging / "03_codigo").mkdir()
        (staging / "04_modelo").mkdir()
        for name in ("HabitIA_memoria.pdf", "DERECHOS_DE_USO.md"):
            shutil.copyfile(sources[name], staging / name)
        (staging / "README.html").write_text(local_readme(
            sources["README-Apple.html"].read_text(encoding="utf-8"),
        ), encoding="utf-8")
        code = {name: archive_code(repo, commits[name], staging / "03_codigo" / f"{name}.zip", scratch)
                for name, repo in repos.items()}
        for name in MODEL_ZIPS:
            shutil.copyfile(source_package / "04_modelo" / name, staging / "04_modelo" / name)
        documents = {
            "archivo": "HabitIA_memoria.pdf", "paginas_contenido": 19,
            "paginas_bibliografia": 1, "numero_anexos": 14,
            "formatos": ["PDF"],
        }
        if args.pdf_pages is not None:
            documents["paginas_pdf"] = args.pdf_pages
        versions = {
            "equipo": 7, "nombre": NAME,
            "repositorios": commits,
            "archivos_codigo": "git archive de los commits indicados, con exclusiones documentadas y fechas ZIP normalizadas",
            "codigo": code,
            "documentos": documents,
            "modelo": {
                "id": manifest["model_id"], "version_http": manifest["model_version"],
                "paquete_sha256": package_hash, "sha256_artefactos": manifest["sha256"],
                "sha256_codigo_original": manifest["source_code_sha256"],
                "archivo": f"04_modelo/{MODEL_ZIPS[0]}", "original": f"04_modelo/{MODEL_ZIPS[1]}",
                "artefactos_recibidos_modificados": False,
            },
            "fuentes_documentales_sha256": source_hashes,
            "alcance": {
                "verificacion_paquete": "Inventario, enlaces locales, integridad ZIP, SHA-256 y paridad de archivos con el manifiesto del modelo",
                "pruebas_del_sistema_ejecutadas_por_este_script": False,
                "entrenamiento": "Código y requisitos de reproducción enlazados en README.html; los datos originales de entrenamiento no se incluyen en este ZIP",
                "credenciales_incluidas": False,
            },
        }
        (staging / "VERSIONES.json").write_text(json.dumps(versions, ensure_ascii=False, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        files = sorted(path for path in staging.rglob("*") if path.is_file())
        (staging / "SHA256SUMS.txt").write_text("".join(
            f"{sha256(path)}  {path.relative_to(staging).as_posix()}\n" for path in files
        ), encoding="utf-8")
        verify_models(staging, manifest)
        inventory = validate_delivery(staging)
        candidate_zip = scratch / (NAME + ".zip")
        with zipfile.ZipFile(candidate_zip, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            for relative in inventory:
                copy_to_zip(archive, staging / relative, f"{NAME}/{relative}")
        with zipfile.ZipFile(candidate_zip) as archive:
            if archive.testzip() or archive.namelist() != [f"{NAME}/{name}" for name in inventory]:
                raise ValueError("El ZIP final no coincide con el inventario validado")
        for name, repo in repos.items():
            if clean_commit(repo) != commits[name]:
                raise ValueError(f"El repositorio {name} cambió durante la preparación")
        if source_hashes != {name: sha256(path) for name, path in sources.items()}:
            raise ValueError("Los documentos cambiaron durante la preparación")
        install_bundle(staging, candidate_zip, destination, output_zip, scratch)
    print(json.dumps({
        "carpeta": str(destination), "zip": str(output_zip),
        "zip_sha256": sha256(output_zip), "bytes": output_zip.stat().st_size,
        "repositorios": commits, "archivos": inventory,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
