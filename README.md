# Boekingsoverzicht

Simpele webapp om per boeking bij te houden: artiest, promotor, datum, gage,
kosten, commissie en betaalstatus (open / betaald door promotor / uitbetaald
aan artiest). Alle boekingsdata wordt lokaal in je browser bewaard
(localStorage) — geen database, geen login.

Er zitten twee AI-features in, die via de Claude API draaien:

1. **Bericht plakken → automatisch invullen.** In het formulier plak je een
   los WhatsApp- of mailbericht ("Hoi, kunnen we Hades boeken voor 24 okt?
   Gage 900 euro, zaal Loft"), en AI haalt daar artiest, promotor, datum en
   gage uit om het formulier voor te vullen. Jij controleert en klikt zelf
   op Opslaan — er wordt nooit automatisch iets bewaard.
2. **Herinneringsbericht genereren.** Bij een boeking die nog niet is
   uitbetaald, kun je AI een kort, vriendelijk WhatsApp-berichtje laten
   opstellen richting de promotor om de betaling te vragen. Jij kopieert en
   verstuurt het zelf.

## Belangrijk: dit vraagt nu wél om een build + API-sleutel

Voor deze twee features draait er server-side code (Netlify Functions) die
de Claude API aanroept met een geheime sleutel. Dat verandert twee dingen
ten opzichte van de eerdere, pure statische versie:

- **Geen drag-and-drop meer op app.netlify.com/drop** — die manier
  ondersteunt geen Functions. Gebruik de Git-gekoppelde manier (zie
  hieronder).
- Je hebt een eigen **Anthropic API-sleutel** nodig (gratis aan te maken,
  gebruik kost wel een klein bedrag per aanroep — een paar honderdste
  eurocent per keer bij deze korte verzoeken).

## Hosten op Netlify (via GitHub)

1. Zet deze map in een GitHub-repository.
2. Maak een gratis account op [netlify.com](https://netlify.com) en ga naar
   [app.netlify.com/start](https://app.netlify.com/start).
3. Koppel je GitHub-account en kies de repository.
4. Laat het build command leeg en zet de publish directory op `.` (de
   `netlify.toml` in deze map regelt de rest, inclusief de functions-map).
5. Ga na het aanmaken van de site naar **Site configuration → Environment
   variables** en voeg een variabele toe:
   - Key: `ANTHROPIC_API_KEY`
   - Value: jouw sleutel van [platform.claude.com](https://platform.claude.com)
     (maak een gratis account, ga naar "API Keys" en maak een nieuwe sleutel
     aan)
6. Trigger een nieuwe deploy (Site configuration-wijzigingen vragen soms om
   een "Trigger deploy" via het Deploys-tabblad). Vanaf nu bouwt en
   publiceert Netlify automatisch opnieuw bij elke push.

## Lokaal testen

Voor de gewone functionaliteit (boekingen toevoegen/bewerken/filteren) is
`index.html` rechtstreeks openen of `python3 -m http.server` genoeg. De
twee AI-knoppen werken dan **niet** — je krijgt een duidelijke foutmelding
in plaats van een crash, want de Netlify Functions draaien alleen op
Netlify zelf (of lokaal via de [Netlify CLI](https://docs.netlify.com/cli/get-started/):
`npm install -g netlify-cli`, dan `netlify dev` met `ANTHROPIC_API_KEY` in
een lokaal `.env`-bestand).

## Let op

- Data staat per browser/apparaat opgeslagen. Wie de link opent op een
  andere computer of in een incognitovenster, start met een lege lijst.
- De API-sleutel staat alleen server-side (in de Netlify Function), nooit
  in de browser-code — belangrijk bij gevoelige financiële gegevens.
- Wil je later dat meerdere mensen dezelfde boekingen zien, dan heb je
  alsnog een echte database nodig — dat is bewust buiten scope gehouden.
- "Commissie %" in het formulier vult het commissiebedrag automatisch, op
  basis van de gage. Je kunt het bedrag altijd handmatig overschrijven.
