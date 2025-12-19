const ALLOWED_MODELS = new Map([
	[
		"@cf/mistral/mistral-7b-instruct-v0.2-lora",
		{ name: "Mistral 7B Instruct (LoRA)" },
	],
	[
		"@cf/meta-llama/llama-2-7b-chat-hf-lora",
		{ name: "Llama 2 7B Instruct (LoRA)" },
	],
	[
		"@cf/google/gemma-2b-it-lora",
		{ name: "Gemma 2B IT (LoRA)" },
	],
]);

function json(data, init = {}) {
	return new Response(JSON.stringify(data), {
		headers: { "Content-Type": "application/json", ...(init.headers || {}) },
		...init,
	});
}

export default {
	async fetch(request, env) {
		const url = new URL(request.url);

		// Chat endpoint
		if (url.pathname === "/chat" && request.method === "POST") {
			// If env.AI is undefined -> your binding name doesn't match
			if (!env.AI || typeof env.AI.run !== "function") {
				return json(
					{
						error:
							"Workers AI binding not found. Ensure your Workers AI binding variable name is 'AI' (or update code to match).",
					},
					{ status: 500 }
				);
			}

			let body;
			try {
				body = await request.json();
			} catch {
				return json({ error: "Invalid JSON body." }, { status: 400 });
			}

			const prompt = (body?.prompt || "").toString().trim();
			const requestedModel = (body?.model || "").toString().trim();

			if (!prompt) {
				return json({ error: "Missing 'prompt'." }, { status: 400 });
			}

			// Validate model selection (server-side safety)
			const model = ALLOWED_MODELS.has(requestedModel)
				? requestedModel
				: "@cf/mistral/mistral-7b-instruct-v0.2-lora";

			const system = [
				"You are a space theme assistent friendly and concise.",
				"Keep answers practical and structured.",
			].join(" ");

			try {
				const result = await env.AI.run(model, {
					messages: [
						{ role: "system", content: system },
						{ role: "user", content: prompt },
					],
					temperature: 0.7,
					max_tokens: 512,
				});

				// Cloudflare AI models often return { response: "..." }
				const reply =
					(result && typeof result.response === "string" && result.response) ||
					(result && typeof result.result === "string" && result.result) ||
					(result && typeof result.text === "string" && result.text) ||
					JSON.stringify(result);

				return json({ reply, model });
			} catch (err) {
				return json(
					{
						error:
							"AI run failed. Check Workers logs. (Common causes: model not available on your plan, or binding misconfig.)",
					},
					{ status: 500 }
				);
			}
		}

		// Fallback to static UI (Assets)
		return env.ASSETS.fetch(request);
	},
};
