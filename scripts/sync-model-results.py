#!/usr/bin/env python3
"""Exporta únicamente un experimento terminado a la presentación. No entrena."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = APP.parent / 'memoria/revision_2026-09-08/experimento/resultados_revision.json'
DEFAULT_TARGET = APP / 'app/presentacion/results-data.json'
LABELS = {
    'CONSTRUCTEDAREA': 'Superficie', 'ROOMNUMBER': 'Habitaciones', 'BATHNUMBER': 'Baños',
    'FLOORCLEAN': 'Planta', 'HASLIFT': 'Ascensor', 'LATITUDE': 'Latitud', 'LONGITUDE': 'Longitud',
    'ISSTUDIO': 'Estudio', 'ISDUPLEX': 'Dúplex', 'm2_por_habitacion': 'Superficie por habitación',
    'banos_por_habitacion': 'Baños por habitación', 'es_bajo': 'Planta baja',
    'x_km': 'Coordenada local este–oeste', 'y_km': 'Coordenada local norte–sur',
    'DISTANCE_TO_CITY_CENTER': 'Distancia al centro', 'log_dist_centro': 'Log-distancia al centro',
    'FLATLOCATIONID_cat': 'Interior/exterior', 'barrio': 'Barrio aproximado', 'distrito': 'Distrito aproximado',
    'ROOMNUMBER_ausente': 'Habitaciones sin dato', 'BATHNUMBER_ausente': 'Baños sin dato',
    'FLOORCLEAN_ausente': 'Planta sin dato', 'HASLIFT_ausente': 'Ascensor sin dato',
    'exterior_ausente': 'Exterior sin dato', 'subtipo_ausente': 'Subtipo sin dato',
}

def finite(value, label):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value):
        raise ValueError(f'{label}: se esperaba un número finito registrado')
    return value

def rows(part):
    return [{'name': name, 'value': finite(part['metricas'][name]['MdAPE_pct'], name)}
            for name in ['Referencia territorial', 'Hedónico Ridge', 'LightGBM']]

def convert(source, source_path):
    outer, artifact = source['evaluacion_exterior'], source['artefacto_final']
    temporal = source.get('temporal')
    folds = outer['folds']
    if len(folds) != source['configuracion']['outer_folds']:
        raise ValueError('Faltan grupos exteriores: no se publican resultados parciales')
    if not source['configuracion'].get('historical_data_already_explored'):
        raise ValueError('El resultado debe reconocer explícitamente el histórico ya explorado')
    n_features = int(finite(artifact['n_features'], 'n_features'))
    if any(f['n_features'] != n_features for f in folds):
        raise ValueError('Número de variables inconsistente entre artefacto y grupos')
    if artifact['paridad_transformacion'].get('igualdad_exacta') is not True:
        raise ValueError('Falta la verificación de paridad del artefacto')
    audit = source['datos']
    partitions = artifact['particiones']
    om, am = outer['metricas']['LightGBM'], artifact['metricas']['LightGBM']
    ci = outer['bootstrap']['MdAPE_pct']
    if len(ci) != 2 or finite(ci[0], 'IC inferior') > finite(ci[1], 'IC superior'):
        raise ValueError('Intervalo descriptivo bootstrap inválido')
    magnitudes = {}
    for fold in folds:
        for feature, value in fold['shap']['media_absoluta'].items():
            magnitudes[feature] = magnitudes.get(feature, 0.0) + finite(value, feature) / len(folds)
    total = sum(magnitudes.values())
    if total <= 0:
        raise ValueError('SHAP absoluto no disponible o vacío')
    ordered = sorted(magnitudes.items(), key=lambda row: row[1], reverse=True)
    shap = [{'name': LABELS.get(k, k), 'value': 100 * v / total} for k, v in ordered[:6]]
    if len(ordered) > 6:
        shap.append({'name': 'Resto de variables', 'value': 100 * sum(v for _, v in ordered[6:]) / total})
    try:
        relative_source = str(source_path.relative_to(APP.parent))
    except ValueError:
        relative_source = source_path.name
    return {
        'schema_version': 2, 'status': 'complete', 'model_id': source['version'],
        'source': relative_source, 'source_sha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
        'generated_at': datetime.now(timezone.utc).isoformat(), 'n_features': n_features,
        'sample': {
            'input': audit['dataset']['rows_input'], 'eligible': audit['filas_elegibles_pipeline'],
            'fit': partitions['fit']['filas'], 'calibration': partitions['calibracion']['filas'],
            'test': partitions['evaluacion']['filas'], 'evaluated': outer['n_evaluadas'],
            'abstentions': outer['abstenciones'],
        },
        'models': rows(outer), 'artifactModels': rows(artifact),
        'scope': {
            'outer': finite(om['MdAPE_pct'], 'MdAPE exterior'),
            'artifact': finite(am['MdAPE_pct'], 'MdAPE artefacto'),
            'temporal': finite(temporal['metricas']['LightGBM']['MdAPE_pct'], 'MdAPE temporal') if temporal else None,
            'folds': [finite(f['metricas']['LightGBM']['MdAPE_pct'], 'MdAPE fold') for f in folds],
        },
        'coverage': {
            'outer': finite(om['cobertura_pct'], 'cobertura exterior'),
            'artifact': finite(am['cobertura_pct'], 'cobertura artefacto'),
            'outer_assets': finite(om['cobertura_activos_todos_registros_pct'], 'cobertura activos exterior'),
            'artifact_assets': finite(am['cobertura_activos_todos_registros_pct'], 'cobertura activos artefacto'),
            'width_pct': finite(om['anchura_relativa_mediana_pct'], 'anchura exterior'),
            'target': 100 * (1 - finite(source['configuracion']['alpha'], 'alpha')),
        },
        'uncertainty': {
            'mdape_outer_ci95': [finite(value, 'IC descriptivo MdAPE') for value in outer['bootstrap']['MdAPE_pct']],
            'bootstrap_repetitions': finite(outer['bootstrap']['repeticiones'], 'repeticiones bootstrap'),
        },
        'limitations': {
            'cheap_decile_coverage_pct': finite(outer['segmentos']['decil_precio'][0]['cobertura_pct'], 'cobertura decil barato'),
            'cheap_decile_mdape_pct': finite(outer['segmentos']['decil_precio'][0]['MdAPE_pct'], 'MdAPE decil barato'),
            'temporal_asset_coverage_pct': finite(temporal['metricas']['LightGBM']['cobertura_activos_todos_registros_pct'], 'cobertura temporal por activo') if temporal else None,
        },
        'shap': shap,
        'metrics': {'outer': outer['metricas'], 'artifact': artifact['metricas'],
                    'temporal': temporal['metricas'] if temporal else None, 'bootstrap': outer['bootstrap']},
        'notice': 'Evaluación retrospectiva agrupada: todo el histórico de 2018 ya había sido explorado. Sin validación externa de 2026.',
    }

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=DEFAULT_SOURCE)
    parser.add_argument('--target', type=Path, default=DEFAULT_TARGET)
    args = parser.parse_args()
    source_path = args.source.resolve()
    if not source_path.is_file():
        raise SystemExit(f'Experimento aún no terminado: {source_path}. No se modifica la presentación.')
    source = json.loads(source_path.read_text())
    result = convert(source, source_path)
    target = args.target.resolve()
    tmp = target.with_suffix('.tmp')
    tmp.write_text(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False) + '\n')
    tmp.replace(target)
    print(json.dumps({'target': str(target), 'source_sha256': result['source_sha256'],
                      'model_id': result['model_id'], 'status': 'complete'}, ensure_ascii=False))

if __name__ == '__main__':
    main()
