# Jahir Sánchez Centella — Portafolio Interactivo 3D

Portafolio interactivo 3D en Three.js y Cannon.js donde conduces un vehículo a lo largo de una ruta escénica otoñal con curvas, pendientes, cercado delimitador y estaciones interactivas para explorar los proyectos, habilidades e investigaciones de **Jahir Eliecer Sánchez Centella** (Ingeniero en Sistemas Computacionales — UTP Azuero).

---

## Características Principales

1. **Recorrido 3D con Físicas Estables (Cannon.js + Three.js)**:
   - Carretera escénica curva con colinas, valle intermedio y cercas de madera con colisionadores que delimitan el corredor.
   - Entorno otoñal poblado con pasto 3D instanciado, árboles variados, arbustos, rocas, troncos, flores silvestres, faroles y hojas flotantes.
   - Conducción suave al ras del terreno con inclinación por pendiente, faros proyectados, derrape y bolos tecnológicos derribables.
   - Zoom de cámara controlado con la rueda del ratón y botones en pantalla.

2. **Audio Sintetizado (Web Audio API)**:
   - Motor dinámico, chirrido en derrapes, claxon, turbo y campana de llegada sin archivos externos pesados.

3. **Estaciones del Recorrido**:
   - **Arco de Salida & Controles**: Presentación inicial, controles y mapa completo de hitos.
   - **Zona de Bolos Tecnológicos**: 10 bloques físicos (*Vercel, Cloudflare, SQL Server, Antigravity, Codex, React, Node.js, Python, Linux, Docker*).
   - **Control Ganadero Pro (v2.5)**: [controlganadero-mu.vercel.app](https://controlganadero-mu.vercel.app/)
   - **MiAliado (SIGC)**: [mialiado.click](https://mialiado.click/)
   - **Portal Kelme Latam Hub**: Plataforma mayorista B2B.
   - **ErgoIA**: Visión artificial para salud laboral.
   - **Lengua de Señas Panameña**: Proyecto galardonado en JIC UTP 2025.
   - **Formación & Meta Final**: Samsung Innovation Campus (200h) y contacto directo.

4. **HUD, Modo CV Imprimible y Consola DevTools**:
   - Minimapa radar curvo en tiempo real y barra de viaje rápido.
   - **Modo CV / Texto**: Vista de hoja de vida completa optimizada para **Imprimir / Guardar PDF** (`@media print` limpio en blanco y negro/alto contraste).
   - **Consola (`F12`)**: Al abrir DevTools se muestra una ficha decorada de la hoja de vida en la consola.

---

## Controles

| Tecla / Acción | Función |
| :--- | :--- |
| `W` / `↑` | Acelerar |
| `S` / `↓` | Frenar / Reversa |
| `A` / `D` o `←` `→` | Dirección |
| `Espacio` | Freno de mano / Derrape / Claxon |
| Ruedita del ratón | Zoom acercar / alejar |
| `H` | Claxon |
| `R` | Reiniciar posición |
| `F12` | Ver resumen de hoja de vida en consola |

---

## Ejecución Local

```bash
npx serve .
# o con Python
python3 -m http.server 3000
```

Abrir en el navegador: `http://localhost:3000`.

---

## Despliegue en Vercel

El proyecto ya incluye [vercel.json](./vercel.json), [.vercelignore](./.vercelignore) y [.gitignore](./.gitignore) configurados para despliegue estático directo desde la raíz (`.`) con cabeceras de seguridad y caché optimizada:

### Opción A: Desde GitHub + Dashboard de Vercel
1. Inicializa o sube el repositorio a GitHub:
   ```bash
   git init
   git add .
   git commit -m "chore: prepare portfolio for Vercel deployment"
   git branch -M main
   git remote add origin <URL-DE-TU-REPO>
   git push -u origin main
   ```
2. Entra a [vercel.com](https://vercel.com), haz clic en **Add New Project**, importa tu repositorio y presiona **Deploy** (Vercel detectará automáticamente `vercel.json` sin necesidad de build adicional).

### Opción B: Directamente desde la terminal con Vercel CLI
```bash
npx vercel --prod
```
