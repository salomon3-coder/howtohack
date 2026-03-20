import fs from "node:fs/promises";
import path from "node:path";

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
		return JSON.parse(match[0]);
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
	const lines = [
		"---",
		`title: "${post.title.replaceAll('"', '\\"')}"`,
		`description: "${post.description.replaceAll('"', '\\"')}"`,
		`pubDate: "${new Date().toISOString()}"`,
		`category: "${post.category}"`,
		"tags:",
		...post.tags.map((tag) => `  - "${tag.replaceAll('"', '\\"')}"`),
		"faq:",
		...post.faq.flatMap((item) => [
			`  - question: "${item.question.replaceAll('"', '\\"')}"`,
			`    answer: "${item.answer.replaceAll('"', '\\"')}"`,
		]),
		"howToSteps:",
		...post.howToSteps.map((step) => `  - "${step.replaceAll('"', '\\"')}"`),
		"draft: false",
		"---",
		"",
	];
	return lines.join("\n");
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
	const datePart = new Date().toISOString().slice(0, 10);
	const baseSlug = `${datePart}-${slugify(post.title)}`;
	let slug = baseSlug;
	let filePath = path.join(OUTPUT_DIR, `${slug}.md`);
	let attempt = 1;

	while (await fs.stat(filePath).then(() => true).catch(() => false)) {
		attempt += 1;
		slug = `${baseSlug}-${attempt}`;
		filePath = path.join(OUTPUT_DIR, `${slug}.md`);
	}

	const content = `${buildFrontmatter(post)}${post.bodyMarkdown.trim()}\n`;
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
