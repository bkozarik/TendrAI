import anthropic
import json
import os

client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

async def score_tender(tender, company) -> dict:
    """Score a tender against a company profile using Claude."""
    prompt = f"""Jsi expert na veřejné zakázky v České republice. Analyzuj tuto zakázku pro danou firmu.

ZAKÁZKA:
Název: {tender.title}
Zadavatel: {tender.contracting_authority}
Hodnota: {tender.value_czk:,.0f} Kč
Deadline: {tender.deadline}
Kraj: {tender.region}
CPV: {tender.cpv_name} ({tender.cpv_code})
Typ řízení: {tender.procedure_type}
Popis: {tender.description or 'Není k dispozici'}

PROFIL FIRMY:
Název: {company.name}
Počet zaměstnanců: {company.employee_count}
Roční obrat: {company.annual_revenue_czk or 'neuvedeno'} Kč
Regiony: {', '.join(company.regions or ['všechny'])}
Specializace: {', '.join(company.categories or [])}

Odpověz POUZE jako JSON objekt (bez markdown):
{{
  "score": <číslo 0-100>,
  "match_reason": "<1-2 věty proč je zakázka vhodná/nevhodná>",
  "requirements": ["<klíčový požadavek 1>", "<klíčový požadavek 2>", "<klíčový požadavek 3>"],
  "risks": ["<riziko 1>", "<riziko 2>"],
  "recommendation": "apply" | "consider" | "skip",
  "cover_letter_hint": "<1 věta o hlavním argumentu průvodního dopisu>"
}}"""

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}]
    )
    text = message.content[0].text.strip()
    try:
        data = json.loads(text)
    except Exception:
        data = {
            "score": 50,
            "match_reason": "Analýza momentálně nedostupná.",
            "requirements": [],
            "risks": [],
            "recommendation": "consider",
            "cover_letter_hint": ""
        }
    return {"score": data.get("score", 50), "analysis": json.dumps(data, ensure_ascii=False)}

async def generate_cover_letter(tender, company) -> str:
    """Generate a cover letter for a tender application."""
    prompt = f"""Napiš profesionální průvodní dopis k nabídce veřejné zakázky v češtině.

Zakázka: {tender.title}
Zadavatel: {tender.contracting_authority}
Firma: {company.name}, {company.employee_count} zaměstnanců
Specializace: {', '.join(company.categories or [])}

Dopis musí být:
- Formální, profesionální
- Max 200 slov
- Konkrétní a přesvědčivý
- Zdůrazňovat zkušenosti firmy

Napiš pouze text dopisu, bez předmětu a záhlaví."""

    message = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}]
    )
    return message.content[0].text.strip()
