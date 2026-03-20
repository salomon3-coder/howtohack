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
const MIN_WORDS = 1200;

const TOPICS = [
	"speed up a slow Windows laptop",
	"reduce household electricity usage",
	"improve Wi-Fi speed without upgrading your plan",
	"organize Gmail for better work productivity",
	"fix common printer connection problems",
	"set up automatic backups for personal files",
	"run more effective online meetings for teams",
	"save time with practical keyboard shortcuts",
	"remove temporary files safely",
	"improve basic online account security",
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
		"image:",
		`  url: "${safePost.image.url.replaceAll('"', '\\"')}"`,
		`  alt: "${safePost.image.alt.replaceAll('"', '\\"')}"`,
		`  license: "${safePost.image.license.replaceAll('"', '\\"')}"`,
		`  source: "${safePost.image.source.replaceAll('"', '\\"')}"`,
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
			: "Practical guide to solve a common problem";

	const description =
		typeof post.description === "string" && post.description.trim() !== ""
			? post.description.trim()
			: "Step-by-step guide to solve everyday problems in a simple and ethical way.";

	const category =
		typeof post.category === "string" && post.category.trim() !== ""
			? post.category.trim()
			: "Software";

	const tags = Array.isArray(post.tags)
		? post.tags.filter((item) => typeof item === "string" && item.trim() !== "")
		: ["practical guide", "step by step"];

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
			: "";

	const image = normalizeImage(post.image, title);

	return { title, description, category, image, tags, faq, howToSteps, bodyMarkdown };
}

function countWords(text) {
	return text.trim().split(/\s+/).filter(Boolean).length;
}

function hasRequiredSections(markdown) {
	const required = [
		/##\s+Quick Answer/i,
		/##\s+Pro Tip/i,
		/##\s+FAQ/i,
		/##\s+Conclusion/i,
		/##\s+Internal Links/i,
	];
	return required.every((pattern) => pattern.test(markdown));
}

function validatePostQuality(rawPost) {
	const post = normalizePost(rawPost);
	const issues = [];

	if (!post.bodyMarkdown) {
		issues.push("missing bodyMarkdown");
	} else {
		const words = countWords(post.bodyMarkdown);
		if (words < MIN_WORDS) {
			issues.push(`body too short (${words} words, needs ${MIN_WORDS}+)`);
		}
		if (!hasRequiredSections(post.bodyMarkdown)) {
			issues.push("missing required sections (Quick Answer, Pro Tip, FAQ, Conclusion, Internal Links)");
		}
	}

	if (post.tags.length < 3) issues.push("need at least 3 tags");
	if (post.faq.length < 3) issues.push("need at least 3 FAQ entries");

	return { post, issues };
}

function normalizeImage(rawImage, title) {
	const defaultQuery = encodeURIComponent(title.toLowerCase().replace(/[^a-z0-9\s-]/gi, " ").trim());
	const fallback = {
		url: `https://source.unsplash.com/1600x900/?${defaultQuery}`,
		alt: `${title} illustration`,
		license: "Unsplash license",
		source: `https://unsplash.com/s/photos/${defaultQuery}`,
	};

	if (!rawImage || typeof rawImage !== "object") {
		return fallback;
	}

	const url = typeof rawImage.url === "string" && rawImage.url.trim() ? rawImage.url.trim() : fallback.url;
	const alt = typeof rawImage.alt === "string" && rawImage.alt.trim() ? rawImage.alt.trim() : fallback.alt;
	const license =
		typeof rawImage.license === "string" && rawImage.license.trim()
			? rawImage.license.trim()
			: fallback.license;
	const source =
		typeof rawImage.source === "string" && rawImage.source.trim() ? rawImage.source.trim() : fallback.source;

	return { url, alt, license, source };
}

async function callClaude(topic) {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error("Missing ANTHROPIC_API_KEY. Configure it in GitHub Actions secrets.");
	}

	const modelToUse = await resolveModel(apiKey);

	const prompt = `Generate ONE useful and ethical English article for howtohack.net.
Topic: ${topic}

Return only valid JSON with this structure:
{
  "title": "string",
  "description": "string (max 155 characters)",
  "category": "Home|Business|Software|Online",
  "image": {
    "url": "string (free stock photo URL, non-AI)",
    "alt": "string",
    "license": "string",
    "source": "string"
  },
  "tags": ["...","...","..."],
  "faq": [{"question":"...","answer":"..."},{"question":"...","answer":"..."}],
  "howToSteps": ["...","...","...","..."],
  "bodyMarkdown": "full markdown, 1200-2000 words, with required H2 sections: Quick Answer, Pro Tip, FAQ, Conclusion, Internal Links"
}

Rules:
- No illegal hacking or harmful instructions.
- Keep content practical, clear, and actionable.
- Avoid exaggerated promises.
- Do not invent statistics.
- English only.
- Follow this article flow: intro, quick answer box, body sections, pro tip box, FAQ, conclusion, internal link suggestions.
- Include at least one comparison table when the topic has multiple options.
- Image must be from free non-AI stock sources (Unsplash/Pexels/Pixabay/Wikimedia).
- Respond with valid JSON only (no markdown fences or extra text).`;

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
				messages: [{ role: "user", content: `${prompt}\nAttempt: ${attempt}/${maxAttempts}` }],
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
			const parsed = parseJsonFromText(text);
			const { post, issues } = validatePostQuality(parsed);
			if (issues.length > 0) {
				lastError = new Error(`Low-quality output: ${issues.join("; ")}`);
				console.warn(
					`Model output failed quality checks on attempt ${attempt}/${maxAttempts}: ${issues.join("; ")}`,
				);
				continue;
			}
			return post;
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
