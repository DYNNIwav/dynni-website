#!/usr/bin/env python3
"""Byggjer delingskorta (Open Graph) for dynni.no.

    python3 scripts/build-og-card.py

KVIFOR DETTE FINST. Kvar plattform beskjer eit delingskort til 1.91:1, altså 1200x630. Kortet for heile sida
var `Pål-bjønnef.jpg` på 1200x2130, eit ståande portrett, og eit beskore portrett viser midtstripa: av det
biletet blir det y 751-1379, som er hettegenseren. Kvar deling av porteføljen viste ein hettegenser i staden
for eit andlet.

Eit kort som ER 1200x630 kan ikkje bli beskore. Difor blir det bygd i staden for å bli funne.

Kortet arvar sida og finn ikkje opp ein ny stil: same svart, same JetBrains Mono og same blå som
css/variables.css. Portrettet er beskore rundt ANDLETET (y ~850 i originalen, lese av biletet) og ikkje rundt
midten av fila, som er heile skilnaden mellom eit portrett og eit portrettkort.
"""
from PIL import Image, ImageDraw, ImageFont
import os, sys

W, H = 1200, 630
BG, TEXT, DIM, BLUE = (0, 0, 0), (255, 255, 255), (142, 142, 147), (0, 122, 255)
FD = os.path.expanduser('~/Library/Fonts/')
ROOT = os.path.join(os.path.dirname(__file__), '..')
PHOTO = os.path.join(ROOT, 'assets/img/Pål-bjønnef.jpg')
FACE_Y = 850          # andletssenteret i originalen, i pikslar
SHOW = 0.42           # kor stor del av portretthøgda kortet viser
BAND = 460            # breidda på biletfeltet

CARDS = {
    'og-dynni.jpg': ['Pål Omland Eilevstjønn', 'Utviklar og designer',
                     'Appar, verktøy og nettsider', 'Bak Glimt og Paneless', 'dynni.no'],
    'og-dynni-en.jpg': ['Pål Omland Eilevstjønn', 'Developer and designer',
                        'Apps, tools and websites', 'Behind Glimt and Paneless', 'dynni.no'],
}

def font(name, size):
    p = FD + name
    if not os.path.exists(p):
        p = FD + 'JetBrainsMonoNerdFont-Regular.ttf'
    return ImageFont.truetype(p, size) if os.path.exists(p) else ImageFont.load_default()

def build(out, name, role, what, proof, url):
    card = Image.new('RGB', (W, H), BG)
    photo = Image.open(PHOTO).convert('RGB')
    pw, ph = photo.size
    scale = H / (ph * SHOW)
    nw, nh = int(pw * scale), int(ph * scale)
    photo = photo.resize((nw, nh), Image.LANCZOS)
    top = max(0, min(int(FACE_Y / ph * nh) - H // 2, nh - H))
    left = max(0, (nw - BAND) // 2)
    card.paste(photo.crop((left, top, left + BAND, top + H)), (W - BAND, 0))

    d = ImageDraw.Draw(card)
    d.text((72, 190), name, font=font('JetBrainsMonoNerdFont-Bold.ttf', 44), fill=TEXT)
    d.text((72, 258), role, font=font('JetBrainsMonoNerdFont-Regular.ttf', 28), fill=DIM)
    d.line([(72, 320), (140, 320)], fill=BLUE, width=3)
    d.text((72, 356), what, font=font('JetBrainsMonoNerdFont-Medium.ttf', 30), fill=TEXT)
    d.text((72, 402), proof, font=font('JetBrainsMonoNerdFont-Regular.ttf', 26), fill=DIM)
    d.text((72, 494), url, font=font('JetBrainsMonoNerdFont-Regular.ttf', 24), fill=DIM)

    p = os.path.join(ROOT, 'assets/img', out)
    card.save(p, 'JPEG', quality=88, optimize=True)
    print(f'{out}  {W}x{H}  {os.path.getsize(p)//1024} kB')

if __name__ == '__main__':
    if not os.path.exists(PHOTO):
        sys.exit(f'fann ikkje portrettet: {PHOTO}')
    for out, args in CARDS.items():
        build(out, *args)
