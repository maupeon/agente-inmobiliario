"""Genera el contexto urbano de /datos desde dos instantáneas públicas.

Uso: python3 scripts/import-urban-sources.py [directorio-cache]
Descarga únicamente cuando la copia no existe. Conserva URL, fecha y SHA-256.
Los recuentos se conservan como fuente; import-zone-indicators.py prepara Zone. Solo requiere stdlib.
"""
import collections
import csv
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/tmp/habitia-urban-sources')
CENSO_URL = 'https://datos.madrid.es/dataset/200085-0-censo-locales/resource/200085-5-censo-locales/download/200085_20260911_053809.csv'
METRO_URL = 'https://services5.arcgis.com/UxADft6QPcvFyDU1/arcgis/rest/services/M4_Red/FeatureServer/0/query?f=json&where=1%3D1&outFields=*&outSR=4326&returnGeometry=true&resultRecordCount=1000'
NIGHT = {'563002', '563003', '563007', '932004', '932005', '932006'}


def get(name, url):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if not path.exists():
        with urllib.request.urlopen(url, timeout=90) as response:
            path.write_bytes(response.read())
    return path


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    censo = get('actividades', CENSO_URL)
    metro = get('metro-stations.json', METRO_URL)
    names = {b['code'][:2]: b['distrito'] for b in json.loads((ROOT / 'data/madrid/madrid-official.json').read_text())['barrios']}
    counts = {code: {k: set() for k in ['alimentacion', 'farmacias', 'gimnasios', 'ocio']} for code in names}
    dates, labels, unique, rows = set(), {}, {}, 0
    missing_district = set()
    with censo.open(encoding='utf-8-sig', newline='') as f:
        for r in csv.DictReader(f, delimiter=';'):
            rows += 1
            dates.add(r['fx_carga'])
            if r['desc_situacion_local'].strip() != 'Abierto':
                continue
            if not r['id_distrito_local'].strip():
                missing_district.add(r['id_local'])
                continue
            code = str(int(r['id_distrito_local'])).zfill(2)
            assert code in names, f'Distrito desconocido: {code}'
            ep = r['id_epigrafe'].strip()
            categories = []
            if ep.startswith('4711') or (ep.startswith('472') and ep != '472601'):
                categories.append('alimentacion')
            if ep == '477301': categories.append('farmacias')
            if ep == '931008': categories.append('gimnasios')
            if ep in NIGHT: categories.append('ocio')
            if categories:
                key = r['id_local']
                assert key not in unique or unique[key] == code, 'Un local en varios distritos'
                unique[key] = code
                labels[ep] = r['desc_epigrafe'].strip()
                for category in categories: counts[code][category].add(key)
    assert dates == {'10/09/2026'}, dates
    raw = json.loads(metro.read_text())
    assert 'error' not in raw and not raw.get('exceededTransferLimit'), 'Respuesta incompleta de Metro'
    assert raw['spatialReference']['wkid'] == 4326
    stations, seen = [], set()
    for feature in raw['features']:
        a, g = feature['attributes'], feature['geometry']
        assert a['IDESTACION'] not in seen
        seen.add(a['IDESTACION'])
        assert -4.5 < g['x'] < -3 and 39.8 < g['y'] < 41.2
        stations.append({'id': a['IDESTACION'], 'nombre': a['DENOMINACION'] or 'Sin nombre en el catálogo', 'lineas': a.get('LINEAS') or 'Sin información', 'municipio': a['CODIGOMUNICIPIO'], 'distrito': a.get('DISTRITO'), 'lat': g['y'], 'lon': g['x'], 'fecha': a['FECHAACTUAL']})
    assert len(stations) == 293, 'Revisar cobertura de la nueva instantánea'
    out = {
        'consultado': '2026-09-11',
        'locales': {'fuente': 'Ayuntamiento de Madrid · Censo de locales y actividades', 'url': 'https://datos.madrid.es/dataset/200085-0-censo-locales', 'download': CENSO_URL, 'sha256': sha(censo), 'fechaDatos': '2026-09-10', 'filasLeidas': rows, 'localesAbiertosSinDistrito': len(missing_district), 'licencia': 'CC BY 4.0', 'epigrafes': labels, 'distritos': [{'code': code, 'nombre': names[code], **{k: len(v) for k, v in counts[code].items()}} for code in sorted(names)]},
        'metro': {'fuente': 'Consorcio Regional de Transportes de Madrid', 'url': 'https://www.arcgis.com/home/item.html?id=0a6c45e7bdd94679b67a2ae662c8838b', 'download': METRO_URL, 'sha256': sha(metro), 'licencia': 'https://crtm.es/licencia-de-uso/', 'estaciones': sorted(stations, key=lambda s: (s['nombre'],s['id']))},
        'ruido': {'fuente': 'Ayuntamiento de Madrid · Mapa Estratégico del Ruido 2021', 'periodo': '2021', 'url': 'https://servpub.madrid.es/IDEAM_WBGEOPORTAL/dataset.iam?id=470b89af-5d64-41d3-8bdb-2fe6badd0364', 'download': 'https://geoportal.madrid.es/fsdescargas/IDEAM_WBGEOPORTAL/MEDIO_AMBIENTE/INFORMACION_ACUSTICA/Mapa_Estrategico_Ruido_2021/MER2021.zip'}
    }
    (ROOT / 'data/madrid/urban-sources.json').write_text(json.dumps(out, ensure_ascii=False, indent=2)+'\n')
    print(f'{rows} filas censales; 21 distritos; {len(stations)} estaciones; sin duplicados por local y categoría.')


if __name__ == '__main__':
    main()
