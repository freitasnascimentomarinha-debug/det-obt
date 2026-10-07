"""Trilha sonora sintetizada (suspense -> ação) para o vídeo do Detetive Obtenção.
Tudo gerado por síntese com numpy: sem samples externos, sem direitos autorais."""
import numpy as np, wave, sys

SR = 44100
K = 1.4  # fator de desaceleração (mesmo do vídeo)
QLEN = 33.0
EX = QLEN - 6 * K   # tempo extra das perguntas (igual ao vídeo)
DUR = 120.0 * K + EX
N = int(SR * DUR)
rng = np.random.default_rng(7)
L = np.zeros(N, np.float32)
R = np.zeros(N, np.float32)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def put(sig, t0, pan=0.0, gain=1.0, raw=False):
    i = int(((t0 + EX) if raw else t0 * K) * SR)
    if i >= N:
        return
    s = sig[: N - i] * gain
    L[i:i + len(s)] += s * (1 - max(pan, 0))
    R[i:i + len(s)] += s * (1 + min(pan, 0))


def env(n, a, d, s, r):
    e = np.ones(n, np.float32)
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    a = min(a, n)
    e[:a] = np.linspace(0, 1, a, endpoint=False) if a else 1
    dd = min(d, n - a)
    e[a:a + dd] = np.linspace(1, s, dd)
    e[a + dd:] = s
    r = min(r, n)
    if r:
        e[n - r:] *= np.linspace(1, 0, r)
    return e


def saw(f, dur, harm=14, det=0.0):
    t = np.arange(int(dur * SR)) / SR
    out = np.zeros_like(t, dtype=np.float32)
    for k in range(1, harm + 1):
        if f * k > 9000:
            break
        out += np.sin(2 * np.pi * f * (1 + det) * k * t + k) / k
    return out * 0.5


def lp_noise(n, k):
    """ruído passa-baixa por média móvel (barato)"""
    x = rng.standard_normal(n + k).astype(np.float32)
    c = np.cumsum(x)
    return (c[k:] - c[:-k]) / k * (k ** 0.5) * 0.5 if False else (c[k:] - c[:-k]) / np.sqrt(k)


def kick(dur=0.35):
    t = np.arange(int(dur * SR)) / SR
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 9)).astype(np.float32)


def snare(dur=0.22):
    t = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal(len(t)).astype(np.float32)
    n = n - np.convolve(n, np.ones(6) / 6, "same")  # passa-alta grosseiro
    return (n * np.exp(-t * 20) * 0.7 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.5).astype(np.float32)


def hat(dur=0.05):
    t = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal(len(t)).astype(np.float32)
    n = n - np.convolve(n, np.ones(4) / 4, "same")
    return (n * np.exp(-t * 90) * 0.4).astype(np.float32)


def tick(dur=0.06, f=1800):
    t = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 70) + 0.3 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t * 110)).astype(np.float32)


def heart(dur=0.4):
    t = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * 52 * t) * np.exp(-t * 14)).astype(np.float32)


def hit(dur=3.0):
    t = np.arange(int(dur * SR)) / SR
    n = lp_noise(len(t), 40) * np.exp(-t * 2.2)
    sub = np.sin(2 * np.pi * 38 * t * np.exp(-t * 0.25)) * np.exp(-t * 1.6)
    return (n * 0.9 + sub * 1.2).astype(np.float32)


def riser(dur, f0=200, f1=2400):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.5 * np.sin(ph * 1.5) + 0.4 * (rng.standard_normal(n) * 0.2)
    return (s * (t / dur) ** 2).astype(np.float32)


def pad(notes, dur, vol=0.12):
    out = np.zeros(int(dur * SR), np.float32)
    for m in notes:
        for d in (-0.004, 0.004):
            out += saw(mtof(m), dur, harm=9, det=d)
    out *= env(len(out), 2.0, 0.5, 0.8, 2.5)
    return out * vol / len(notes)


