"""Vídeo narrativo do Detetive Obtenção (PIL + numpy + ffmpeg).
Uso: python3 gerar_video.py trilha.wav saida.mp4 [preview_t1 preview_t2 ...]
Com tempos extras, só grava PNGs de prévia (em ./previa)."""
import sys, os, math, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from multiprocessing import Pool

W, H, FPS = 1280, 720, 30
K = 1.4            # fator de desaceleração: 1 s de roteiro = K s de vídeo
DDUR = 120.0       # duração do roteiro (s) antes do fator
DUR = DDUR * K + 24.6   # + EX (tempo extra das perguntas; ver QLEN/EX)
BG = (4, 14, 8)
GREEN = (57, 255, 20)
DKG = (10, 36, 10)
BORDER = (26, 58, 26)
RED = (255, 59, 59)
AMBER = (255, 176, 32)
WHITE = (240, 246, 240)
GREY = (140, 160, 140)

FD = "/usr/share/fonts/opentype/inter/Inter-%s.otf"
MONO = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
_fc = {}


def F(kind, size):
    k = (kind, size)
    if k not in _fc:
        path = MONO if kind == "m" else FD % {"r": "Regular", "b": "Bold", "x": "ExtraBold", "k": "Black", "md": "Medium"}[kind]
        _fc[k] = ImageFont.truetype(path, size)
    return _fc[k]


def ease(x):
    x = max(0.0, min(1.0, x))
    return x * x * (3 - 2 * x)


def ramp(t, a, b):
    return ease((t - a) / (b - a)) if b > a else float(t >= a)


def vis(t, a, b, fi=0.4, fo=0.4):
    """opacidade 0..1 para janela [a,b] com fade."""
    if t < a or t > b:
        return 0.0
    return min(1.0, (t - a) / fi, (b - t) / fo)


