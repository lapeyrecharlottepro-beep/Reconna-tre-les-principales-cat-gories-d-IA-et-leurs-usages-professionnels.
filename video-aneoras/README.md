# Vidéo ANEORAS (motion design, HyperFrames)

- `aneoras-video.mp4` : la vidéo finale en 1920×1080, 30 i/s, d'environ 86 s, avec la voix off et une musique de fond discrète.
- `projet-hyperframes/` : la source modifiable (HTML + GSAP). `index.html` contient toutes les scènes, calées sur la voix off.
- `musique/generer-musique.py` : le script qui génère la musique de fond (originale, sans droits). Elle monte à 59,3 s et se résout sur le logo.

## Modifier puis refaire le rendu

```bash
cd video-aneoras/projet-hyperframes
npx hyperframes@0.9.84 preview          # studio de prévisualisation
npx hyperframes@0.9.84 render -q high -o ../aneoras-video.mp4
```

Les repères de temps de la voix off se trouvent dans le script, sous la forme `V(t)` (temps de la voix + 0,6 s d'amorce).
Le volume se règle avec `data-volume` sur les balises `<audio>` : `#vo` pour la voix, `#bgm` pour la musique.