# ---------- 0-12s: abertura (chuva + drone + coração) ----------
rain = lp_noise(N, 3) * 0.05
rain *= np.clip(np.interp(np.arange(N) / SR, [0, 2, 56 * K, 62 * K, 62 * K + QLEN], [0, 1, 1, 0.3, 0]), 0, 1)
L += rain
R += np.roll(rain, 997)
put(pad([33, 40, 45], 14 * K, 0.55), 0)                    # A1 E2 A2
put(pad([33, 40, 44, 45], 20 * K, 0.5), 12)                # tensão
put(pad([31, 38, 43, 46], 20 * K, 0.55), 30)               # mais sombrio
put(pad([30, 37, 42, 45, 49], 18 * K, 0.6), 48)            # dissonante

for t0 in np.arange(2, 12, 1.4):                        # batimento esparso
    put(heart(), t0, 0, 0.9)
    put(heart(), t0 + 0.28, 0, 0.6)
# toques de piano/sino isolados (nota fria)
for t0, m in [(5.0, 69), (7.0, 72), (9.2, 68), (10.5, 64)]:
    tt = np.arange(int(2.5 * SR)) / SR
    bell = (np.sin(2 * np.pi * mtof(m) * tt) + 0.4 * np.sin(2 * np.pi * mtof(m) * 2.01 * tt)) * np.exp(-tt * 2.2)
    put(bell.astype(np.float32), t0, 0.4, 0.22)

# ---------- 12-62s: investigação / pressão crescente ----------
put(hit(), 12.0, 0, 0.9)
bass_seq = [33, 33, 36, 33, 33, 38, 36, 33]
for bar in np.arange(14, 62, 0.5):
    prog = (bar - 14) / 48
    step = int((bar - 14) / 0.5) % 8
    m = bass_seq[step] - (2 if bar > 38 else 0)
    d = 0.3
    s = saw(mtof(m), d, 10) * env(int(d * SR), 0.005, 0.1, 0.5, 0.08)
    put(s, bar, 0, 0.10 + 0.18 * prog)
# relógio / tique-taque (30-62)
for k, t0 in enumerate(np.arange(30, 62, 0.5)):
    put(tick(f=1700 if k % 2 == 0 else 1300), t0, 0.5 if k % 2 else -0.5, 0.25 + 0.15 * (t0 - 30) / 32)
# batimento acelera a partir de 48
t0, gap = 48.0, 0.9
while t0 < 61.5:
    put(heart(), t0, 0, 0.9)
    put(heart(), t0 + 0.2, 0, 0.6)
    t0 += gap
    gap = max(0.38, gap * 0.93)
# hits de transição
put(hit(), 30.0, 0, 0.8)
put(hit(), 48.0, 0, 0.85)
put(riser(13), 35.0, 0, 0.0)  # (reservado)
put(riser(6), 56.0, 0, 0.35)

# ---------- 62-68s: sequência de perguntas (QLEN s): vácuo que se enche de tensão ----------
S0 = 62 * K
putr = lambda *a, **k: put(*a, raw=True, **k)
RAWS = lambda t: t - EX            # inverte o deslocamento para posicionar em tempo absoluto
putabs = lambda sig, t, pan=0.0, gain=1.0: put(sig, RAWS(t), pan, gain, raw=True)
putabs(pad([30, 37, 42, 45, 49], QLEN + 2, 0.5), S0)
t0, gap = S0 + 1.0, 1.15
while t0 < S0 + QLEN - 1.2:
    putabs(heart(), t0, 0, 1.0)
    putabs(heart(), t0 + 0.22, 0, 0.6)
    t0 += gap
    gap = max(0.42, gap * 0.955)
for t0 in np.arange(S0 + 12, S0 + QLEN - 1.5, 0.5):
    putabs(tick(f=1500), t0, 0.4, 0.18)
for a_ in (1.2, 3.9, 8.1, 11.6, 18.5, 21.6, 25.7):      # toque grave em cada pergunta
    tt = np.arange(int(2.0 * SR)) / SR
    putabs((np.sin(2 * np.pi * 55 * tt) * np.exp(-tt * 3)).astype(np.float32), S0 + a_, 0, 0.35)
putabs(riser(QLEN - 1.5, 150, 3800), S0 + 0.5, 0, 0.35)