class Cv:
    def __init__(self):
        self.im = Image.new("RGBA", (W, H), BG + (255,))

    def text(self, s, x, y, kind="b", size=32, color=WHITE, a=1.0, anchor="mm", glow=0, spacing=6):
        if a <= 0.01:
            return
        f = F(kind, size)
        d = ImageDraw.Draw(self.im)
        bb = d.multiline_textbbox((0, 0), s, font=f, anchor="la", spacing=spacing)
        pad = 30 + glow * 3
        lw, lh = bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad
        lay = Image.new("RGBA", (lw, lh), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lay)
        al = "center" if anchor[0] == "m" else ("left" if anchor[0] == "l" else "right")
        ld.multiline_text((pad - bb[0], pad - bb[1]), s, font=f, fill=color + (int(255 * a),), align=al, spacing=spacing)
        if glow:
            g = lay.filter(ImageFilter.GaussianBlur(glow))
            lay = Image.alpha_composite(g, lay)
        ox = {"l": 0, "m": -lw / 2, "r": -lw}[anchor[0]] + (bb[0] - pad if anchor[0] == "l" else 0)
        oy = {"t": 0, "m": -lh / 2, "b": -lh}[anchor[1]]
        if anchor[0] == "r":
            ox += pad - 0
        if anchor[0] == "l":
            ox = 0 - pad + bb[0] * 0
        self.im.alpha_composite(lay, (int(x + ox), int(y + oy)))

    def rect(self, x0, y0, x1, y1, fill=None, outline=None, a=1.0, r=10, w=2):
        if a <= 0.01:
            return
        lay = Image.new("RGBA", (int(x1 - x0) + 4, int(y1 - y0) + 4), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        d.rounded_rectangle((2, 2, x1 - x0 + 2, y1 - y0 + 2), r, fill=(fill + (int(255 * a),)) if fill else None,
                            outline=(outline + (int(255 * a),)) if outline else None, width=w)
        self.im.alpha_composite(lay, (int(x0 - 2), int(y0 - 2)))

    def draw(self):
        return ImageDraw.Draw(self.im)

    def glowcircle(self, x, y, r, color, a=0.5, blur=30):
        lay = Image.new("RGBA", (int(4 * r), int(4 * r)), (0, 0, 0, 0))
        ImageDraw.Draw(lay).ellipse((r, r, 3 * r, 3 * r), fill=color + (int(255 * a),))
        lay = lay.filter(ImageFilter.GaussianBlur(blur))
        self.im.alpha_composite(lay, (int(x - 2 * r), int(y - 2 * r)))


def typed(s, t, t0, cps=22):
    n = int(max(0, (t - t0)) * cps)
    return s[:n] + ("▌" if 0 < n < len(s) or (n >= len(s) and int(t * 2) % 2 == 0 and t > t0) else "")


def rain(cv, t, alpha=0.25, n=130):
    lay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    for i in range(n):
        r1 = (i * 7919 % 1000) / 1000
        r2 = (i * 104729 % 1000) / 1000
        sp = 700 + 500 * r2
        x = (r1 * (W + 300) + (t * 140)) % (W + 300) - 150
        y = ((r2 * H) + t * sp) % (H + 60) - 30
        d.line((x, y, x - 10, y + 26 + 10 * r2), fill=(150, 220, 160, int(255 * alpha * (0.4 + 0.6 * r1))), width=1)
    cv.im.alpha_composite(lay)


def magnifier(cv, x, y, r, a=1.0, color=GREEN, w=8):
    lay = Image.new("RGBA", (int(r * 4), int(r * 4)), (0, 0, 0, 0))
    d = ImageDraw.Draw(lay)
    c = 2 * r
    d.ellipse((c - r, c - r, c + r, c + r), outline=color + (int(255 * a),), width=w)
    k = r * 0.72
    d.line((c + k, c + k, c + r * 1.75, c + r * 1.75), fill=color + (int(255 * a),), width=int(w * 1.7))
    g = lay.filter(ImageFilter.GaussianBlur(10))
    lay = Image.alpha_composite(g, lay)
    cv.im.alpha_composite(lay, (int(x - c), int(y - c)))


def arrow(cv, x0, y, x1, color=GREEN, a=1.0, w=4):
    d = cv.draw()
    col = color + (int(255 * a),)
    d.line((x0, y, x1 - 10, y), fill=col, width=w)
    d.polygon([(x1, y), (x1 - 16, y - 10), (x1 - 16, y + 10)], fill=col)


def person(cv, x, y, s=1.0, color=GREEN, a=1.0):
    d = cv.draw()
    col = color + (int(255 * a),)
    d.ellipse((x - 26 * s, y - 80 * s, x + 26 * s, y - 28 * s), outline=col, width=5)
    d.pieslice((x - 60 * s, y - 14 * s, x + 60 * s, y + 100 * s), 180, 360, outline=col, width=5)
    d.line((x - 60 * s, y + 43 * s, x + 60 * s, y + 43 * s), fill=col, width=5)


def kicker(cv, s, t, a, b):
    o = vis(t, a, b, 0.5, 0.5)
    cv.text(s, 50, 48, "m", 18, GREEN, o, "lm")
    cv.rect(50, 70, 50 + 14 * len(s) * 0.9, 72, fill=GREEN, a=o * 0.7, r=1)


def caption(cv, s, t, a, b, y=640, size=30, color=WHITE):
    return  # substituído pela legenda narrada (SUBS)
    o = vis(t, a, b, 0.45, 0.45)
    cv.text(s, W / 2, y + (1 - o) * 12, "md", size, color, o, "mm")


# ================= CENAS =================

def s1(cv, t):  # 0-12
    rain(cv, t, 0.22 * ramp(t, 0.5, 3))
    for i, (s, t0, y, c) in enumerate([("MARINHA DO BRASIL", 0.8, 60, GREEN), ("GERÊNCIA DE OBTENÇÃO", 1.8, 92, GREEN), ("TERÇA-FEIRA · 15h42", 3.0, 124, GREY)]):
        cv.text(typed(s, t, t0), 60, y, "m", 22, c, vis(t, t0, 12, 0.1, 0.5), "lm")
    p = ramp(t, 4.2, 5.4)
    if p > 0:
        x0, y0 = 300, 175 + (1 - p) * 40
        cv.rect(x0, y0, x0 + 680, y0 + 370, fill=(10, 30, 14), outline=GREEN, a=p * vis(t, 4.2, 12, 0.1, 0.8), r=8)
        o = p * vis(t, 4.2, 12, 0.1, 0.8)
        cv.text("PI 00.000.00-0000   ·   SOBRESSALENTE", x0 + 30, y0 + 38, "m", 20, GREEN, o, "lm")
        cv.draw().line((x0 + 24, y0 + 66, x0 + 656, y0 + 66), fill=BORDER + (int(255 * o),), width=2)
        rows = [("DESCRIÇÃO", "VÁLVULA; ESFERA; AÇO", WHITE), ("DIÂMETRO", "???", RED), ("FABRICANTE", "???", RED),
                ("REF. / P/N", "???", RED), ("APLICAÇÃO", "???", RED), ("FOTO / DESENHO", "NÃO HÁ", RED)]
        for i, (k, v, c) in enumerate(rows):
            ty = y0 + 105 + i * 44
            ap = o * ramp(t, 5.4 + i * 0.35, 5.8 + i * 0.35)
            cv.text(k, x0 + 30, ty, "m", 19, GREY, ap, "lm")
            blink = 1.0 if c == WHITE else (0.55 + 0.45 * abs(math.sin(t * 5 + i)))
            cv.text(v, x0 + 250, ty, "m", 24, c, ap * blink, "lm")
        # lupa varrendo o cartão
        if t > 6.5:
            mx = x0 + 120 + 440 * (0.5 + 0.5 * math.sin((t - 6.5) * 0.9))
            my = y0 + 190 + 90 * math.sin((t - 6.5) * 1.7)
            magnifier(cv, mx, my, 58, 0.9 * o)
    caption(cv, "Uma linha de descrição. Nenhuma pista.", t, 8.0, 10.6)
    caption(cv, "E há milhares de itens assim.", t, 10.2, 12.0)


def s2(cv, t):  # 12-30
    rain(cv, t, 0.12)
    kicker(cv, "A CADEIA DA DEMANDA", t, 12.3, 30)
    xs = [220, 640, 1060]
    names = ["NAVIOS", "DIRETORIA", "OBTENÇÃO"]
    subs = ["pedem sobressalentes", "especialista do material\ncataloga os itens", "compra o que foi pedido"]
    appear = [12.6, 14.5, 17.0]
    for i, x in enumerate(xs):
        p = ramp(t, appear[i], appear[i] + 0.7)
        yy = 300 + (1 - p) * 30
        stress = ramp(t, 20, 27) if i == 1 else 0
        col = tuple(int(GREEN[k] * (1 - stress) + RED[k] * stress) for k in range(3))
        cv.rect(x - 150, yy - 80, x + 150, yy + 80, fill=(10, 30, 14), outline=col, a=p, r=12, w=3)
        cv.text(names[i], x, yy - 22, "x", 32, col, p, "mm")
        cv.text(subs[i], x, yy + 28, "r", 17, GREY, p, "mm")
    for (xa, xb, t0) in [(375, 485, 13.8), (795, 905, 16.0)]:
        p = ramp(t, t0, t0 + 0.6)
        arrow(cv, xa, 300, xb, GREEN, p)
    # pacotes viajando
    for k in range(18):
        t0 = 15 + k * 0.7
        for (xa, xb) in [(375, 485), (795, 905)] if k % 2 else [(375, 485)]:
            u = (t - t0) % 2.0 / 1.0
            if t > t0 and u < 1 and t < 29:
                px = xa + (xb - xa) * u
                cv.rect(px - 8, 292, px + 8, 308, fill=GREEN, a=0.9, r=3)
    # pilha na diretoria
    n = int(ramp(t, 19, 27) * 40)
    for j in range(n):
        cv.rect(560 + (j % 10) * 16, 215 - (j // 10) * 14, 572 + (j % 10) * 16, 225 - (j // 10) * 14, fill=AMBER if j < 25 else RED, a=0.85, r=2)
    cnt = int(1200 + ramp(t, 19, 29) * 11300)
    cv.text("ITENS NA FILA: %s" % f"{cnt:,}".replace(",", "."), 640, 440, "m", 26, RED, ramp(t, 19.5, 20.5) * vis(t, 19.5, 30, 0.1, 0.5), "mm")
    caption(cv, "Os navios pedem.", t, 12.8, 15.2)
    caption(cv, "A Diretoria — a especialista no material — cataloga cada item.", t, 15.3, 20.2)
    caption(cv, "Mas são milhares, cada um com especificações detalhadas.", t, 20.3, 25.0)
    caption(cv, "Manter cada descrição atualizada é humanamente impossível.", t, 25.1, 29.8)


def s3(cv, t):  # 30-48
    rain(cv, t, 0.14)
    kicker(cv, "NA PONTA DA OBTENÇÃO", t, 30.3, 48)
    p = ramp(t, 30.5, 31.3)
    person(cv, 190, 320, 1.3, GREEN, p)
    cv.text("ANALISTA DA OBTENÇÃO", 190, 450, "b", 16, GREEN, p, "mm")
    cv.text("pesquisando o preço…", 190, 474, "r", 15, GREY, p, "mm")
    bubbles = [(31.6, "Comerciante 1", "“Não conheço esse item.”", 330, 160),
               (34.4, "Comerciante 2", "“Tenho 20 itens que podem ser esse.\nFalta mais informação.”", 400, 270),
               (37.4, "Comerciante 3", "“Qual a medida? O fabricante?\nPara que equipamento?”", 450, 390)]
    for (t0, who, msg, x, y) in bubbles:
        o = ramp(t, t0, t0 + 0.4) * vis(t, t0, 42.5, 0.01, 0.6)
        cv.rect(x + 280, y - 38 + (1 - o) * 10, x + 880, y + 52 + (1 - o) * 10, fill=(14, 40, 18), outline=BORDER, a=o, r=14)
        cv.text(who.upper(), x + 300, y - 18 + (1 - o) * 10, "b", 14, GREY, o, "lm")
        cv.text(msg, x + 300, y + 22 + (1 - o) * 10, "md", 22, WHITE, o, "lm")
    calls = int(min(14, max(0, (t - 31.6) * 1.15)))
    cv.text("LIGAÇÕES / E-MAILS: %02d" % calls, 1090, 100, "m", 20, AMBER, vis(t, 31.8, 42.5, 0.3, 0.6), "mm")
    # retorno à diretoria
    if t > 42.5:
        o = vis(t, 42.5, 48, 0.5, 0.4)
        cv.rect(190, 530, 1090, 600, fill=(10, 30, 14), outline=GREEN, a=o * 0.0, r=10)
        cv.rect(150, 520, 380, 590, fill=(10, 30, 14), outline=GREEN, a=o, r=10)
        cv.text("OBTENÇÃO", 265, 555, "x", 22, GREEN, o, "mm")
        cv.rect(900, 520, 1130, 590, fill=(10, 30, 14), outline=RED, a=o, r=10)
        cv.text("DIRETORIA", 1015, 555, "x", 22, RED, o, "mm")
        arrow(cv, 395, 555, 885, GREEN, o)
        u = ramp(t, 43.0, 45.5)
        ex = 395 + 460 * u
        cv.rect(ex - 20, 541, ex + 20, 569, fill=WHITE, a=o, r=3)
        cv.draw().polygon([(ex - 20, 541), (ex, 558), (ex + 20, 541)], outline=BG + (int(255 * o),))
        cv.text("pedido de esclarecimento", 640, 510, "r", 18, GREY, o, "mm")
        cv.text("FILA… semanas depois, nenhuma resposta.", 640, 598, "m", 18, RED, ramp(t, 45.6, 46.4) * o, "mm")
    caption(cv, "Pesquisar um preço virou caça ao tesouro.", t, 31.0, 36.0, 100 if False else 680, 26, GREY) if False else None
    caption(cv, "Horas perdidas até perceber: a descrição não basta.", t, 40.0, 43.0, 660, 26, WHITE)
    caption(cv, "Volta à Diretoria. E espera.", t, 43.5, 47.8, 668, 26, WHITE) if False else None


def s4(cv, t):  # 48-62
    rain(cv, t, 0.10)
    kicker(cv, "O TEMPO PASSA", t, 48.3, 62)
    m = int(ramp(t, 48.6, 55.0) * 8)
    cv.text("%d" % m, 330, 300, "k", 220, WHITE if m < 6 else (AMBER if m < 8 else RED), vis(t, 48.6, 61.5, 0.4, 0.5), "mm", glow=8 if m >= 6 else 0)
    cv.text("MESES", 330, 440, "x", 34, GREY, vis(t, 48.8, 61.5, 0.4, 0.5), "mm")
    bar = ramp(t, 48.6, 55.0)
    cv.rect(600, 250, 1180, 270, outline=BORDER, a=vis(t, 48.6, 61.5, .4, .5), r=6)
    cv.rect(603, 253, 603 + 574 * bar, 267, fill=AMBER if bar < 0.8 else RED, a=vis(t, 48.6, 61.5, .4, .5), r=4)
    cv.text("PROCESSO DE OBTENÇÃO", 600, 225, "b", 16, GREY, vis(t, 48.8, 61.5, .4, .5), "lm")

    def stamp(txt, x, y, ang, t0, col):
        if t < t0:
            return
        p = ramp(t, t0, t0 + 0.18)
        sc = 1.5 - 0.5 * p
        lay = Image.new("RGBA", (760, 150), (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        d.rounded_rectangle((8, 8, 752, 142), 10, outline=col + (255,), width=7)
        d.text((380, 76), txt, font=F("k", 50), fill=col + (255,), anchor="mm")
        lay = lay.resize((int(760 * sc), int(150 * sc))).rotate(ang, expand=True, resample=Image.BICUBIC)
        a = vis(t, t0, 61.6, 0.05, 0.5)
        lay.putalpha(lay.getchannel("A").point(lambda v: int(v * a)))
        sh = int(6 * max(0, 1 - (t - t0) * 6) * (1 if int(t * 60) % 2 else -1))
        cv.im.alpha_composite(lay, (int(x - lay.width / 2 + sh), int(y - lay.height / 2 - sh)))

    stamp("ITEM EXCLUÍDO", 830, 370, -5, 55.4, RED)
    stamp("“ACHADO” — ERRADO", 830, 520, 3, 57.8, AMBER)
    caption(cv, "Às vezes se resolve. Às vezes o item é excluído.", t, 50.0, 55.2, 660, 26)
    caption(cv, "Ou pior: é considerado achado… e só se descobre o erro meses depois.", t, 55.4, 61.7, 680, 24)


QLEN = 33.0                      # duração real (s) da sequência de perguntas
EX = QLEN - 6 * K                # tempo extra inserido no vídeo por causa dela
QUEST = [  # (início, fim, texto, cor) em segundos reais dentro da cena
    (1.2, 3.8, "O que fazer?", WHITE),
    (3.9, 8.0, "Jogar o problema\npara a Diretoria?", AMBER),
    (8.1, 11.5, "E se encurtássemos\nos laços?", WHITE),
    (11.6, 18.4, "E se pudéssemos falar com quem entende,\nconhece e vive o item diariamente?", WHITE),
    (18.5, 21.5, "E se houver mais de um?", WHITE),
    (21.6, 25.6, "E se pudéssemos reuni-los\nem um só lugar?", WHITE),
    (25.7, 32.0, "E se as informações valiosas que possuem\ntivessem valor permanente\ne fácil acesso e consulta?", GREEN),
]


def s5(cv, t):  # 62-68 (roteiro) -> QLEN s reais
    tr = (t - 62) / 6 * QLEN
    for k, (a, b, s, c) in enumerate(QUEST):
        o = vis(tr, a, b, 0.5, 0.5)
        if o <= 0:
            continue
        cv.text(s, W / 2, 300 + (1 - o) * 14, "x", 50 if len(s) < 60 else 42, c, o, "mm", glow=6, spacing=12)
        ly = 470
        d = cv.draw()
        if k == 2:      # laços se aproximando
            g = 360 * (1 - ramp(tr, a, b - 1))
            for x in (W / 2 - 40 - g / 2, W / 2 + 40 + g / 2):
                cv.glowcircle(x, ly, 20, GREEN, 0.5 * o, 12)
                d.ellipse((x - 14, ly - 14, x + 14, ly + 14), fill=GREEN + (int(255 * o),))
            d.line((W / 2 - 40 - g / 2, ly, W / 2 + 40 + g / 2, ly), fill=GREEN + (int(255 * o),), width=3)
        elif k in (3, 4):   # quem entende / mais de um
            n = 1 if k == 3 else 3
            for q in range(n):
                person(cv, W / 2 + (q - (n - 1) / 2) * 150, ly + 10, 0.55, GREEN, o * ramp(tr, a + 0.3 + q * 0.5, a + 0.9 + q * 0.5))
        elif k == 5:    # reunir em um só lugar
            u = ramp(tr, a + 0.5, b - 0.8)
            for q in range(5):
                x = W / 2 + (q - 2) * 170 * (1 - u)
                person(cv, x, ly + 10, 0.45, GREEN, o)
            cv.rect(W / 2 - 60, ly + 70, W / 2 + 60, ly + 74, fill=GREEN, a=o * u, r=2)
        elif k == 6:    # valor permanente
            for q in range(4):
                cv.rect(W / 2 - 150 + q * 80, ly - 20 + (3 - q) * 0, W / 2 - 100 + q * 80, ly + 40, fill=(30, 110, 30), outline=GREEN,
                        a=o * ramp(tr, a + 0.6 + q * 0.5, a + 1.1 + q * 0.5), r=6)
    f = ramp(tr, QLEN - 1.6, QLEN - 0.1)
    if f > 0:
        cv.im.alpha_composite(Image.new("RGBA", (W, H), (255, 255, 255, int(255 * f))))


def logo(cv, x, y, s, a):
    magnifier(cv, x - 360 * s, y - 6 * s, 44 * s, a, GREEN, max(4, int(7 * s)))
    cv.text("Detetive Obtenção", x + 50 * s, y, "k", int(70 * s), GREEN, a, "mm", glow=int(14 * s))


def s6(cv, t):  # 68-100
    # intro logo
    lt = t - 68
    if lt < 4.0:
        o = ramp(lt, 0.0, 0.5) * (1 - ramp(lt, 3.4, 4.0))
        cv.glowcircle(W / 2, 330, 260, GREEN, 0.25 * o, 60)
        logo(cv, W / 2, 330, 1.0, o)
        cv.text("MARINHA DO BRASIL", W / 2, 400, "m", 22, WHITE, o * ramp(lt, 0.8, 1.4), "mm")
        cv.text("catálogo dinâmico, retroalimentado pela comunidade", W / 2, 450, "md", 24, GREY, o * ramp(lt, 1.4, 2.0), "mm")
        return
    cv.text("Detetive Obtenção", 50, 44, "x", 20, GREEN, 0.9, "lm")
    cards = [
        ("01", "CATÁLOGO DINÂMICO", "Retroalimentado por quem usa e quem entende do item.\nCada esclarecimento vira memória permanente.", fe1),
        ("02", "CHAMADOS COM CONTEXTO", "Identificam o item, o autor e o meio operacional\n(a dotação) ao qual o material pertence.", fe2),
        ("03", "RESPOSTA RÁPIDA: ÁUDIO, TEXTO OU IMAGEM", "Quem conhece o material responde de onde estiver,\nno formato mais fácil: foto nítida, nota fiscal, manual.", fe3),
        ("04", "FORNECEDORES VALIDADOS", "Indicação de empresas por item — fábrica, fornece ou similar —\nvalidada pela própria comunidade.", fe4),
        ("05", "IA QUE RESUME A DISCUSSÃO", "Discussões longas viram um resumo objetivo,\ncom o que importa para identificar o material.", fe5),
        ("06", "RECONHECIMENTO E PONTUAÇÃO", "Quem contribui pontua e é visto. Os mais engajados\npodem ser escolhidos para funções-chave.", fe6),
        ("07", "SOB SUPERVISÃO DO GERENCIADOR", "Status do chamado — aberto, resolvido, reaberto — e curadoria.\nSeguro, rastreável e atemporal.", fe7),
    ]
    ci = min(6, int((t - 72) // 4))
    if t < 72:
        return
    lt = t - 72 - ci * 4
    num, title, sub, fn = cards[ci]
    o = vis(lt, 0, 4.0, 0.35, 0.3)
    cv.text(num, 60, 120, "k", 110, (20, 70, 20), o, "lm")
    cv.text(title, 60, 215, "x", 34 if len(title) < 30 else 28, GREEN, o, "lm")
    cv.text(sub, 60, 275, "md", 22, WHITE, o, "lm", spacing=10)
    fn(cv, lt, o)
    # progresso
    for i in range(7):
        cv.rect(60 + i * 38, 706, 60 + i * 38 + 28, 710, fill=GREEN if i <= ci else BORDER, r=2)


def panel(cv, x0, y0, x1, y1, o):
    y1 = min(y1, 625)
    cv.rect(x0, y0, x1, y1, fill=(10, 30, 14), outline=BORDER, a=o, r=12)


def fe1(cv, t, o):
    panel(cv, 60, 360, 1220, 660, o)
    items = [("PI 00.000.00-0001", "Válvula esfera — +3 fotos, +1 manual", 12), ("PI 00.000.00-0002", "Junta — +nota fiscal, +2 respostas", 7),
             ("PI 00.000.00-0003", "Filtro — +P/N do fabricante", 19), ("PI 00.000.00-0004", "Mangueira — +aplicação confirmada", 5)]
    for i, (a, b, n) in enumerate(items):
        ap = o * ramp(t, 0.4 + i * 0.4, 0.8 + i * 0.4)
        y = 400 + i * 62
        cv.text(a, 90, y, "m", 18, GREEN, ap, "lm")
        cv.text(b, 380, y, "md", 21, WHITE, ap, "lm")
        cv.text("%d contribuições" % int(n * ramp(t, 0.6 + i * .4, 3.2)), 1190, y, "m", 17, AMBER, ap, "rm")


def fe2(cv, t, o):
    panel(cv, 60, 330, 760, 670, o)
    cv.text("CHAMADO #1042", 90, 365, "m", 20, GREEN, o, "lm")
    cv.text("ABERTO", 730, 365, "b", 16, RED, o * ramp(t, 0, 0.5), "rm")
    f = [("ITEM", "PI 00.000.00-0000 · Válvula esfera"), ("NOME COLOQUIAL", "“registro de purga”"), ("APLICAÇÃO", "Sistema de resfriamento"),
         ("MEIO OPERACIONAL", "Navio-Patrulha (dotação)"), ("ABERTO POR", "Analista · Organização Militar")]
    for i, (k, v) in enumerate(f):
        ap = o * ramp(t, 0.4 + i * 0.4, 0.8 + i * 0.4)
        cv.text(k, 90, 420 + i * 47, "m", 14, GREY, ap, "lm")
        cv.text(v, 330, 420 + i * 47, "md", 20, WHITE, ap, "lm")
    magnifier(cv, 1000, 470, 70, o * ramp(t, 1.0, 1.8))


def fe3(cv, t, o):
    panel(cv, 60, 330, 1220, 670, o)
    # áudio
    cv.text("ÁUDIO", 100, 380, "b", 16, GREEN, o, "lm")
    for i in range(46):
        h = 8 + 52 * abs(math.sin(i * 0.5 + t * 7) * math.sin(i * 0.17 + 1)) * ramp(t, 0.3, 1)
        x = 100 + i * 8
        cv.rect(x, 450 - h, x + 4, 450 + h, fill=GREEN, a=o * 0.9, r=2)
    # texto
    cv.rect(500, 380, 840, 470, fill=(14, 40, 18), outline=BORDER, a=o * ramp(t, 1.0, 1.5), r=12)
    cv.text("TEXTO", 520, 400, "b", 14, GREEN, o * ramp(t, 1.0, 1.5), "lm")
    cv.text("É válvula de 1/2”, rosca BSP.\nJá comprei da empresa X.", 520, 440, "md", 18, WHITE, o * ramp(t, 1.2, 1.8), "lm")
    # imagem
    ip = o * ramp(t, 1.8, 2.4)
    cv.text("IMAGEM", 900, 400, "b", 16, GREEN, ip, "lm")
    cv.rect(900, 420, 1160, 600, fill=(20, 60, 24), outline=GREEN, a=ip, r=8)
    d = cv.draw()
    d.ellipse((990, 460, 1070, 540), outline=GREEN + (int(255 * ip),), width=6)
    d.rectangle((1070, 492, 1130, 508), fill=GREEN + (int(255 * ip),))
    cv.text("foto nítida · nota fiscal · manual", 640, 600, "md", 20, GREY, o * ramp(t, 2.4, 3.0), "mm")


def fe4(cv, t, o):
    panel(cv, 60, 330, 1220, 670, o)
    rows = [("FÁBRICA", "Empresa A Ltda.", "00.000.000/0001-00", 5, GREEN), ("FORNECE", "Empresa B Comércio", "11.111.111/0001-11", 3, AMBER), ("SIMILAR", "Empresa C Ind.", "22.222.222/0001-22", 2, GREY)]
    for i, (tp, nm, cn, v, c) in enumerate(rows):
        ap = o * ramp(t, 0.3 + i * 0.5, 0.8 + i * 0.5)
        y = 400 + i * 85
        cv.rect(90, y - 28, 220, y + 28, outline=c, a=ap, r=8)
        cv.text(tp, 155, y, "b", 17, c, ap, "mm")
        cv.text(nm, 250, y - 10, "b", 22, WHITE, ap, "lm")
        cv.text("CNPJ " + cn, 250, y + 18, "m", 14, GREY, ap, "lm")
        cv.text("%d validações" % int(v * ramp(t, 1.5 + i * .3, 3)), 1180, y, "b", 20, GREEN, ap, "rm")


def fe5(cv, t, o):
    panel(cv, 60, 330, 620, 625, o)
    cv.text("DISCUSSÃO · 47 comentários", 85, 360, "m", 15, GREY, o, "lm")
    for i in range(11):
        w = 200 + (i * 53) % 260
        sh = ramp(t, 1.4, 2.4)
        cv.rect(85, 392 + i * 24 - sh * i * 3, 85 + w * (1 - 0.4 * sh), 404 + i * 24 - sh * i * 3, fill=(35, 90, 38), a=o * (1 - 0.6 * sh), r=3)
    arrow(cv, 640, 500, 720, GREEN, o * ramp(t, 1.2, 1.8))
    ap = o * ramp(t, 2.0, 2.6)
    cv.rect(740, 330, 1220, 625, fill=(10, 30, 14), outline=GREEN, a=ap, r=12, w=3)
    cv.text("RESUMO DA IA", 765, 362, "b", 18, GREEN, ap, "lm")
    lines = ["• Válvula esfera 1/2”, rosca BSP", "• Aço inox, uso em resfriamento", "• Fabricantes A e B conferidos", "• Foto e manual anexados"]
    for i, ln in enumerate(lines):
        cv.text(typed(ln, t, 2.5 + i * 0.45, 34).replace("▌", ""), 765, 415 + i * 52, "md", 20, WHITE, ap, "lm")


def fe6(cv, t, o):
    panel(cv, 60, 330, 1220, 670, o)
    cv.text("RANKING DA COMUNIDADE", 90, 362, "b", 16, GREEN, o, "lm")
    people = [("1º  Contribuidor A", 148), ("2º  Contribuidor B", 121), ("3º  Contribuidor C", 97), ("4º  Contribuidor D", 64)]
    for i, (n, pts) in enumerate(people):
        ap = o * ramp(t, 0.3 + i * 0.3, 0.8 + i * 0.3)
        y = 410 + i * 58
        w = 600 * pts / 148 * ramp(t, 0.6 + i * .3, 2.0)
        cv.rect(90, y - 20, 90 + w, y + 20, fill=(30, 120, 30) if i else GREEN, a=ap, r=6)
        cv.text(n, 100, y, "b", 18, BG if i == 0 else WHITE, ap, "lm")
        cv.text("%d pts" % int(pts * ramp(t, 0.6 + i * .3, 2.0)), 710, y, "m", 18, AMBER, ap, "lm")
    for i, (txt, y) in enumerate([("+2  cada resposta", 420), ("+3  fornecedor indicado", 480), ("+2  informação validada", 540)]):
        ap = o * ramp(t, 1.8 + i * 0.4, 2.3 + i * 0.4)
        cv.text(txt, 1180, y, "b", 22, GREEN, ap, "rm")


def fe7(cv, t, o):
    panel(cv, 60, 330, 1220, 670, o)
    sts = [("ABERTO", RED, 220), ("RESOLVIDO", GREEN, 640), ("REABERTO", AMBER, 1060)]
    for i, (n, c, x) in enumerate(sts):
        ap = o * ramp(t, 0.3 + i * 0.6, 0.9 + i * 0.6)
        cv.rect(x - 110, 420, x + 110, 490, outline=c, a=ap, r=35, w=3)
        cv.text(n, x, 455, "x", 24, c, ap, "mm")
    arrow(cv, 335, 455, 520, GREEN, o * ramp(t, 1.0, 1.5))
    arrow(cv, 755, 455, 940, GREEN, o * ramp(t, 1.6, 2.1))
    cv.text("Gerenciador supervisiona · auditoria de ações · conhecimento atemporal", 640, 580, "md", 22, WHITE, o * ramp(t, 2.2, 2.8), "mm")


def s7(cv, t):  # 100-112
    lt = t - 100
    if lt < 5.5:
        o = vis(lt, 0.2, 5.5, 0.4, 0.5)
        cv.text("ANTES", 360, 150, "k", 28, RED, o, "mm")
        cv.text("meses de espera\ne retrabalho", 360, 250, "x", 40, WHITE, o, "mm")
        cv.text("DEPOIS", 920, 150, "k", 28, GREEN, o * ramp(lt, 1.6, 2.2), "mm")
        cv.text("a resposta já está\nna memória do sistema", 920, 250, "x", 40, WHITE, o * ramp(lt, 1.6, 2.4), "mm")
        cv.draw().line((640, 120, 640, 320), fill=BORDER + (int(255 * o),), width=3)
        caption(cv, "Menos tempo burocrático. Menos itens com problema.", t, 102.2, 105.5, 440, 30, GREEN)
        caption(cv, "Quem entende do item, perto de quem precisa comprar.", t, 103.2, 105.6, 500, 24, GREY) if False else None
    else:
        o = ramp(lt, 5.6, 6.4)
        cv.glowcircle(W / 2, 270, 300, GREEN, 0.22 * o, 70)
        logo(cv, W / 2, 270, 1.1, o)
        cv.text("“Uma ideia que busca o melhor para a Marinha.”", W / 2, 400, "md", 32, WHITE, ramp(lt, 7.0, 8.0), "mm")
        cv.text("PROTÓTIPO  ·  MARINHA DO BRASIL", W / 2, 500, "m", 18, GREY, ramp(lt, 8.5, 9.3), "mm")


def s8(cv, t):  # 112-120  encerramento institucional
    lt = t - 112
    cv.glowcircle(W / 2, 330, 280, GREEN, 0.14 * ramp(lt, 0.3, 1.5), 70)
    o = ramp(lt, 0.4, 1.4)
    cv.text("CENTRO DE OPERAÇÕES\nDO ABASTECIMENTO", W / 2, 320 + (1 - o) * 14, "k", 54, WHITE, o, "mm", glow=5, spacing=10)
    cv.rect(W / 2 - 90, 405, W / 2 + 90, 407, fill=GREEN, a=ramp(lt, 1.4, 2.2), r=1)
    cv.text("A qualquer problema, há esforço em busca de soluções", W / 2, 440, "r", 20, GREY, ramp(lt, 2.0, 3.0), "mm")


SUBS = [
    (0.8, 4.0, "Terça-feira, 15h42. Na Gerência de Obtenção, mais um sobressalente para comprar."),
    (4.2, 8.0, "A descrição tem uma linha só: sem diâmetro, sem fabricante, sem referência, sem foto."),
    (8.2, 11.9, "E não é um caso isolado: são milhares de itens assim."),
    (12.4, 16.0, "Tudo começa nos navios, que enviam suas demandas de sobressalentes."),
    (16.2, 20.5, "A Diretoria, especialista no material, cataloga cada item para que possa ser comprado."),
    (20.8, 25.0, "Mas são milhares de itens, cada um com especificações detalhadas e diferentes."),
    (25.2, 29.8, "Manter cada descrição atualizada e enriquecida é, na prática, impossível."),
    (30.4, 34.0, "Na ponta, o analista da obtenção sai atrás de preços e começa pelo comércio."),
    (34.2, 38.0, "“Não conheço.” “Tenho 20 itens que podem ser esse.” Sempre falta informação."),
    (38.2, 42.5, "Horas depois, ele percebe: a descrição simplesmente não basta."),
    (42.8, 47.8, "Volta à Diretoria com a dúvida e entra na fila de um órgão sobrecarregado."),
    (48.4, 52.0, "Os dias viram semanas, as semanas viram meses, e a compra segue parada."),
    (52.2, 56.5, "Às vezes o problema se resolve. Às vezes o item é simplesmente excluído."),
    (56.8, 61.8, "Ou pior: é dado como achado, e só meses depois se descobre o erro."),
    (68.4, 71.9, "Esta é a ideia do Detetive Obtenção: um catálogo dinâmico, feito pela comunidade."),
    (72.2, 75.9, "Cada esclarecimento vira memória permanente, ligada ao item."),
    (76.2, 79.9, "Cada chamado identifica o item, o autor e o meio operacional a que pertence."),
    (80.2, 83.9, "Quem entende do material responde rápido: por áudio, texto ou imagem."),
    (84.2, 87.9, "Fornecedores são indicados por item e validados pela própria comunidade."),
    (88.2, 91.9, "E a inteligência artificial resume discussões longas no que realmente importa."),
    (92.2, 95.9, "Quem contribui pontua e é reconhecido, e pode ser escolhido para funções-chave."),
    (96.2, 99.9, "Tudo sob a supervisão do gerenciador, de forma rastreável e atemporal."),
    (100.4, 105.4, "Menos tempo burocrático. Menos itens com problema na pesquisa."),
    (105.9, 111.6, "Aproximando quem entende do item de quem precisa comprá-lo."),
]


def subtitle(cv, t):
    import textwrap
    for a, b, s in SUBS:
        if a <= t <= b:
            o = min(1.0, (t - a) / (0.25 / K), (b - t) / (0.25 / K))
            lines = textwrap.wrap(s, 72)
            txt = "\n".join(lines)
            h = 24 + 36 * len(lines)
            y0 = 700 - h
            cv.rect(W / 2 - 580, y0, W / 2 + 580, 700, fill=(0, 0, 0), a=0.62 * o, r=10, w=0)
            cv.text(txt, W / 2, y0 + h / 2, "md", 27, WHITE, o, "mm", spacing=8)
            return


def srt(path):
    def f(x):
        x = x * K + (EX if x >= 68 else 0)
        return "%02d:%02d:%02d,%03d" % (x // 3600, x % 3600 // 60, x % 60, int(x % 1 * 1000))
    with open(path, "w", encoding="utf-8") as fh:
        for i, (a, b, s) in enumerate(SUBS, 1):
            fh.write("%d\n%s --> %s\n%s\n\n" % (i, f(a), f(b), s))


SCENES = [(0, 12, s1), (12, 30, s2), (30, 48, s3), (48, 62, s4), (62, 68, s5), (68, 100, s6), (100, 112, s7), (112, 120, s8)]


def render(fi):
    tr = fi / FPS
    s0 = 62 * K
    if tr < s0:
        t = tr / K
    elif tr < s0 + QLEN:
        t = 62 + (tr - s0) / QLEN * 6
    else:
        t = 68 + (tr - s0 - QLEN) / K
    cv = Cv()
    for a, b, fn in SCENES:
        if a <= t < b:
            fn(cv, t)
            fade = min(1.0, (t - a) / 0.35) if a not in (68, 0) else 1.0
            fade_out = min(1.0, (b - t) / 0.3) if b not in (68, 100) else 1.0
            cv_alpha = min(fade, fade_out)
            break
    else:
        cv_alpha = 1.0
    subtitle(cv, t)
    im = np.asarray(cv.im.convert("RGB"), dtype=np.float32)
    # pós: tremor / glitch em transições e tensão
    seed = np.random.default_rng(fi)
    shake = 0
    for tt in (12, 30, 48, 55.4, 57.8, 68, 100):
        if 0 <= t - tt < 0.25:
            shake = int(14 * (1 - (t - tt) / 0.25))
    if shake:
        im = np.roll(im, (seed.integers(-shake, shake + 1), seed.integers(-shake, shake + 1)), (0, 1))
        im[:, :, 0] = np.roll(im[:, :, 0], shake, 1)
        im[:, :, 2] = np.roll(im[:, :, 2], -shake, 1)
    yy, xx = np.mgrid[0:H, 0:W]
    vig = 1 - 0.55 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) ** 1.1 * 0.7
    im *= vig[..., None]
    im *= (0.94 + 0.06 * np.sin(yy * math.pi / 1.5))[..., None]            # scanlines sutis
    im += seed.standard_normal((H, W, 1)).astype(np.float32) * 5          # grão
    im *= cv_alpha
    return np.clip(im, 0, 255).astype(np.uint8)


def main():
    srt(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'legendas.srt'))
    if len(sys.argv) > 3:
        os.makedirs("previa", exist_ok=True)
        for tt in sys.argv[3:]:
            Image.fromarray(render(int(float(tt) * FPS))).save("previa/t%s.png" % tt)
        return
    wav, out = sys.argv[1], sys.argv[2]
    ff = subprocess.Popen(["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
                           "-i", wav, "-c:v", "libx264", "-preset", "medium", "-crf", "21", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
                           "-shortest", "-movflags", "+faststart", out], stdin=subprocess.PIPE)
    with Pool(4) as p:
        for i, fr in enumerate(p.imap(render, range(int(DUR * FPS)), chunksize=8)):
            ff.stdin.write(fr.tobytes())
            if i % 300 == 0:
                print(i, flush=True)
    ff.stdin.close()
    ff.wait()


if __name__ == "__main__":
    main()
