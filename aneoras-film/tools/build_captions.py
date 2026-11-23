# Generates compositions/captions.html from the script (subtitle stand-in for the voiceover).
import re, html
SCENES = [
 (0.3, 6.7, ["Derrière chaque organisation,", "il existe un potentiel", "qui ne demande qu’à être révélé."]),
 (7.2, 12.2, ["Alors, comment transformer ce potentiel", "en véritable levier de développement ?"]),
 (12.6, 15.3, ["C’est précisément notre ambition."]),
 (15.7, 26.2, ["À vos côtés, nous prenons le temps", "de comprendre vos enjeux,", "accompagner vos réflexions", "et construire avec vous les réponses", "aux défis d’aujourd’hui et de demain."]),
 (26.7, 37.2, ["De la stratégie à l’action,", "notre mission est de faire évoluer les compétences", "et de réinventer les façons d’apprendre,", "de transmettre et de travailler ensemble."]),
 (37.7, 48.5, ["Nous mobilisons le conseil, la formation", "et les technologies", "pour faire progresser les organisations,", "valoriser leurs savoirs", "et inscrire leurs ambitions", "dans une dynamique de performance durable."]),
 (49.1, 58.2, ["Pour les entreprises privées,", "nous structurons et digitalisons les processus,", "tout en facilitant la transmission des savoir-faire", "et le développement des compétences."]),
 (58.7, 69.7, ["Pour les organisations éducatives,", "nous concevons des formations sur-mesure,", "modernisons les parcours pédagogiques", "et déployons des environnements digitaux", "pour enrichir les apprentissages", "et en mesurer la progression."]),
 (70.2, 81.2, ["Nous croyons à une technologie", "qui amplifie le potentiel humain.", "Une intelligence artificielle qui assiste,", "une expertise qui guide,", "et une innovation qui ouvre", "de nouvelles perspectives."]),
 (81.7, 87.2, ["Parce que la connaissance prend toute sa valeur", "lorsqu’elle devient une capacité d’agir."]),
]
def chunks(text):
    words = text.split()
    out, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        nxt_short = len(words) - i - 1 <= 2
        if (len(cur) >= 4 and re.search(r"[,.?!;:]$", w) and not nxt_short) or len(cur) >= 9:
            out.append(cur); cur = []
    if cur:
        if out and len(cur) <= 2: out[-1] += cur
        else: out.append(cur)
    # keep "?" glued to its word
    res = []
    for c in out:
        s = " ".join(c).replace(" ?", " ?")
        res.append(s)
    return res
groups = []
for a, b, text in SCENES:
    cs = [c.replace(" ?", "\u00a0?") for c in text]
    weights = [len(c.split()) + 1.5 for c in cs]
    tot = sum(weights); t = a
    for c, wgt in zip(cs, weights):
        d = (b - a) * wgt / tot
        groups.append((round(t, 2), round(t + d - 0.05, 2), c)); t += d
divs, js = [], []
for i, (s, e, c) in enumerate(groups):
    divs.append(f'    <div id="cap-{i}" class="cap" data-layout-allow-caption-zone><span>{html.escape(c)}</span></div>')
    js.append(f'      [{s}, {e}],')
out = f'''<template>
  <style>
    #root {{ position: absolute; inset: 0; pointer-events: none; font-family: var(--font); }}
    .cap {{ position: absolute; left: 0; bottom: 74px; width: 1920px; text-align: center; overflow: visible; opacity: 0; visibility: hidden; }}
    .cap span {{ display: inline-block; max-width: 1500px; padding: 10px 26px 12px; border-radius: 6px; background: rgba(5, 37, 78, 0.86); color: #ffffff; font-weight: 500; font-size: 34px; line-height: 1.3; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="1920" data-height="1080">
{chr(10).join(divs)}
  </div>
  <script>
    (function () {{
      const times = [
{chr(10).join(js)}
      ];
      const tl = gsap.timeline({{ paused: true }});
      let show = true;
      try {{ const v = window.__hyperframes && window.__hyperframes.getVariables && window.__hyperframes.getVariables(); if (v && v.subtitles === false) show = false; }} catch (e) {{}}
      times.forEach(([s, e], i) => {{
        const g = "#cap-" + i;
        if (!show) return;
        tl.set(g, {{ visibility: "visible" }}, s);
        tl.fromTo(g, {{ opacity: 0 }}, {{ opacity: 1, duration: 0.15, ease: "power2.out", immediateRender: false }}, s);
        tl.to(g, {{ opacity: 0, duration: 0.12, ease: "power2.in" }}, e - 0.12);
        tl.set(g, {{ opacity: 0, visibility: "hidden" }}, e);
      }});
      window.__timelines["captions"] = tl;
    }})();
  </script>
</template>
'''
open("compositions/captions.html", "w").write(out)
for g in groups: print(g)
