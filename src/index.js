export default {
	async fetch(request, env, ctx) {
		const url = new URL(request.url);

		if (url.pathname === "/chat" && request.method === "POST") {
			const { prompt } = await request.json();

			const result = await env.AI.run(
				"@cf/mistral/mistral-7b-instruct-v0.2-lora",
				{
					messages: [
						{
							role: "system",
							content: "You are a friendly, concise, space-themed assistant."
						},
						{
							role: "user",
							content: prompt
						}
					],
					temperature: 0.7,
					max_tokens: 512
				}
			);

			return new Response(
				JSON.stringify({ reply: result.response }),
				{ headers: { "Content-Type": "application/json" } }
			);
		}

		// fallback to static UI
		return env.ASSETS.fetch(request);
	},
};
