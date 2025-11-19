// Copy this code into your Cloudflare Worker script

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json",
    };

    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const apiKey = env.OPENAI_API_KEY; // Secret must be set in Cloudflare as `OPENAI_API_KEY`
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: corsHeaders,
        }
      );
    }

    let userInput;
    try {
      userInput = await request.json();
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    if (!userInput || !Array.isArray(userInput.messages)) {
      return new Response(
        JSON.stringify({ error: "Request JSON must include `messages` array" }),
        {
          status: 400,
          headers: corsHeaders,
        }
      );
    }

    // Optional mapping of prompt IDs to server-side prompt text.
    // Add or update entries here for any prompt IDs you want the Worker to apply.
    // Keep prompt text on the server so prompt contents are not exposed client-side.
    const PROMPT_MAP = {
      // Example: the prompt id you provided maps to a L'Oreal-specific system prompt.
      pmpt_6917a02cf2348195866beb5afc5b17e001a29ff11676546b:
        "i need to bot to recognize all of the Loreal brands instead of just recognizing Loreal as a stand alone brand. Pease recognize these brands and do not exclude them. Consumer Products L’Oréal Paris L'Oréal+2L'Oréal Finance+2 Garnier 欧莱雅财务 Maybelline New York 欧莱雅财务 NYX Professional Makeup L'Oréal+1 Essie Review Stylenanda (3CE) L'Oréal Dark & Lovely 欧莱雅财务 Mixa Review Niely 欧莱雅财务 Magic Review Carol’s Daughter Wikipedia Thayers L'Oréal Finance L’Oréal Luxe Some of their luxury and prestige-beauty brands: Lancôme L'Oréal Finance+1 Yves Saint Laurent Beauté L'Oréal Finance Giorgio Armani Beauty / Armani Beauty Packaging+1 Kiehl’s Since 1851 L'Oréal Finance Helena Rubinstein L'Oréal Finance Aesop L'Oréal Finance Biotherm L'Oréal Finance Valentino (Beauty) L'Oréal Finance Prada (Beauty) L'Oréal Finance Shu Uemura Beauty Packaging IT Cosmetics L'Oréal Finance Mugler L'Oréal Finance Ralph Lauren (Beauty) Beauty Packaging Urban Decay L'Oréal Finance Azzaro L'Oréal Finance Maison Margiela (Beauty) L'Oréal Finance Viktor & Rolf L'Oréal Finance Takami L'Oréal Finance Diesel Beauty Packaging Miu Miu (recently added) L'Oréal Dermatological / Active Cosmetics These are more clinically / dermo-oriented: La Roche-Posay Review Vichy Encyclopedia Britannica CeraVe L'Oréal SkinCeuticals Encyclopedia Britannica Professional Products These are more salon / hair-care professional-grade: L’Oréal Professionnel L'Oréal Finance Kérastase L'Oréal Finance Redken L'Oréal Finance Matrix L'Oréal Finance Pureology L'Oréal Finance Pulp Riot L'Oréal Finance Biolage L'Oréal Finance Shu Uemura Art of Hair L'Oréal Finance Mizani L'Oréal Finance i want it to do all of this while being stephen a smith and talking as if its talking to the first take audience",
    };

    // If the client sent a prompt_id, and we have a mapping, prepend it as a system message.
    if (userInput.prompt_id && PROMPT_MAP[userInput.prompt_id]) {
      // Prepend system message so it influences the assistant's behavior
      userInput.messages.unshift({
        role: "system",
        content: PROMPT_MAP[userInput.prompt_id],
      });
    }

    const apiUrl = "https://api.openai.com/v1/chat/completions";
    const requestBody = {
      model: "gpt-4o",
      messages: userInput.messages,
      max_tokens: 300,
    };

    // Forward any optional fields from the client (e.g., prompt_id)
    // but don't allow overriding the model or apiKey
    for (const key of Object.keys(userInput)) {
      if (key === "messages") continue;
      if (key === "model") continue;
      if (key === "apiKey" || key === "OPENAI_API_KEY") continue;
      requestBody[key] = userInput[key];
    }

    let openaiResponse;
    try {
      openaiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    } catch (err) {
      return new Response(
        JSON.stringify({
          error: "Failed to reach OpenAI",
          details: err.message,
        }),
        {
          status: 502,
          headers: corsHeaders,
        }
      );
    }

    const text = await openaiResponse.text();
    const status = openaiResponse.status || 502;

    // Forward OpenAI response (JSON or plain text) back to the client
    return new Response(text, { status, headers: corsHeaders });
  },
};
