import { Link } from "react-router-dom";
import type { ModuleMeta } from "../api";

export function HomePage({ modules }: { modules: ModuleMeta[] }) {
  const firstLesson = modules[0]?.lessons
    ?.slice()
    .sort((a, b) => a.order - b.order)[0];

  return (
    <div>
      <span className="inline-block rounded-full border border-ocean-600/50 bg-ocean-600/10 px-3 py-1 text-xs font-semibold text-ocean-300">
        Self-paced · Nivel avanzado
      </span>
      <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl">
        Domina Docker de verdad
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-300">
        Un curso practico para ir mas alla del{" "}
        <em>Getting Started</em>: cada leccion trae un comando para que lo
        ejecutes en tu maquina y la <strong>salida esperada</strong> al lado,
        para que compares tu resultado al instante. Cubrimos internals,
        Dockerfiles, todos los comandos y flags, Compose y buenas practicas de
        produccion.
      </p>

      {firstLesson && modules[0] && (
        <Link
          to={`/m/${modules[0].slug}/${firstLesson.slug}`}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-ocean-600 px-5 py-3 font-semibold text-white shadow-lg shadow-ocean-900/40 transition hover:bg-ocean-500"
        >
          Empezar el curso →
        </Link>
      )}

      <h2 className="mt-12 mb-4 text-2xl font-bold text-white">
        Contenido del curso
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {modules.map((mod) => {
          const first = mod.lessons
            .slice()
            .sort((a, b) => a.order - b.order)[0];
          return (
            <Link
              key={mod.slug}
              to={first ? `/m/${mod.slug}/${first.slug}` : "#"}
              className="group rounded-2xl border border-ink-600 bg-ink-800/60 p-5 transition hover:border-ocean-500 hover:bg-ink-700/60"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-ocean-400">
                  {String(mod.order).padStart(2, "0")}
                </span>
                <h3 className="font-bold text-white group-hover:text-ocean-200">
                  {mod.title}
                </h3>
              </div>
              <p className="mt-2 text-sm text-slate-400">{mod.summary}</p>
              <p className="mt-3 text-xs text-slate-500">
                {mod.lessons.length} lecciones
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
