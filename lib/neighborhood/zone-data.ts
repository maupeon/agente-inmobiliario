// Generado por scripts/import-zone-indicators.py; no editar a mano.
export const ZONE_DISTRICTS = [
  {
    "code": "01",
    "district": "Centro",
    "green": 296640.47,
    "actions": 388,
    "transport": 8,
    "services": 2017,
    "noise": null
  },
  {
    "code": "02",
    "district": "Arganzuela",
    "green": 913614.95,
    "actions": 40,
    "transport": 4,
    "services": 742,
    "noise": null
  },
  {
    "code": "03",
    "district": "Retiro",
    "green": 366849.39,
    "actions": 19,
    "transport": 4,
    "services": 540,
    "noise": null
  },
  {
    "code": "04",
    "district": "Salamanca",
    "green": 348912.97,
    "actions": 29,
    "transport": 6,
    "services": 993,
    "noise": null
  },
  {
    "code": "05",
    "district": "Chamartín",
    "green": 556323.56,
    "actions": 76,
    "transport": 7,
    "services": 917,
    "noise": null
  },
  {
    "code": "06",
    "district": "Tetuán",
    "green": 619530.41,
    "actions": 27,
    "transport": 6,
    "services": 1069,
    "noise": null
  },
  {
    "code": "07",
    "district": "Chamberí",
    "green": 98418.95,
    "actions": 26,
    "transport": 8,
    "services": 1158,
    "noise": null
  },
  {
    "code": "08",
    "district": "Fuencarral-El Pardo",
    "green": 3717351.69,
    "actions": 86,
    "transport": 3,
    "services": 727,
    "noise": null
  },
  {
    "code": "09",
    "district": "Moncloa-Aravaca",
    "green": 1913960.1,
    "actions": 53,
    "transport": 7,
    "services": 582,
    "noise": null
  },
  {
    "code": "10",
    "district": "Latina",
    "green": 2608444.77,
    "actions": 49,
    "transport": 3,
    "services": 1162,
    "noise": null
  },
  {
    "code": "11",
    "district": "Carabanchel",
    "green": 2414260.97,
    "actions": 114,
    "transport": 3,
    "services": 1316,
    "noise": null
  },
  {
    "code": "12",
    "district": "Usera",
    "green": 1645061.7,
    "actions": 49,
    "transport": 2,
    "services": 669,
    "noise": null
  },
  {
    "code": "13",
    "district": "Puente de Vallecas",
    "green": 2781632.66,
    "actions": 164,
    "transport": 1,
    "services": 972,
    "noise": null
  },
  {
    "code": "14",
    "district": "Moratalaz",
    "green": 1158420.24,
    "actions": 27,
    "transport": 1,
    "services": 339,
    "noise": null
  },
  {
    "code": "15",
    "district": "Ciudad Lineal",
    "green": 1279131.28,
    "actions": 51,
    "transport": 5,
    "services": 1018,
    "noise": null
  },
  {
    "code": "16",
    "district": "Hortaleza",
    "green": 2969629.51,
    "actions": 49,
    "transport": 2,
    "services": 612,
    "noise": null
  },
  {
    "code": "17",
    "district": "Villaverde",
    "green": 2147536.31,
    "actions": 23,
    "transport": 1,
    "services": 642,
    "noise": null
  },
  {
    "code": "18",
    "district": "Villa de Vallecas",
    "green": 2980663.33,
    "actions": 46,
    "transport": 1,
    "services": 393,
    "noise": null
  },
  {
    "code": "19",
    "district": "Vicálvaro",
    "green": 2044263.27,
    "actions": 15,
    "transport": 1,
    "services": 247,
    "noise": null
  },
  {
    "code": "20",
    "district": "San Blas-Canillejas",
    "green": 1730940.0,
    "actions": 70,
    "transport": 3,
    "services": 554,
    "noise": null
  },
  {
    "code": "21",
    "district": "Barajas",
    "green": 913933.27,
    "actions": 23,
    "transport": 2,
    "services": 210,
    "noise": null
  }
];
export const ZONE_SOURCES = {
  "green": {
    "source": "Ayuntamiento de Madrid · Superficie de parques y zonas verdes de distrito",
    "url": "https://datos.madrid.es/dataset/300266-0-arbolado-superficie",
    "period": "2025",
    "sha256": "ef6db42cb7e85d8137af664d80c418b939293e50266d8874cda794b38f4a6a01"
  },
  "actions": {
    "source": "Ayuntamiento de Madrid · Policía Municipal · Seguridad ciudadana",
    "url": "https://datos.madrid.es/dataset/212616-0-policia-estadisticas",
    "period": "2026-05",
    "sha256": "b604c8035e66bdb7e64f762077c6708cdc2660c10d71927d11cce44d6e5e65f5"
  },
  "transport": {
    "source": "Consorcio Regional de Transportes de Madrid",
    "url": "https://www.arcgis.com/home/item.html?id=0a6c45e7bdd94679b67a2ae662c8838b",
    "period": "2026-09-11",
    "sha256": "dcd038097de0a310aa3908e9200e495c0e3e2cc7bc65251d41321d59d7971837"
  },
  "services": {
    "source": "Ayuntamiento de Madrid · Censo de locales y actividades",
    "url": "https://datos.madrid.es/dataset/200085-0-censo-locales",
    "period": "2026-09-10",
    "sha256": "ec707a4e81cb08b28ca156e6a967b10870589762078ac6c729bc4b03b4d5487e"
  },
  "noise": {
    "source": "Ayuntamiento de Madrid · Mapa Estratégico del Ruido 2021",
    "url": "https://servpub.madrid.es/IDEAM_WBGEOPORTAL/dataset.iam?id=470b89af-5d64-41d3-8bdb-2fe6badd0364",
    "period": "2021",
    "sha256": null
  }
};
