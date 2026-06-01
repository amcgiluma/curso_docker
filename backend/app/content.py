"""Lectura y parseo del contenido del curso (Markdown + frontmatter YAML).

El contenido vive en un directorio de modulos, cada uno con un `module.json`
y varios ficheros `.md` (las lecciones). Las lecciones llevan frontmatter:

    ---
    title: "Titulo de la leccion"
    slug: "mi-leccion"
    order: 1
    summary: "Una frase de resumen"
    ---
    # Contenido markdown...
"""

from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path

import yaml

from .models import Lesson, LessonMeta, ModuleMeta


def content_dir() -> Path:
    """Directorio raiz del contenido.

    Configurable con la variable de entorno CONTENT_DIR. Por defecto apunta
    a `../content` (util al ejecutar el backend en local) o a `/content`
    dentro del contenedor.
    """
    env = os.getenv("CONTENT_DIR")
    if env:
        return Path(env)
    local = Path(__file__).resolve().parents[2] / "content"
    return local


def _parse_frontmatter(text: str) -> tuple[dict, str]:
    """Separa el frontmatter YAML del cuerpo markdown."""
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) >= 3:
            meta = yaml.safe_load(parts[1]) or {}
            body = parts[2].lstrip("\n")
            return meta, body
    return {}, text


def _read_lesson_file(path: Path, module_slug: str) -> tuple[LessonMeta, str]:
    raw = path.read_text(encoding="utf-8")
    meta, body = _parse_frontmatter(raw)
    slug = str(meta.get("slug") or path.stem)
    lesson_meta = LessonMeta(
        slug=slug,
        title=str(meta.get("title") or slug),
        order=int(meta.get("order") or 0),
        summary=str(meta.get("summary") or ""),
        moduleSlug=module_slug,
    )
    return lesson_meta, body


@lru_cache(maxsize=1)
def _load_index() -> dict[str, tuple[ModuleMeta, dict[str, str]]]:
    """Escanea el contenido y devuelve un indice por slug de modulo.

    Cada entrada contiene el `ModuleMeta` (con metadatos de lecciones) y un
    diccionario {lesson_slug: cuerpo_markdown}.
    """
    root = content_dir()
    index: dict[str, tuple[ModuleMeta, dict[str, str]]] = {}
    if not root.exists():
        return index

    for module_path in sorted(p for p in root.iterdir() if p.is_dir()):
        module_json = module_path / "module.json"
        if module_json.exists():
            mod_meta = json.loads(module_json.read_text(encoding="utf-8"))
        else:
            mod_meta = {}
        module_slug = str(mod_meta.get("slug") or module_path.name)

        lessons_meta: list[LessonMeta] = []
        bodies: dict[str, str] = {}
        for md in sorted(module_path.glob("*.md")):
            if md.name.lower() == "readme.md":
                continue
            meta, body = _read_lesson_file(md, module_slug)
            lessons_meta.append(meta)
            bodies[meta.slug] = body

        lessons_meta.sort(key=lambda lesson: lesson.order)
        module = ModuleMeta(
            slug=module_slug,
            title=str(mod_meta.get("title") or module_slug),
            order=int(mod_meta.get("order") or 0),
            summary=str(mod_meta.get("summary") or ""),
            lessons=lessons_meta,
        )
        index[module_slug] = (module, bodies)

    return index


def reset_cache() -> None:
    _load_index.cache_clear()


def list_modules() -> list[ModuleMeta]:
    index = _load_index()
    modules = [module for module, _ in index.values()]
    modules.sort(key=lambda module: module.order)
    return modules


def get_lesson(module_slug: str, lesson_slug: str) -> Lesson | None:
    index = _load_index()
    entry = index.get(module_slug)
    if not entry:
        return None
    module, bodies = entry
    body = bodies.get(lesson_slug)
    if body is None:
        return None
    meta = next((l for l in module.lessons if l.slug == lesson_slug), None)
    if meta is None:
        return None
    return Lesson(**meta.model_dump(), content=body)
