"""API del Curso de Docker.

Sirve el contenido del curso (modulos y lecciones) leido desde el directorio
`content/`. La verificacion de ejercicios es manual (el usuario compara la
salida real con la "Salida esperada"), por lo que esta API es de solo lectura.
"""

from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import content
from .models import Lesson, ModuleMeta

app = FastAPI(
    title="Curso de Docker API",
    version="1.0.0",
    description="Sirve el contenido del curso interactivo de Docker.",
)

_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/modules", response_model=list[ModuleMeta])
def get_modules() -> list[ModuleMeta]:
    return content.list_modules()


@app.get("/api/lessons/{module_slug}/{lesson_slug}", response_model=Lesson)
def get_lesson(module_slug: str, lesson_slug: str) -> Lesson:
    lesson = content.get_lesson(module_slug, lesson_slug)
    if lesson is None:
        raise HTTPException(status_code=404, detail="Leccion no encontrada")
    return lesson
