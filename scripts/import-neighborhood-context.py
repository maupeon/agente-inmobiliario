"""Importa las copias oficiales de distrito conservando ámbito, periodo y procedencia.

Requiere openpyxl. No genera índices de seguridad, tasas de criminalidad ni Zone.
"""
import csv
import hashlib
import json
import math
import unicodedata
from pathlib import Path
from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'data/madrid'


def normalize(value):
    return ''.join(c for c in unicodedata.normalize('NFD', value.lower()) if c.isalnum())


def number(value):
    result = float(value.replace('.', '').replace(',', '.'))
    if not math.isfinite(result) or result < 0:
        raise ValueError('Superficie inválida')
    return result


def main():
    names = {b['code'][:2]: b['distrito'] for b in json.loads((BASE / 'madrid-official.json').read_text())['barrios']}
    assert len(names) == 21
    green_path = BASE / 'sources/zonas-verdes-2025.csv'
    police_path = BASE / 'sources/policia-mayo-2026.xlsx'
    with green_path.open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f, delimiter=';')
        assert reader.fieldnames == ['Nº Distrito', 'DISTRITO', 'm2 de ZONAS VERDES Y PARQUES en distrito', 'ha de ZONAS VERDES Y PARQUES en distrito ']
        greens = []
        for row in reader:
            if not row['Nº Distrito'].strip():
                continue
            code = row['Nº Distrito'].zfill(2)
            assert normalize(names[code]) == normalize(row['DISTRITO'])
            sqm = number(row['m2 de ZONAS VERDES Y PARQUES en distrito'])
            ha = number(row['ha de ZONAS VERDES Y PARQUES en distrito '])
            assert abs(sqm / 10000 - ha) <= .0051
            greens.append({'code': code, 'distrito': names[code], 'superficieM2': sqm})
    assert len(greens) == len({r['code'] for r in greens}) == 21
    book = load_workbook(police_path, read_only=True, data_only=True)
    rows = list(book['SEGURIDAD'].values)
    columns = ['RELACIONADAS CON LAS PERSONAS', 'RELACIONADAS CON EL PATRIMONIO', 'POR TENENCIA DE ARMAS', 'POR TENENCIA DE DROGAS', 'POR CONSUMO DE DROGAS']
    assert list(rows[2]) == ['DISTRITOS', *columns]
    ids = {normalize(v): k for k, v in names.items()}
    security = []
    unassigned = None
    totals = None
    for row in rows[3:]:
        label, *values = row
        assert all(isinstance(v, int) and v >= 0 for v in values)
        if label == 'TOTAL':
            totals = values
        elif label == 'SIN DISTRITO ASIGNADO':
            unassigned = values
        else:
            code = ids[normalize(label)]
            security.append({'code': code, 'distrito': names[code], 'actuaciones': values})
    book.close()
    assert len(security) == len({r['code'] for r in security}) == 21
    assert totals is not None and unassigned is not None
    assert [sum(r['actuaciones'][i] for r in security) + unassigned[i] for i in range(5)] == totals
    output = {
        'consultado': '2026-09-11',
        'zonasVerdes': {
            'periodo': '2025', 'ambito': 'Distrito', 'fuente': 'Ayuntamiento de Madrid · Superficie de parques y zonas verdes de distrito',
            'url': 'https://datos.madrid.es/dataset/300266-0-arbolado-superficie',
            'download': 'https://datos.madrid.es/dataset/300266-0-arbolado-superficie/resource/300266-33-arbolado-superficie/download/300266-33-arbolado-superficie.csv',
            'sha256': hashlib.sha256(green_path.read_bytes()).hexdigest(),
            'nota': 'Superficie de mantenimiento municipal incluida en el fichero de zonas verdes de distrito. Los parques históricos, singulares y forestales se publican en otro fichero; no se incluyen aquí.',
            'distritos': sorted(greens, key=lambda r: r['code']),
        },
        'seguridad': {
            'periodo': '2026-05', 'ambito': 'Distrito', 'fuente': 'Ayuntamiento de Madrid · Policía Municipal · Seguridad ciudadana',
            'url': 'https://datos.madrid.es/dataset/212616-0-policia-estadisticas',
            'download': 'https://datos.madrid.es/dataset/212616-0-policia-estadisticas/resource/212616-149-policia-estadisticas/download/212616-149-policia-estadisticas.xlsx',
            'sha256': hashlib.sha256(police_path.read_bytes()).hexdigest(), 'hoja': 'SEGURIDAD', 'columnas': columns,
            'nota': 'Recuentos de actuaciones de Policía Municipal, no todos los delitos ni una tasa de criminalidad. No miden por sí solos el riesgo individual ni la seguridad relativa del distrito.',
            'distritos': sorted(security, key=lambda r: r['code']), 'sinDistrito': unassigned, 'totales': totals,
        },
    }
    (BASE / 'madrid-context.json').write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    print('Importados 21 distritos por fuente; nombres, unidades y totales comprobados.')


if __name__ == '__main__':
    main()
