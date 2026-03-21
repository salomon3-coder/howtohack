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
/** Single JSON with 1200+ word body needs far more than 2.4k output tokens; use two-step generation. */
const MAX_TOKENS_META = 4096;
const MAX_TOKENS_BODY = 16384;

/** HTTP statuses where Anthropic often recovers after a delay (overload, rate limit, gateway). */
const ANTHROPIC_RETRYABLE_STATUS = new Set([429, 500, 502, 503, 529]);

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function getAnthropicRetryDelayMs(response, attemptIndex, baseMs) {
	const retryAfter = response.headers.get("retry-after");
	if (retryAfter) {
		const sec = Number(retryAfter);
		if (Number.isFinite(sec) && sec > 0) {
			return Math.min(120_000, sec * 1000);
		}
	}
	const exponential = Math.min(120_000, baseMs * 2 ** attemptIndex);
	const jitter = Math.floor(Math.random() * 2000);
	return exponential + jitter;
}

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

/** YAML double-quoted strings treat \\ as escape; Windows paths like C:\\Windows break parsing without this. */
function escapeYamlDoubleQuoted(value) {
	return String(value)
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\r\n/g, "\n")
		.replace(/\n/g, "\\n");
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
	const tagsLines = safePost.tags.map((tag) => `  - "${escapeYamlDoubleQuoted(tag)}"`);
	const faqLines = safePost.faq.flatMap((item) => [
		`  - question: "${escapeYamlDoubleQuoted(item.question)}"`,
		`    answer: "${escapeYamlDoubleQuoted(item.answer)}"`,
	]);
	const howToLines = safePost.howToSteps.map((step) => `  - "${escapeYamlDoubleQuoted(step)}"`);

	const lines = [
		"---",
		`title: "${escapeYamlDoubleQuoted(safePost.title)}"`,
		`description: "${escapeYamlDoubleQuoted(safePost.description)}"`,
		`pubDate: "${new Date().toISOString()}"`,
		`category: "${escapeYamlDoubleQuoted(safePost.category)}"`,
		"image:",
		`  url: "${escapeYamlDoubleQuoted(safePost.image.url)}"`,
		`  alt: "${escapeYamlDoubleQuoted(safePost.image.alt)}"`,
		`  license: "${escapeYamlDoubleQuoted(safePost.image.license)}"`,
		`  source: "${escapeYamlDoubleQuoted(safePost.image.source)}"`,
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

	const bodyMarkdown = extractBodyMarkdown(post);

	const image = normalizeImage(post.image, title);

	return { title, description, category, image, tags, faq, howToSteps, bodyMarkdown };
}

