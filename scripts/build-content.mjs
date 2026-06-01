// Genera un unico content.json estatico a partir de content/ para desplegar
// la plataforma SIN backend (p. ej. en Vercel). Replica el parseo del backend
// FastAPI (frontmatter + module.json) en Node, sin dependencias externas.
//
// Uso: node scripts/build-content.mjs
// Salida: frontend/public/content.json

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const contentDir = join(repoRoot, "content");
const outDir = join(repoRoot, "frontend", "public");
const outFile = join(outDir, "content.json");

/** Parser minimo de frontmatter YAML (clave: valor) suficiente para las lecciones. */
function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---")) return { meta: {}, body: normalized };
  const end = normalized.indexOf("\n---", 3);
  if (end === -1) return { meta: {}, body: normalized };

  const block = normalized.slice(3, end).trim();
  const body = normalized.slice(end + 4).replace(/^\n+/, "");

  const meta = {};
  for (const line of block.split("\n")) {
    const m = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line.trim());
    if (!m) continue;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else if (/^-?\d+$/.test(value)) {
      value = Number(value);
    }
    meta[m[1]] = value;
  }
  return { meta, body };
}

function readModules() {
  const modules = [];
  const dirs = readdirSync(contentDir).filter((name) =>
    statSync(join(contentDir, name)).isDirectory()
  );

  for (const dir of dirs.sort()) {
    const modulePath = join(contentDir, dir);
    let modMeta = {};
    try {
      modMeta = JSON.parse(
        readFileSync(join(modulePath, "module.json"), "utf8")
      );
    } catch {
      // sin module.json: usamos el nombre de carpeta
    }
    const moduleSlug = String(modMeta.slug ?? dir);

    const lessons = [];
    const files = readdirSync(modulePath).filter(
      (f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md"
    );
    for (const file of files.sort()) {
      const raw = readFileSync(join(modulePath, file), "utf8");
      const { meta, body } = parseFrontmatter(raw);
      const slug = String(meta.slug ?? file.replace(/\.md$/, ""));
      lessons.push({
        slug,
        title: String(meta.title ?? slug),
        order: Number(meta.order ?? 0),
        summary: String(meta.summary ?? ""),
        moduleSlug,
        content: body,
      });
    }
    lessons.sort((a, b) => a.order - b.order);

    modules.push({
      slug: moduleSlug,
      title: String(modMeta.title ?? moduleSlug),
      order: Number(modMeta.order ?? 0),
      summary: String(modMeta.summary ?? ""),
      lessons,
    });
  }

  modules.sort((a, b) => a.order - b.order);
  return modules;
}

const modules = readModules();
mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, JSON.stringify({ modules }, null, 0), "utf8");

const lessonCount = modules.reduce((n, m) => n + m.lessons.length, 0);
console.log(
  `content.json generado: ${modules.length} modulos, ${lessonCount} lecciones -> ${outFile}`
);
