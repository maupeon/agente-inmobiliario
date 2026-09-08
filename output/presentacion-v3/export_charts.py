"""Export the presentation's verified results as standalone scientific figures."""
from pathlib import Path
import json
import os

HERE = Path(__file__).resolve().parent
os.environ.setdefault("MPLCONFIGDIR", str(HERE / ".mpl-cache"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages

DATA = json.loads((HERE.parents[1] / "app/presentacion/results-data.json").read_text())
OUT = HERE / "graficas"
OUT.mkdir(exist_ok=True)
PAPER, INK, GREEN, SOFT, CLAY = "#f6f5ef", "#17211d", "#176547", "#a4b9a7", "#a85b38"
plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 12, "figure.facecolor": PAPER, "axes.facecolor": PAPER, "text.color": INK, "axes.labelcolor": INK, "xtick.color": INK, "ytick.color": INK, "svg.fonttype": "none"})

def base(title, xlabel, xmax):
    fig, ax = plt.subplots(figsize=(12, 6.75), layout="constrained")
    ax.set_title(title, loc="left", fontsize=22, weight="bold", pad=25)
    ax.set_xlabel(xlabel, labelpad=12)
    ax.set_xlim(0, xmax)
    ax.spines[["top", "right", "left"]].set_visible(False)
    ax.spines["bottom"].set_color("#c1c8be")
    ax.tick_params(axis="y", length=0, pad=12)
    ax.grid(axis="x", color="#dfe3da", linewidth=.7)
    ax.set_axisbelow(True)
    return fig, ax

def bars(title, rows, maxval, xlabel="Error porcentual mediano (MdAPE, %) · menor es mejor"):
    fig, ax = base(title, xlabel, maxval)
    names, vals = [r[0] for r in rows], [r[1] for r in rows]
    ax.barh(names, vals, color=[GREEN if n == len(vals)-1 else SOFT for n in range(len(vals))], height=.62)
    ax.invert_yaxis()
    for y, value in enumerate(vals):
        ax.text(value + maxval * .015, y, f"{value:.2f} %".replace(".", ","), va="center", fontsize=12, weight="bold")
    return fig, ax

with PdfPages(OUT / "resultados-habitia.pdf") as pdf:
    def save(fig, name, source):
        fig.supxlabel(source, fontsize=8, color="#68736d")
        fig.savefig(OUT / f"{name}.svg")
        fig.savefig(OUT / f"{name}.png", dpi=160)
        pdf.savefig(fig)
        plt.close(fig)

    fig, ax = bars("Del barrio a cada vivienda", [(r["name"],r["value"]) for r in DATA["models"]], 18)
    save(fig,"01-modelos","Fuente: modelos.json y seleccion.json · 23.416 viviendas de prueba · modelo final: 54 variables")
    fig, ax = bars("Qué aporta la localización", [(r["name"],r["value"]) for r in DATA["ablation"]], 15)
    save(fig,"02-ablacion","Fuente: seleccion.json · configuraciones E, A y B · misma métrica y muestra de prueba")
    c = DATA["coverage"]
    fig, ax = bars("Calibrar acerca la cobertura al objetivo", [("Sin calibrar",c["cobertura_sin_calibrar_pct"]),("Calibración conformal",c["cobertura_conformal_pct"])], 105,"Cobertura observada (%)")
    ax.axvline(90,color=CLAY,linestyle="--",linewidth=1.5,label="Objetivo: 90 %")
    ax.legend(loc="lower right",frameon=False)
    save(fig,"03-cobertura","Fuente: oportunidades.json · cobertura agregada, no probabilidad de acierto de una vivienda individual")
    v = DATA["scope"]
    fig, ax = bars("Dónde generaliza y dónde encuentra su límite",[("Viviendas no vistas",v["holdout"]),("Trimestre posterior",v["temporal"]),("Barrios no vistos",v["spatial"])],25)
    ax.patches[-1].set_color(CLAY)
    ax.set_ylim(2.85, -.5)
    ax.scatter(v["folds"],[2.43]*5,color=CLAY,edgecolors=PAPER,s=50,zorder=3,label="Cinco particiones espaciales")
    ax.legend(loc="upper right",frameon=False)
    save(fig,"04-generalizacion","Fuente: seleccion.json · barra espacial: media de cinco particiones; puntos: valores individuales, no intervalo de confianza")
    fig, ax = bars("Qué información utiliza el modelo", sorted(DATA["shap"].items(),key=lambda x:x[1],reverse=True),56,"Participación en la importancia SHAP (%)")
    save(fig,"05-shap","Fuente: interpretabilidad.json · importancia relativa, no causalidad · total redondeado: 99,9 %")
print(f"Exportadas cinco gráficas en SVG/PNG y un PDF: {OUT}")