/** Accept common alternate keys from models that omit bodyMarkdown. */
function extractBodyMarkdown(post) {
	if (!post || typeof post !== "object") return "";
	const candidates = [
		post.bodyMarkdown,
		post.body_markdown,
		post.markdown,
		post.content,
		post.article,
		post.body,
	];
	for (const value of candidates) {
		if (typeof value === "string" && value.trim() !== "") return value.trim();
	}
	return "";
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

/** Remove accidental ``` / ```markdown wrappers from plain-text body responses. */
function stripMarkdownFences(text) {
	if (typeof text !== "string") return "";
	let t = text.trim();
	const fence = /^```(?:markdown|md)?\s*\n?([\s\S]*?)\n?```$/i;
	const m = t.match(fence);
	if (m) return m[1].trim();
	return t;
}

/** Validate metadata JSON only (used before body generation). */
function validatePostMeta(metaParsed) {
	const issues = [];
	if (!metaParsed || typeof metaParsed !== "object") {
		return ["invalid metadata object"];
	}
	if (typeof metaParsed.title !== "string" || !metaParsed.title.trim()) {
		issues.push("missing title");
	}
	const post = normalizePost({ ...metaParsed, bodyMarkdown: "" });
	if (post.tags.length < 3) issues.push("need at least 3 tags");
	if (post.faq.length < 3) issues.push("need at least 3 FAQ entries");
	if (post.howToSteps.length < 3) issues.push("need at least 3 howToSteps");
	if (!post.image?.url || !/^https?:\/\//i.test(post.image.url)) {
		issues.push("image.url must be a valid http(s) URL");
	}
	if (post.description.length > 200) {
		issues.push("description too long (keep under ~155 chars for SEO)");
	}
	return issues;
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

async function anthropicMessage(apiKey, modelToUse, userContent, maxTokens) {
	const maxHttpAttempts = Math.max(1, Number.parseInt(process.env.ANTHROPIC_HTTP_RETRIES ?? "8", 10));
	const baseMs = Math.max(500, Number.parseInt(process.env.ANTHROPIC_RETRY_BASE_MS ?? "2500", 10));
	let lastBody = "";

	for (let i = 0; i < maxHttpAttempts; i += 1) {
		const response = await fetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
				"content-type": "application/json",
			},
			body: JSON.stringify({
				model: modelToUse,
				max_tokens: maxTokens,
				temperature: 0.4,
				messages: [{ role: "user", content: userContent }],
			}),
		});

		if (response.ok) {
			const data = await response.json();
			const text = data?.content?.[0]?.text?.trim();
			const stopReason = data?.stop_reason;
			return { text, stopReason };
		}

		lastBody = await response.text();
		const status = response.status;
		const canRetry = ANTHROPIC_RETRYABLE_STATUS.has(status) && i < maxHttpAttempts - 1;

		if (!canRetry) {
			throw new Error(`Anthropic API error: ${status} ${lastBody}`);
		}

		const waitMs = getAnthropicRetryDelayMs(response, i, baseMs);
		console.warn(
			`Anthropic API ${status} (transient); waiting ${Math.round(waitMs / 1000)}s before HTTP retry ${i + 2}/${maxHttpAttempts}…`,
		);
		await sleep(waitMs);
	}

	throw new Error(`Anthropic API error after ${maxHttpAttempts} attempts: ${lastBody}`);
}

/**
 * Two-step generation: metadata JSON (small) + long body as plain markdown (avoids truncation).
 */
async function callClaude(topic) {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	if (!apiKey) {
		throw new Error("Missing ANTHROPIC_API_KEY. Configure it in GitHub Actions secrets.");
	}

	const modelToUse = await resolveModel(apiKey);

	const metaPrompt = `Generate metadata for ONE useful and ethical English article for howtohack.net.
Topic: ${topic}

Return only valid JSON (no markdown fences) with this structure. Do NOT include bodyMarkdown.
{
  "title": "string",
  "description": "string (max 155 characters)",
  "category": "Home|Business|Software|Online",
  "image": {
    "url": "string (direct link to a free non-AI stock photo)",
    "alt": "string",
    "license": "string",
    "source": "string (page URL on Unsplash/Pexels/Pixabay/Wikimedia)"
  },
  "tags": ["tag1","tag2","tag3"],
  "faq": [{"question":"...","answer":"..."}, ... at least 3],
  "howToSteps": ["step1","step2","step3","step4"]
}

Rules: English only; no illegal hacking; image must be real stock photo URL; at least 3 tags and 3 FAQ items.`;

	const bodyInstructions = `Write the FULL article body in Markdown only (no JSON, no code fences).

Requirements:
- English only, practical and ethical.
- Length: at least ${MIN_WORDS} words.
- Required H2 headings (exact titles): Quick Answer, Pro Tip, FAQ, Conclusion, Internal Links
- Before Quick Answer: a short intro (2-3 paragraphs max).
- Quick Answer: bullet list TL;DR (3-5 bullets).
- Use more H2/H3 sections for the main content; mirror "People also ask" style questions where natural.
- Include at least one markdown table if the topic compares options.
- FAQ section: reuse the same questions/answers as in frontmatter is OK but expand slightly if needed.
- Internal Links: list 2-3 related article titles as bullet links using placeholder paths like /blog/related-topic/
- No illegal hacking or harmful instructions. Do not invent statistics.`;

	const maxAttempts = 3;
	let lastError = null;

	for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
		try {
			const { text: metaText, stopReason: metaStop } = await anthropicMessage(
				apiKey,
				modelToUse,
				`${metaPrompt}\nAttempt: ${attempt}/${maxAttempts}`,
				MAX_TOKENS_META,
			);
			if (!metaText) {
				lastError = new Error("Empty metadata response.");
				continue;
			}
			if (metaStop === "max_tokens") {
				console.warn("Metadata response hit max_tokens; retrying...");
				lastError = new Error("Metadata truncated (max_tokens).");
				continue;
			}

			const metaParsed = parseJsonFromText(metaText);
			const metaIssues = validatePostMeta(metaParsed);
			if (metaIssues.length > 0) {
				lastError = new Error(`Metadata invalid: ${metaIssues.join("; ")}`);
				console.warn(`Metadata quality fail attempt ${attempt}/${maxAttempts}: ${metaIssues.join("; ")}`);
				continue;
			}

			const metaPost = normalizePost({ ...metaParsed, bodyMarkdown: "" });

			const bodyUser = `${bodyInstructions}

Topic: ${topic}
Title: ${metaPost.title}
Description: ${metaPost.description}
Category: ${metaPost.category}

Write the article now.`;

			const { text: bodyText, stopReason: bodyStop } = await anthropicMessage(
				apiKey,
				modelToUse,
				bodyUser,
				MAX_TOKENS_BODY,
			);
			if (!bodyText) {
				lastError = new Error("Empty body response.");
				continue;
			}
			if (bodyStop === "max_tokens") {
				lastError = new Error("Body truncated (max_tokens); increase MAX_TOKENS_BODY or shorten prompt.");
				console.warn(`Body hit max_tokens on attempt ${attempt}/${maxAttempts}`);
				continue;
			}

			const bodyClean = stripMarkdownFences(bodyText);
			const merged = { ...metaParsed, bodyMarkdown: bodyClean };
			const { post, issues } = validatePostQuality(merged);
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
			console.warn(`Attempt ${attempt}/${maxAttempts} error: ${error.message}`);
		}
	}

	throw lastError ?? new Error("Failed to generate article after retries.");
}

