from pydantic import BaseModel


class LessonMeta(BaseModel):
    slug: str
    title: str
    order: int
    summary: str = ""
    moduleSlug: str


class ModuleMeta(BaseModel):
    slug: str
    title: str
    order: int
    summary: str = ""
    lessons: list[LessonMeta]


class Lesson(LessonMeta):
    content: str
