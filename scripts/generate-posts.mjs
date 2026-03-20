import fs from "node:fs/promises";
import path from "node:path";
import { jsonrepair } from "jsonrepair";

function resolvePostsPerRun(rawValue) {
	const fallback = 3;
	if (!rawValue || rawValue.trim() === "") {
		return fallback;
	}
	const parsed = Number.parseInt(rawValue, 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		return fallback;
	}
	return parsed;
}

const POSTS_PER_RUN = resolvePostsPerRun(process.env.POSTS_PER_RUN);
const OUTPUT_DIR = path.resolve("src/content/blog");
const MODEL = process.env.ANTHROPIC_MODEL;

const TOPICS = [
	"acelerar laptop lenta en Windows",
	"reducir consumo electrico en el hogar",
	"mejorar velocidad del wifi sin cambiar de plan",
	"organizar correos en Gmail para trabajo",
	"solucionar errores comunes de impresora",
	"crear copias de seguridad automaticas",
	"optimizar reuniones online para empresas",
	"ahorrar tiempo con atajos de teclado",
	"eliminar archivos temporales de forma segura",
	"mejorar seguridad basica de cuentas online",
];

function parseJsonFromText(text) {
	const cleaned = text
		.replace(/^```json\s*/i, "")
		.replace(/^```\s*/i, "")
		.replace(/```$/i, "")
		.trim();

	try {
		return JSON.parse(cleaned);
	} catch {
		const match = cleaned.match(/\{[\s\S]*\}/);
		if (!match) {
			throw new Error("No valid JSON block found in model response.");
		}
		try {
			return JSON.parse(match[0]);
		} catch {
			const repaired = jsonrepair(match[0]);
			return JSON.parse(repaired);
		}
	}
}

function slugify(input) {
	return input
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/(^-|-$)/g, "");
}

function buildFrontmatter(post) {
	const safePost = normalizePost(post);
	const tagsLines = safePost.tags.map((tag) => `  - "${tag.replaceAll('"', '\\"')}"`);
	const faqLines = safePost.faq.flatMap((item) => [
		`  - question: "${item.question.replaceAll('"', '\\"')}"`,
		`    answer: "${item.answer.replaceAll('"', '\\"')}"`,
	]);
	const howToLines = safePost.howToSteps.map((step) => `  - "${step.replaceAll('"', '\\"')}"`);

	const lines = [
		"---",
		`title: "${safePost.title.replaceAll('"', '\\"')}"`,
		`description: "${safePost.description.replaceAll('"', '\\"')}"`,
		`pubDate: "${new Date().toISOString()}"`,
		`category: "${safePost.category}"`,
		safePost.tags.length > 0 ? "tags:" : "tags: []",
		...tagsLines,
		safePost.faq.length > 0 ? "faq:" : "faq: []",
		...faqLines,
		safePost.howToSteps.length > 0 ? "howToSteps:" : "howToSteps: []",
		...howToLines,
		"draft: false",
		"---",
		"",
	];
	return lines.join("\n");
}

function normalizePost(raw) {
	const post = raw ?? {};

	const title =
		typeof post.title === "string" && post.title.trim() !== ""
			? post.title.trim()
			: "Guia practica para resolver un problema comun";

	const description =
		typeof post.description === "string" && post.description.trim() !== ""
			? post.description.trim()
			: "Guia paso a paso para resolver problemas cotidianos de forma etica y simple.";

	const category =
		typeof post.category === "string" && post.category.trim() !== ""
			? post.category.trim()
			: "Software";

	const tags = Array.isArray(post.tags)
		? post.tags.filter((item) => typeof item === "string" && item.trim() !== "")
		: ["guia practica", "paso a paso"];

	const faq = Array.isArray(post.faq)
		? post.faq
				.filter(
					(item) =>
						item &&
						typeof item.question === "string" &&
						typeof item.answer === "string" &&
						item.question.trim() !== "" &&
						item.answer.trim() !== "",
				)
				.map((item) => ({
					question: item.question.trim(),
					answer: item.answer.trim(),
				}))
		: [];

	const howToSteps = Array.isArray(post.howToSteps)
		? post.howToSteps.filter((item) => typeof item === "string" && item.trim() !== "")
		: [];

	const bodyMarkdown =
		typeof post.bodyMarkdown === "string" && post.bodyMarkdown.trim() !== ""
			? post.bodyMarkdown.trim()
			: `## Introduccion

Esta guia resume pasos practicos y eticos para resolver el problema.

## Pasos sugeridos

1. Define claramente el problema.
2. Aplica una solucion simple y segura.
3. Verifica resultados y documenta cambios.`;

	return { title, description, category, tags, faq, howToSteps, bodyMarkdown };
}

async function callClaude(topic) {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error("Missing ANTHROPIC_API_KEY. Configure it in GitHub Actions secrets.");
	}

	const modelToUse = await resolveModel(apiKey);

	const prompt = `Genera UN articulo util y etico en espanol para howtohack.net.
Tema: ${topic}

Devuelve solo JSON valido con esta forma:
{
  "title": "string",
  "description": "string (max 155 chars)",
  "category": "Hogar|Empresa|Software|Online",
  "tags": ["...","...","..."],
  "faq": [{"question":"...","answer":"..."},{"question":"...","answer":"..."}],
  "howToSteps": ["...","...","...","..."],
  "bodyMarkdown": "markdown completo con H2/H3 y pasos accionables"
}

Reglas:
- Sin hacking ilegal.
- Contenido practico, claro, accionable.
- Evita promesas exageradas.
- No inventes datos estadisticos.
- Responde SOLO JSON valido, sin markdown ni bloques de codigo.`;

	const maxAttempts = 3;
	let lastError = null;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		const response = await fetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
				"content-type": "application/json",
			},
			body: JSON.stringify({
				model: modelToUse,
				max_tokens: 2400,
				temperature: 0.4,
				messages: [{ role: "user", content: `${prompt}\nIntento: ${attempt}/${maxAttempts}` }],
			}),
		});

		if (!response.ok) {
			throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
		}

		const data = await response.json();
		const text = data?.content?.[0]?.text?.trim();
		if (!text) {
			lastError = new Error("Anthropic API returned empty content.");
			continue;
		}

		try {
			return parseJsonFromText(text);
		} catch (error) {
			lastError = error;
			console.warn(`Invalid JSON from model on attempt ${attempt}/${maxAttempts}. Retrying...`);
		}
	}

	throw lastError ?? new Error("Failed to parse model response as JSON after retries.");
}

async function resolveModel(apiKey) {
	if (MODEL && MODEL.trim() !== "") {
		return MODEL.trim();
	}

	const response = await fetch("https://api.anthropic.com/v1/models", {
		method: "GET",
		headers: {
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
		},
	});

	if (!response.ok) {
		throw new Error(
			`Could not list Anthropic models (status ${response.status}). Set ANTHROPIC_MODEL explicitly in GitHub Variables.`,
		);
	}

	const data = await response.json();
	const models = Array.isArray(data?.data) ? data.data.map((m) => m.id).filter(Boolean) : [];
	if (models.length === 0) {
		throw new Error("No models available for this API key/workspace.");
	}

	const preferred =
		models.find((id) => id.includes("sonnet")) ??
		models.find((id) => id.includes("claude")) ??
		models[0];

	console.log(`Using Anthropic model: ${preferred}`);
	return preferred;
}

async function ensureOutputDir() {
	await fs.mkdir(OUTPUT_DIR, { recursive: true });
}

async function writePostFile(post) {
	const safePost = normalizePost(post);
	const datePart = new Date().toISOString().slice(0, 10);
	const baseSlug = `${datePart}-${slugify(safePost.title)}`;
	let slug = baseSlug;
	let filePath = path.join(OUTPUT_DIR, `${slug}.md`);
	let attempt = 1;

	while (await fs.stat(filePath).then(() => true).catch(() => false)) {
		attempt += 1;
		slug = `${baseSlug}-${attempt}`;
		filePath = path.join(OUTPUT_DIR, `${slug}.md`);
	}

	const content = `${buildFrontmatter(safePost)}${safePost.bodyMarkdown.trim()}\n`;
	await fs.writeFile(filePath, content, "utf8");
	return filePath;
}

async function main() {
	if (!process.env.ANTHROPIC_API_KEY) {
		throw new Error("ANTHROPIC_API_KEY is required. Add it to GitHub Actions secrets.");
	}

	await ensureOutputDir();
	const selectedTopics = TOPICS.sort(() => 0.5 - Math.random()).slice(0, POSTS_PER_RUN);
	const created = [];
	let generatedViaClaude = 0;

	for (const topic of selectedTopics) {
		const post = await callClaude(topic);
		const filePath = await writePostFile(post);
		created.push(filePath);
		generatedViaClaude += 1;
	}

	console.log(`Created ${created.length} post(s):`);
	console.log(`Generated via Claude API: ${generatedViaClaude}`);
	created.forEach((file) => console.log(`- ${path.relative(process.cwd(), file)}`));
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