async function resolveModel(apiKey) {
	if (MODEL && MODEL.trim() !== "") {
		return MODEL.trim();
	}

	const maxHttpAttempts = Math.max(1, Number.parseInt(process.env.ANTHROPIC_HTTP_RETRIES ?? "8", 10));
	const baseMs = Math.max(500, Number.parseInt(process.env.ANTHROPIC_RETRY_BASE_MS ?? "2500", 10));
	let lastStatus = 0;
	let lastBody = "";

	for (let i = 0; i < maxHttpAttempts; i += 1) {
		const response = await fetch("https://api.anthropic.com/v1/models", {
			method: "GET",
			headers: {
				"x-api-key": apiKey,
				"anthropic-version": "2023-06-01",
			},
		});

		if (response.ok) {
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

		lastStatus = response.status;
		lastBody = await response.text();
		const canRetry = ANTHROPIC_RETRYABLE_STATUS.has(lastStatus) && i < maxHttpAttempts - 1;
		if (!canRetry) {
			throw new Error(
				`Could not list Anthropic models (status ${lastStatus}). Set ANTHROPIC_MODEL explicitly in GitHub Variables. ${lastBody}`,
			);
		}
		const waitMs = getAnthropicRetryDelayMs(response, i, baseMs);
		console.warn(
			`Anthropic models list ${lastStatus}; waiting ${Math.round(waitMs / 1000)}s before retry ${i + 2}/${maxHttpAttempts}…`,
		);
		await sleep(waitMs);
	}

	throw new Error("resolveModel: unexpected end (please report).");
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

	const betweenPostsMs = Math.max(
		0,
		Number.parseInt(process.env.POST_GENERATION_DELAY_MS ?? "5000", 10),
	);

	for (let t = 0; t < selectedTopics.length; t += 1) {
		const topic = selectedTopics[t];
		const post = await callClaude(topic);
		const filePath = await writePostFile(post);
		created.push(filePath);
		generatedViaClaude += 1;
		if (betweenPostsMs > 0 && t < selectedTopics.length - 1) {
			console.log(`Waiting ${betweenPostsMs / 1000}s before next article (reduces API bursts)…`);
			await sleep(betweenPostsMs);
		}
	}

	console.log(`Created ${created.length} post(s):`);
	console.log(`Generated via Claude API: ${generatedViaClaude}`);
	created.forEach((file) => console.log(`- ${path.relative(process.cwd(), file)}`));
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
