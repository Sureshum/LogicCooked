# 🧊 LogicCooked 3D

**Arcade 3D de Conjuntos y Lógica Proposicional.**

LogicCooked 3D es un pequeño arcade educativo hecho con **Three.js** y **Tailwind CSS**.
Exploras un **patio de juegos libre** en 3D y desde ahí eliges el reto que quieras jugar:
cocina operaciones de conjuntos, dispara a la respuesta correcta de lógica proposicional o
tiende cables entre expresiones y sus equivalencias formales.

Pensado para practicar matemática discreta (teoría de conjuntos) y lógica proposicional
de forma visual y divertida.

🔗 **Juega aquí:** https://sureshum.github.io/LogicCooked/

---

## 🎮 Modos de juego

### 0. Patio (hub)
Explora libremente el patio con **WASD**. Acércate a una zona y pulsa **E** para entrar.
Aquí también encuentras el **Vestidor** y a los **personajes escondidos** que desbloquean skins.

### 1. Cocina 3D (Conjuntos)
Inspirado en *Overcooked*. Cada **comanda** pide una operación de conjuntos:
`A ∪ B`, `A ∩ B`, `A − B`, `A Δ B`, `(A ∪ B)'`…
Reúne los ingredientes (elementos) correctos, móntalos en el plato y entrégalo.
Tiene **dificultad** (Fácil / Normal / Difícil) y **tiempo de ronda** (60s / 120s / 180s).

### 2. Aim 3D (Lógica Proposicional)
Estilo *Duck Hunt*. Aparece una fórmula lógica sobre un pato/objetivo y debes **disparar la
respuesta correcta**: negación, unión, intersección, tautología, contradicción, leyes de
De Morgan, absorción, etc.

### 3. Conecta (Equivalencias)
Estilo *cables lógicos*. Enlaza cada expresión de la izquierda con su **equivalencia formal**
de la derecha (por ejemplo, `(A ∪ B)'` con `A' ∩ B'` — Ley de De Morgan).

---

## ⌨️ Controles

| Acción | Tecla |
| --- | --- |
| Caminar | `W A S D` |
| Interactuar / entrar a zona | `E` |
| Entregar plato (Cocina) | `Espacio` |
| Disparar (Aim) | Clic |

En la pantalla de inicio puedes además **arrastrar el Sol/Luna** para cambiar entre día y noche.

---

## 👕 Vestidor y desbloqueables

Hay varios personajes escondidos en las esquinas del patio. **Háblales con `E`** para
desbloquearlos como skins:

- 67
- 🐻 Oso
- 🐺 Lobo
- 🐱 Gato
- 🪵 Tung Tung Tung Sahur

Una vez desbloqueados aparecen disponibles en el **Vestidor**.

---

## 🏆 Puntuaciones

Cada modo tiene su propio **Top 10**, separado por dificultad y tiempo. Escribe tu nombre al
entrar para aparecer en la clasificación (se guarda en `localStorage`).

---

## 📶 Jugar sin conexión (offline / PWA)

El juego funciona **sin wifi después de la primera carga**.

- Todas las librerías (**Three.js**, **Tailwind**, **Font Awesome** y las **fuentes**) están
  incluidas localmente en `vendor/`, así que no depende de ningún CDN.
- Incluye un **Service Worker** (`sw.js`) y un **manifest** (`manifest.webmanifest`): la primera
  visita guarda todo en caché y las siguientes funcionan offline. También se puede **instalar
  como app** desde el navegador.

> La música de fondo usa YouTube y **no** está disponible offline (se reproduce si hay conexión).

---

## 🛠️ Tecnologías

- [Three.js](https://threejs.org/) r128 — motor 3D (WebGL).
- [Tailwind CSS](https://tailwindcss.com/) — interfaz.
- [Font Awesome](https://fontawesome.com/) — iconos.
- Google Fonts (Fredoka, JetBrains Mono, Press Start 2P, Silkscreen, VT323).
- JavaScript vanilla + Web Audio API para los efectos de sonido.
- Service Worker + Web App Manifest (PWA).

---

## 📁 Estructura

```
LogicCooked/
├── index.html              # Estructura, HUD y modales
├── manifest.webmanifest    # Metadatos PWA
├── sw.js                   # Service Worker (offline)
├── src/
│   ├── game.js             # Motor del juego y escenas 3D
│   ├── landing.js          # Pantalla de inicio y nombre de jugador
│   └── style.css           # Estilos y fondos pixel-art
└── vendor/                 # Dependencias locales (offline)
    ├── three.min.js
    ├── tailwind.min.js
    ├── fontawesome/
    └── fonts/
```

---

## ▶️ Ejecutar en local

Puedes abrir `index.html` directamente en el navegador (funciona sin servidor gracias a las
dependencias locales), pero para probar el **Service Worker** se recomienda un servidor:

```bash
# Python
python -m http.server 8080

# o Node
npx serve .
```

Luego abre `http://localhost:8080`.

---

## 👤 Autor

**Sureshum** — [GitHub](https://github.com/Sureshum) · ssshum25@gmail.com

Si te gusta el proyecto, ¡dale una ⭐!
