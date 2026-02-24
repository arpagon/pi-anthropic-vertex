import {
	type AnthropicVertexEffort,
	type AnthropicVertexOptions,
	type Api,
	type AssistantMessageEventStream,
	type Context,
	type Model,
	type SimpleStreamOptions,
	streamAnthropicVertex,
	type ThinkingBudgets,
	type ThinkingLevel,
} from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const DEFAULT_REGION = "us-east5";

type ExtendedSimpleOptions = SimpleStreamOptions & {
	project?: string;
	vertexProject?: string;
	region?: string;
	vertexRegion?: string;
	location?: string;
};

function supportsAdaptiveThinking(modelId: string): boolean {
	return modelId.includes("opus-4-6") || modelId.includes("opus-4.6");
}

function mapThinkingLevelToEffort(level: SimpleStreamOptions["reasoning"]): AnthropicVertexEffort {
	switch (level) {
		case "minimal":
		case "low":
			return "low";
		case "medium":
			return "medium";
		case "high":
			return "high";
		case "xhigh":
			return "max";
		default:
			return "high";
	}
}

function clampReasoning(level: ThinkingLevel): Exclude<ThinkingLevel, "xhigh"> {
	return level === "xhigh" ? "high" : level;
}

function adjustMaxTokensForThinking(
	baseMaxTokens: number,
	modelMaxTokens: number,
	reasoningLevel: ThinkingLevel,
	customBudgets?: ThinkingBudgets,
): { maxTokens: number; thinkingBudget: number } {
	const defaultBudgets: ThinkingBudgets = {
		minimal: 1024,
		low: 2048,
		medium: 8192,
		high: 16384,
	};
	const budgets = { ...defaultBudgets, ...customBudgets };
	const minOutputTokens = 1024;
	const level = clampReasoning(reasoningLevel);

	let thinkingBudget = budgets[level] ?? defaultBudgets.high!;
	const maxTokens = Math.min(baseMaxTokens + thinkingBudget, modelMaxTokens);

	if (maxTokens <= thinkingBudget) {
		thinkingBudget = Math.max(0, maxTokens - minOutputTokens);
	}

	return { maxTokens, thinkingBudget };
}

function looksLikeProjectId(value: string): boolean {
	return /^[a-z][a-z0-9-]{4,61}[a-z0-9]$/.test(value);
}

function resolveProject(options: ExtendedSimpleOptions): string | undefined {
	const explicit = options.project ?? options.vertexProject;
	if (explicit) {
		return explicit;
	}

	const envProject =
		process.env.GOOGLE_CLOUD_PROJECT ?? process.env.GCLOUD_PROJECT ?? process.env.ANTHROPIC_VERTEX_PROJECT_ID;
	if (envProject) {
		return envProject;
	}

	if (options.apiKey && looksLikeProjectId(options.apiKey)) {
		return options.apiKey;
	}

	return undefined;
}

function resolveRegion(options: ExtendedSimpleOptions): string {
	const explicit = options.region ?? options.vertexRegion ?? options.location;
	if (explicit) {
		return explicit;
	}

	return process.env.GOOGLE_CLOUD_LOCATION ?? process.env.CLOUD_ML_REGION ?? DEFAULT_REGION;
}

function buildBaseOptions(
	model: Model<"anthropic-vertex">,
	options: ExtendedSimpleOptions,
	project: string | undefined,
	region: string,
): AnthropicVertexOptions {
	return {
		temperature: options.temperature,
		maxTokens: options.maxTokens ?? Math.min(model.maxTokens, 32000),
		signal: options.signal,
		apiKey: options.apiKey,
		cacheRetention: options.cacheRetention,
		sessionId: options.sessionId,
		headers: options.headers,
		onPayload: options.onPayload,
		maxRetryDelayMs: options.maxRetryDelayMs,
		metadata: options.metadata,
		...(project ? { project } : {}),
		region,
	};
}

function streamSimpleAnthropicVertexCompat(
	model: Model<Api>,
	context: Context,
	options?: SimpleStreamOptions,
): AssistantMessageEventStream {
	if (model.api !== "anthropic-vertex") {
		throw new Error(`Expected anthropic-vertex api, got: ${model.api}`);
	}

	const anthropicModel = model as Model<"anthropic-vertex">;
	const extended = (options ?? {}) as ExtendedSimpleOptions;
	const project = resolveProject(extended);
	const region = resolveRegion(extended);
	const base = buildBaseOptions(anthropicModel, extended, project, region);

	if (!extended.reasoning) {
		return streamAnthropicVertex(anthropicModel, context, {
			...base,
			thinkingEnabled: false,
		});
	}

	if (supportsAdaptiveThinking(anthropicModel.id)) {
		const effort = mapThinkingLevelToEffort(extended.reasoning);
		return streamAnthropicVertex(anthropicModel, context, {
			...base,
			thinkingEnabled: true,
			effort,
		});
	}

	const adjusted = adjustMaxTokensForThinking(
		base.maxTokens ?? 0,
		anthropicModel.maxTokens,
		extended.reasoning,
		extended.thinkingBudgets,
	);

	return streamAnthropicVertex(anthropicModel, context, {
		...base,
		maxTokens: adjusted.maxTokens,
		thinkingEnabled: true,
		thinkingBudgetTokens: adjusted.thinkingBudget,
	});
}

export default function registerAnthropicVertexCompat(pi: ExtensionAPI): void {
	pi.registerProvider("anthropic-vertex", {
		api: "anthropic-vertex",
		apiKey: "ANTHROPIC_VERTEX_PROJECT_ID",
		streamSimple: streamSimpleAnthropicVertexCompat,
	});
}
