# Diario de Trading v7

Versión pensada para subir directamente a GitHub y desplegar en GitHub Pages.

## Estructura

- `index.html`
- `styles.css`
- `app.js`
- `README.md`

## Funciones incluidas

- Capital actual dinámico
- P/L realizado y flotante
- Capital invertido abierto = cantidad × precio actual
- Riesgo abierto = distancia a stop × cantidad
- Operaciones abiertas y cerradas
- Razones de entrada y salida personalizadas
- Guardado local con `localStorage`
- Exportación e importación JSON
- Edición y borrado de operaciones
- Preparado para GitHub Pages, sin backend

## Fórmulas clave

### Capital actual

```text
capital actual = capital inicial + P/L realizado + P/L flotante
```

### Capital invertido abierto

```text
capital invertido abierto = suma(cantidad × precio actual) de las operaciones abiertas
```

### Riesgo abierto

En largos:

```text
riesgo abierto = (entrada - stop) × cantidad
```

En cortos:

```text
riesgo abierto = (stop - entrada) × cantidad
```

## Cómo subirlo a GitHub

1. Crea un repositorio nuevo en GitHub.
2. Sube estos 4 archivos a la raíz del repositorio.
3. En GitHub entra en **Settings > Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**.
5. Elige la rama `main` y la carpeta `/root`.
6. Guarda los cambios.
7. GitHub te dará la URL pública de la app.

## Nota

Los datos se guardan en el navegador del dispositivo desde el que abras la app. Si cambias de navegador o de móvil/PC, no aparecerán salvo que antes exportes el JSON y luego lo importes.
