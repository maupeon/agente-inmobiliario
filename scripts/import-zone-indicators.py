"""Prepara los recuentos de Zone desde las instantáneas conservadas.

Uso: python3 scripts/import-zone-indicators.py /ruta/a/actividades
No descarga fuentes ni sustituye el ruido ausente por cero.
"""
import csv
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NIGHT = {'563002', '563003', '563007', '932004', '932005', '932006'}


def main():
    raw = Path(sys.argv[1])
    context = json.loads((ROOT / 'data/madrid/madrid-context.json').read_text())
    urban = json.loads((ROOT / 'data/madrid/urban-sources.json').read_text())
    assert hashlib.sha256(raw.read_bytes()).hexdigest() == urban['locales']['sha256'], 'El censo no coincide con la instantánea publicada'
    names = {d['code']: d['distrito'] for d in context['zonasVerdes']['distritos']}
    assert len(names) == 21
    services = {code: set() for code in names}
    categories = {code: {k: set() for k in ['alimentacion', 'farmacias', 'gimnasios', 'ocio']} for code in names}
    with raw.open(encoding='utf-8-sig', newline='') as f:
        for row in csv.DictReader(f, delimiter=';'):
            if row['desc_situacion_local'].strip() != 'Abierto' or not row['id_distrito_local'].strip():
                continue
            code = str(int(row['id_distrito_local'])).zfill(2)
            assert code in names
            ep = row['id_epigrafe'].strip()
            cats = []
            if ep.startswith('4711') or (ep.startswith('472') and ep != '472601'): cats.append('alimentacion')
            if ep == '477301': cats.append('farmacias')
            if ep == '931008': cats.append('gimnasios')
            if ep in NIGHT: cats.append('ocio')
            for cat in cats: categories[code][cat].add(row['id_local'])
            if cats: services[code].add(row['id_local'])
    for row in urban['locales']['distritos']:
        assert all(len(categories[row['code']][k]) == row[k] for k in categories[row['code']]), 'Recuentos censales inconsistentes'
    lines = {code: set() for code in names}
    excluded = 0
    for station in urban['metro']['estaciones']:
        if station['municipio'] != '079': continue
        if station['nombre'] == 'Sin nombre en el catálogo':
            excluded += 1
            continue
        assert station['distrito'] in names and station['lineas'] != 'Sin información'
        lines[station['distrito']].update(line.strip() for line in station['lineas'].split(','))
    assert excluded == 2
    green = {d['code']: d['superficieM2'] for d in context['zonasVerdes']['distritos']}
    actions = {d['code']: sum(d['actuaciones']) for d in context['seguridad']['distritos']}
    assert actions.keys() == names.keys()
    rows = [{'code': code, 'district': names[code], 'green': green[code], 'actions': actions[code],
             'transport': len(lines[code]), 'services': len(services[code]), 'noise': None} for code in sorted(names)]
    sources = {
        'green': {'source': context['zonasVerdes']['fuente'], 'url': context['zonasVerdes']['url'], 'period': '2025', 'sha256': context['zonasVerdes']['sha256']},
        'actions': {'source': context['seguridad']['fuente'], 'url': context['seguridad']['url'], 'period': '2026-05', 'sha256': context['seguridad']['sha256']},
        'transport': {'source': urban['metro']['fuente'], 'url': urban['metro']['url'], 'period': urban['consultado'], 'sha256': urban['metro']['sha256']},
        'services': {'source': urban['locales']['fuente'], 'url': urban['locales']['url'], 'period': urban['locales']['fechaDatos'], 'sha256': urban['locales']['sha256']},
        'noise': {'source': urban['ruido']['fuente'], 'url': urban['ruido']['url'], 'period': '2021', 'sha256': None},
    }
    output = '// Generado por scripts/import-zone-indicators.py; no editar a mano.\n'
    output += 'export const ZONE_DISTRICTS = ' + json.dumps(rows, ensure_ascii=False, indent=2) + ';\n'
    output += 'export const ZONE_SOURCES = ' + json.dumps(sources, ensure_ascii=False, indent=2) + ';\n'
    (ROOT / 'lib/neighborhood/zone-data.ts').write_text(output)
    print('21 distritos; cuatro indicadores disponibles; ruido ausente; servicios y líneas sin duplicados.')


if __name__ == '__main__':
    main()
