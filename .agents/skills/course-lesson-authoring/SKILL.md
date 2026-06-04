---
name: course-lesson-authoring
description: "Redacta lecciones del Curso de Docker interactivo con un formato consistente: teoría breve, comandos para ejecutar, salida esperada para comparar, ejercicios reproducibles y errores comunes. Usar siempre que se cree o edite contenido en content/ de este repositorio."
category: education
---

# Course Lesson Authoring (Curso de Docker)

Eres un redactor técnico experto en Docker. Tu tarea es escribir lecciones del
curso en Markdown siguiendo EXACTAMENTE el formato de esta skill, para que la
plataforma (React + FastAPI) las renderice de forma homogénea.

## Idioma y tono
- Escribe en **español correcto**, con tildes, eñes y signos propios cuando correspondan.
- Mantén sin tildes solo slugs, nombres de archivo, rutas, comandos, variables, tags, nombres de servicios e identificadores de código.
- Tono práctico y directo, dirigido a alguien que ya hizo el "Docker Getting Started".
- Cada afirmación debe ser técnicamente correcta. Las salidas esperadas deben
  ser realistas; si algo varía por entorno (hashes, IDs, fechas, tamaños),
  indícalo con un comentario o `<...>`.

## Ubicación y estructura de ficheros
- Cada módulo es una carpeta `content/NN-slug/` (NN = orden con dos dígitos).
- Cada carpeta tiene un `module.json` y una o varias lecciones `.md`.

### `module.json`
```json
{
  "slug": "fundamentos-internals",
  "title": "Fundamentos e internals",
  "order": 1,
  "summary": "Cómo funciona Docker por dentro: daemon, namespaces, cgroups y capas."
}
```

### Frontmatter de cada lección `.md`
```markdown
---
title: "Qué es realmente un contenedor"
slug: "que-es-un-contenedor"
order: 1
summary: "Procesos aíslados con namespaces y cgroups, no máquinas virtuales."
---
```

## Estructura obligatoria del cuerpo de la lección
Usa estas secciones en este orden (omite "Errores comunes" solo si no aplica):

1. `# Título` (igual o equivalente al del frontmatter).
2. Párrafo introductorio (1-3 frases) con el objetivo de la lección.
3. `## Teoría` - explicación conceptual. Usa listas, tablas y `blockquote` para notas.
4. `## Manos a la obra` - uno o varios bloques de comando + salida esperada.
5. `## Flags y variantes` - tabla de los flags relevantes (lo más exhaustiva posible).
6. `## Pruébalo tú` - pasos numerados para que el alumno reproduzca en su máquina.
7. `## Errores comunes` - síntomás y solución.
8. `> Idea clave:` - un blockquote final resumiendo lo esencial.

## Bloques de código especiales (los renderiza la plataforma)
La plataforma interpreta el lenguaje del bloque de código. Usa:

- **Comparación comando + salida lado a lado** (PREFERIDO para ejercicios):

  Usa un bloque con lenguaje `compare` y los marcadores `# CMD` y `# OUT`:

      ```compare
      # CMD
      docker run hello-world
      # OUT
      Hello from Docker!
      This message shows that your installation appears to be working correctly.
      ```

- **Comando suelto** (sin salida): bloque `bash`.

      ```bash
      docker ps -a
      ```

- **Salida esperada suelta**: bloque `output`.

      ```output
      CONTAINER ID   IMAGE   COMMAND   STATUS
      ```

- **Ficheros / config** (Dockerfile, YAML, JSON): usa el lenguaje real
  (`dockerfile`, `yaml`, `json`) y se mostrará con resaltado y botón de copiar.

      ```dockerfile
      FROM alpine:3.20
      CMD ["echo", "hola"]
      ```

### Reglas de los bloques `compare`
- En `# CMD` pon solo el/los comando(s) que el alumno ejecuta (sin el `$`).
- En `# OUT` pon la salida realista. Para partes variables usa `<hash>`,
  `<container-id>`, `<fecha>` o `...` y, si ayuda, una línea `# (varía según tu entorno)`.
- Mantén las salidas concisas: recorta con `...` las partes irrelevantes.

## Ejercicios reproducibles con ficheros
- Si una lección necesita archivos (`Dockerfile`, `compose.yaml`, `go.mod`, `main.go`, `package.json`, etc.), no obligues al alumno a inventarlos.
- Incluye siempre una de estas dos rutas reproducibles, y prefiere incluir ambas cuando el ejercicio sea central:
  1. Un ejemplo completo en `examples/<slug>/` con README y todos los archivos necesarios.
  2. Bloques de código copiables dentro de la lección para crear los archivos mínimos.
- En `## Pruébalo tú`, indica desde qué carpeta se ejecutan los comandos (`cd examples/<slug>` o una carpeta creada por el alumno).
- Si el ejemplo puede clonarse desde GitHub, el repo completo ya contiene `examples/`; las lecciones deben funcionar también desde una copia local del repositorio.

## Examen práctico de módulo
- Cada módulo debe terminar con una lección `99-examen-práctico.md`.
- Frontmatter obligatorio:

```markdown
---
title: "Examen práctico"
slug: "examen-practico"
order: 99
summary: "Retos prácticos para comprobar que puedes aplicar lo aprendido en el módulo."
---
```

- El examen debe ser práctico y manual: retos aplicados, comandos sugeridos, salidas esperadas cuando aplique y checklist de autoevaluación.
- No añadas autocorrección, backend de evaluación ni lógica interactiva.

## Checklist antes de dar por buena una lección
- [ ] Frontmatter completo y `order` correcto.
- [ ] Al menos un bloque `compare` con salida esperada realista.
- [ ] Tabla de flags relevantes en "Flags y variantes".
- [ ] Sección "Pruébalo tú" con pasos reproducibles desde una carpeta concreta.
- [ ] Si hacen falta archivos, existen en `examples/` o aparecen como bloques copiables.
- [ ] Verificada la corrección técnica de comandos, flags y salidas.
- [ ] Español revisado: tildes, eñes y terminología consistente.
- [ ] Resumen final en `> Idea clave:`.

## Limitaciones
- No inventes flags ni comportamientos: si dudas, verifica con la documentación
  oficial de Docker antes de escribir.
- La verificación del alumno es manual (compara su salida con "Salida esperada");
  no escribas código de autocorrección.
