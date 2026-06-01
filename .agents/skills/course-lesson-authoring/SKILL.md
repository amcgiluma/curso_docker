---
name: course-lesson-authoring
description: "Redacta lecciones del Curso de Docker interactivo con un formato consistente: teoria breve, comandos para ejecutar, salida esperada para comparar, y errores comunes. Usar siempre que se cree o edite contenido en content/ de este repositorio."
category: education
---

# Course Lesson Authoring (Curso de Docker)

Eres un redactor tecnico experto en Docker. Tu tarea es escribir lecciones del
curso en Markdown siguiendo EXACTAMENTE el formato de esta skill, para que la
plataforma (React + FastAPI) las renderice de forma homogenea.

## Idioma y tono
- Escribe en **espanol** (sin tildes obligatorias, pero se aceptan).
- Tono practico y directo, dirigido a alguien que ya hizo el "Docker Getting Started".
- Cada afirmacion debe ser tecnicamente correcta. Las salidas esperadas deben
  ser realistas; si algo varia por entorno (hashes, IDs, fechas, tamanos),
  indicalo con un comentario o `<...>`.

## Ubicacion y estructura de ficheros
- Cada modulo es una carpeta `content/NN-slug/` (NN = orden con dos digitos).
- Cada carpeta tiene un `module.json` y una o varias lecciones `.md`.

### `module.json`
```json
{
  "slug": "fundamentos-internals",
  "title": "Fundamentos e internals",
  "order": 1,
  "summary": "Como funciona Docker por dentro: daemon, namespaces, cgroups y capas."
}
```

### Frontmatter de cada leccion `.md`
```markdown
---
title: "Que es realmente un contenedor"
slug: "que-es-un-contenedor"
order: 1
summary: "Procesos aislados con namespaces y cgroups, no maquinas virtuales."
---
```

## Estructura OBLIGATORIA del cuerpo de la leccion
Usa estas secciones en este orden (omite "Errores comunes" solo si no aplica):

1. `# Titulo` (igual o equivalente al del frontmatter).
2. Parrafo introductorio (1-3 frases) con el objetivo de la leccion.
3. `## Teoria` — explicacion conceptual. Usa listas, tablas y `blockquote` para notas.
4. `## Manos a la obra` — uno o varios bloques de comando + salida esperada.
5. `## Flags y variantes` — tabla de los flags relevantes (lo mas exhaustiva posible).
6. `## Pruebalo tu` — pasos numerados para que el alumno reproduzca en su maquina.
7. `## Errores comunes` — sintomas y solucion.
8. `> Idea clave:` — un blockquote final resumiendo lo esencial.

## Bloques de codigo especiales (los renderiza la plataforma)
La plataforma interpreta el lenguaje del bloque de codigo. Usa:

- **Comparacion comando + salida lado a lado** (PREFERIDO para ejercicios):

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
  (`dockerfile`, `yaml`, `json`) y se mostrara con resaltado y boton de copiar.

      ```dockerfile
      FROM alpine:3.20
      CMD ["echo", "hola"]
      ```

### Reglas de los bloques `compare`
- En `# CMD` pon solo el/los comando(s) que el alumno ejecuta (sin el `$`).
- En `# OUT` pon la salida realista. Para partes variables usa `<hash>`,
  `<container-id>`, `<fecha>` o `...` y, si ayuda, una linea `# (varia segun tu entorno)`.
- Manten las salidas concisas: recorta con `...` las partes irrelevantes.

## Checklist antes de dar por buena una leccion
- [ ] Frontmatter completo y `order` correcto.
- [ ] Al menos un bloque `compare` con salida esperada realista.
- [ ] Tabla de flags relevantes en "Flags y variantes".
- [ ] Seccion "Pruebalo tu" con pasos reproducibles.
- [ ] Verificada la correccion tecnica de comandos, flags y salidas.
- [ ] Resumen final en `> Idea clave:`.

## Limitaciones
- No inventes flags ni comportamientos: si dudas, verifica con la documentacion
  oficial de Docker antes de escribir.
- La verificacion del alumno es manual (compara su salida con "Salida esperada");
  no escribas codigo de auto-correccion.
