// AI-feature 2: stelt een kort, vriendelijk betalingsherinnerings-bericht op voor de promotor.
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

  let boeking;
  try {
    ({ boeking } = JSON.parse(event.body || "{}"));
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Ongeldige request." }) };
  }
  if (!boeking) {
    return { statusCode: 400, body: JSON.stringify({ error: "Geen boeking meegegeven." }) };
  }

  const systemPrompt = `Je schrijft namens een boekingsagent een kort, vriendelijk maar duidelijk WhatsApp-bericht aan een promotor
om een openstaande betaling voor een show te vragen.
Toon: informeel-professioneel Nederlands, geen aanhef zoals in een formele brief, maximaal 4 zinnen, niet overdreven
verontschuldigend, wel duidelijk het bedrag en de show noemen. Geef alleen de tekst van het bericht terug, zonder
aanhalingstekens en zonder verdere uitleg.`;

  const gebruikersInfo = `Boekinggegevens:
- Artiest: ${boeking.artiest || "onbekend"}
- Promotor: ${boeking.promotor || "onbekend"}
- Datum show: ${boeking.datum || "onbekend"}
- Gage: €${boeking.gage ?? "onbekend"}
- Status: ${boeking.status || "onbekend"}
- Notitie: ${boeking.notitie || "-"}`;

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
        max_tokens: 250,
        system: systemPrompt,
        messages: [{ role: "user", content: gebruikersInfo }],
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
    const tekst = (data.content || []).map((b) => b.text || "").join("").trim();

    return { statusCode: 200, body: JSON.stringify({ tekst }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: "Onverwachte fout: " + e.message }) };
  }
};