# ---------- 68-100s: AÇÃO ----------
BPM = 132
q = 60 / BPM
putr(hit(4.0), 68.0 * K, 0, 1.0)
putr(kick(0.5), 68.0 * K, 0, 1.2)
arp = [45, 52, 57, 60, 57, 52, 48, 55, 60, 64, 60, 55]  # Am / C
chords = [[45, 52, 57], [41, 48, 53], [48, 55, 60], [43, 50, 55]]
t_start, t_end = 68.0 * K, 100.0 * K
nbars = int((t_end - t_start) / (q * 4))
for b in range(nbars):
    b0 = t_start + b * q * 4
    ch = chords[b % 4]
    for st in range(16):
        t0 = b0 + st * q / 4
        # baixo pulsante
        root = ch[0] - 12
        s = saw(mtof(root), q / 4 * 0.95, 12) * env(int(q / 4 * 0.95 * SR), 0.003, 0.05, 0.6, 0.03)
        putr(s, t0, 0, 0.22)
        # arpejo (entra no compasso 3)
        if b >= 2:
            m = ch[st % 3] + 12 * (1 + (st // 6 % 2))
            a = saw(mtof(m), q / 4 * 1.4, 7) * env(int(q / 4 * 1.4 * SR), 0.002, 0.05, 0.4, 0.06)
            putr(a, t0, (-0.4 if st % 2 else 0.4), 0.10)
        # hats
        if st % 2 == 0 or b >= 4:
            putr(hat(), t0, 0.2, 0.5 if st % 4 else 0.8)
    for beat in range(4):
        putr(kick(), b0 + beat * q, 0, 1.0)
    putr(snare(), b0 + q, 0, 0.7)
    putr(snare(), b0 + 3 * q, 0, 0.7)
    if b >= 4:
        putr(snare(0.15), b0 + 3.5 * q, 0, 0.5)
    # pad / stab heroico
    putr(pad([c + 12 for c in ch], q * 4, 0.35), b0)
    # a cada 4 compassos, um crash de ruído
    if b % 4 == 0 and b > 0:
        putr(hit(2.0), b0, 0, 0.45)

# ---------- 100-112s: resolução (acorde maior, esperança) ----------
putr(hit(5.0), 100.0 * K, 0, 1.0)
putr(kick(0.6), 100.0 * K, 0, 1.2)
putr(pad([45, 52, 57, 61, 64, 69], 20 * K, 1.4), 100.0 * K)
for i, (t0, m) in enumerate([(101.0, 76), (102.2, 73), (103.4, 69), (105.0, 76), (106.5, 81)]):
    t0 *= K
    tt = np.arange(int(3.5 * SR)) / SR
    b = (np.sin(2 * np.pi * mtof(m) * tt) + 0.35 * np.sin(2 * np.pi * mtof(m) * 2.0 * tt)) * np.exp(-tt * 1.4)
    putr(b.astype(np.float32), t0, -0.3 if i % 2 else 0.3, 0.28)
putr(hit(6.0), 109.0 * K, 0, 0.5)

# ---------- reverb simples por convolução FFT ----------
def reverb(x, secs=1.6, wet=0.22):
    n = int(secs * SR)
    ir = rng.standard_normal(n).astype(np.float32) * np.exp(-np.arange(n) / SR * 3.2)
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    y /= np.max(np.abs(y)) + 1e-9
    return x + wet * y * np.max(np.abs(x))

L = reverb(L)
R = reverb(R)

# fades e normalização
fade = np.ones(N, np.float32)
fade[:SR] = np.linspace(0, 1, SR)
fade[-2 * SR:] = np.linspace(1, 0, 2 * SR)
L *= fade
R *= fade
peak = max(np.max(np.abs(L)), np.max(np.abs(R)))
L, R = L / peak * 0.89, R / peak * 0.89
# compressão suave
L, R = np.tanh(L * 1.3) / np.tanh(1.3), np.tanh(R * 1.3) / np.tanh(1.3)

pcm = (np.stack([L, R], 1) * 32767).astype("<i2")
out = sys.argv[1] if len(sys.argv) > 1 else "trilha.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print("ok", out, DUR, "s")
