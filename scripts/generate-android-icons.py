#!/usr/bin/env python3
"""Régénère les icônes Android natives (mipmap-*) depuis l'asset source
"Tantie Sagesse" (frontend_src/public/images/tantie-sagesse-icon-512.png).

Script JETABLE, à relancer si l'icône source change. Ne fait pas partie
d'un pipeline de build : exécution manuelle ponctuelle uniquement.

Usage:
    python3 scripts/generate-android-icons.py

Doit être lancé depuis la racine du dépôt (ou le worktree).
"""
from __future__ import annotations

from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SOURCE = REPO_ROOT / "frontend_src/public/images/tantie-sagesse-icon-512.png"
RES = REPO_ROOT / "android/app/src/main/res"
BACKGROUND_XML = RES / "values/ic_launcher_background.xml"

# Couleur de fond de l'icône adaptative — token Jùlaba existant
# (frontend_src/src/app/styles/design-tokens.ts, ROLE_COLORS.marchand),
# déjà très proche de l'orange du disque derrière Tata Sagesse dans la
# source (#B2622D mesuré) : cohérence de charte + aucune couture visible.
# Définie ici en dur pour vérifier qu'elle reste synchronisée avec
# values/ic_launcher_background.xml (voir check_background_color_in_sync) ;
# ce script ne modifie pas ce XML lui-même.
BRAND_BACKGROUND = "#C46210"

# NB : la source a un fond dégradé (lumière/ombre) baké dans son disque
# orange, pas une teinte plate. Un aplat de fond derrière les coins
# transparents créerait une couture visible avec ce dégradé — inutile
# de composer un fond : la source telle quelle (portrait circulaire,
# coins transparents nets) est déjà cohérente pour les deux variantes
# legacy, comme pour de nombreuses icônes Android publiées (WhatsApp,
# Slack…) qui laissent les coins transparents sur ic_launcher.png.

# Legacy icons (ic_launcher / ic_launcher_round) : taille en px par densité.
LEGACY_SIZES = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# Icône adaptative (Android 8+) : le foreground est un canvas de 108dp
# converti en px par densité (même échelle que les tailles legacy x2.25,
# valeurs déjà présentes dans le dépôt avant ce correctif).
FOREGROUND_SIZES = {
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}

# Le sujet (portrait circulaire) doit rester dans la "safe zone" centrale
# d'environ 66% du canvas pour ne pas être rogné par les masques adaptatifs
# (cercle/carré arrondi/squircle selon les fabricants).
FOREGROUND_SUBJECT_RATIO = 0.70


def load_source() -> Image.Image:
    im = Image.open(SOURCE).convert("RGBA")
    if im.width != im.height:
        raise SystemExit(f"Source non carrée : {im.size}")
    return im


def make_legacy_icon(source: Image.Image, size: int) -> Image.Image:
    """ic_launcher et ic_launcher_round : la source est déjà un portrait
    circulaire à fond transparent — un simple resize haute qualité suffit
    pour les deux (voir note plus haut sur le dégradé de la source)."""
    return source.resize((size, size), Image.LANCZOS)


def check_background_color_in_sync() -> None:
    """Avertit si BRAND_BACKGROUND diverge de values/ic_launcher_background.xml,
    pour éviter que ce commentaire mente silencieusement après un futur
    changement de couleur fait uniquement côté XML."""
    xml = BACKGROUND_XML.read_text(encoding="utf-8")
    if BRAND_BACKGROUND.upper() not in xml.upper():
        raise SystemExit(
            f"BRAND_BACKGROUND ({BRAND_BACKGROUND}) ne correspond plus à "
            f"{BACKGROUND_XML} — mets à jour l'un des deux avant de relancer."
        )


def make_foreground(source: Image.Image, canvas_size: int, ratio: float) -> Image.Image:
    """Foreground de l'icône adaptative : sujet centré, marge de sécurité,
    fond transparent (la couleur vient de values/ic_launcher_background.xml)."""
    subject_size = round(canvas_size * ratio)
    subject = source.resize((subject_size, subject_size), Image.LANCZOS)
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset = ((canvas_size - subject_size) // 2, (canvas_size - subject_size) // 2)
    canvas.paste(subject, offset, subject)
    return canvas


def main() -> None:
    check_background_color_in_sync()
    source = load_source()
    print(f"Source: {SOURCE} ({source.size[0]}x{source.size[1]})")

    for density, size in LEGACY_SIZES.items():
        d = RES / density
        icon = make_legacy_icon(source, size)
        icon.save(d / "ic_launcher_round.png")
        icon.save(d / "ic_launcher.png")
        print(f"  {density}: ic_launcher.png / ic_launcher_round.png -> {size}x{size}")

    for density, size in FOREGROUND_SIZES.items():
        d = RES / density
        make_foreground(source, size, FOREGROUND_SUBJECT_RATIO).save(
            d / "ic_launcher_foreground.png"
        )
        print(f"  {density}: ic_launcher_foreground.png -> {size}x{size}")

    print("Terminé.")


if __name__ == "__main__":
    main()
