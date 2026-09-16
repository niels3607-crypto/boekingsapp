// AI-feature 1: haalt boekingsgegevens uit een geplakt WhatsApp-/mailbericht.
// Draait server-side op Netlify zodat de Anthropic API-sleutel nooit in de browser staat.

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Alleen POST toegestaan." }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "ANTHROPIC_API_KEY ontbreekt in de Netlify-omgevingsvariabelen." }),
    };
  }

  let tekst;
  try {
    ({ tekst } = JSON.parse(event.body || "{}"));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Ongeldige request." }) };
  }
  if (!tekst || !tekst.trim()) {
    return { statusCode: 400, body: JSON.stringify({ error: "Geen tekst meegegeven." }) };
  }

  const vandaag = new Date().toISOString().slice(0, 10);

  const systemPrompt = `Je haalt boekingsgegevens voor een DJ-/artiestenagent uit een los WhatsApp- of e-mailbericht.
Geef ALLEEN geldige JSON terug, zonder uitleg en zonder markdown-codeblok, met exact deze velden:
{
  "artiest": string of null,
  "promotor": string of null,
  "datum": string of null,   // formaat YYYY-MM-DD. Vandaag is ${vandaag}; als alleen dag en maand genoemd worden en die datum al voorbij is dit jaar, gebruik dan volgend jaar.
  "gage": number of null,    // alleen het getal, zonder euroteken
  "notitie": string of null  // eventuele overige relevante details in maximaal één zin
}
Gebruik null voor een veld als je het niet met redelijke zekerheid uit de tekst kan halen. Verzin nooit gegevens die niet in de tekst staan.`;

  try {
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: "user", content: tekst }],
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "AI-service gaf een fout terug.", detail: errText.slice(0, 300) }),
      };
    }

    const data = await resp.json();
    const raw = (data.content || []).map((b) => b.text || "").join("").trim();
    const cleaned = raw.replace(/^```json\s*|^```\s*|```$/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "Kon het AI-antwoord niet lezen.", raw: cleaned.slice(0, 300) }),
      };
    }

    return { statusCode: 200, body: JSON.stringify(parsed) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Onverwachte fout: " + e.message }) };
  }
};
