import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import { fetchModules, type ModuleMeta } from "./api";
import { Sidebar } from "./components/Sidebar";
import { HomePage } from "./pages/HomePage";
import { LessonPage } from "./pages/LessonPage";

export default function App() {
  const [modules, setModules] = useState<ModuleMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchModules()
      .then((mods) =>
        setModules([...mods].sort((a, b) => a.order - b.order))
      )
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Error desconocido")
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        modules={modules}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-ink-600 bg-ink-900/80 px-4 py-3 backdrop-blur md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md border border-ink-600 px-3 py-1.5 text-sm text-slate-200"
          >
            Menu
          </button>
          <span className="font-semibold text-white">Curso de Docker</span>
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-8 md:px-10 md:py-12">
          {loading && (
            <p className="text-slate-400">Cargando el curso...</p>
          )}
          {error && (
            <div className="rounded-xl border border-amber-700/60 bg-amber-950/30 p-4 text-amber-200">
              <p className="font-semibold">No se pudo cargar el contenido.</p>
              <p className="mt-1 text-sm text-amber-200/80">{error}</p>
              <p className="mt-2 text-sm text-amber-200/70">
                Asegurate de que el backend (FastAPI) esta levantado en el
                puerto 8000 o que el stack de docker compose esta corriendo.
              </p>
            </div>
          )}
          {!loading && !error && (
            <Routes>
              <Route path="/" element={<HomePage modules={modules} />} />
              <Route
                path="/m/:moduleSlug/:lessonSlug"
                element={<LessonPage modules={modules} />}
              />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}
