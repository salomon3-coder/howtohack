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
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";

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
	try {
		return JSON.parse(text);
	} catch {
		const match = text.match(/\{[\s\S]*\}/);
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
- No inventes datos estadisticos.`;

	const response = await fetch("https://api.anthropic.com/v1/messages", {
		method: "POST",
		headers: {
			"x-api-key": apiKey,
			"anthropic-version": "2023-06-01",
			"content-type": "application/json",
		},
		body: JSON.stringify({
			model: MODEL,
			max_tokens: 2400,
			temperature: 0.6,
			messages: [{ role: "user", content: prompt }],
		}),
	});

	if (!response.ok) {
		throw new Error(`Anthropic API error: ${response.status} ${await response.text()}`);
	}

	const data = await response.json();
	const text = data?.content?.[0]?.text?.trim();
	if (!text) {
		throw new Error("Anthropic API returned empty content.");
	}
	return parseJsonFromText(text);
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
