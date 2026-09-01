"""AI Summarization Engine — Patient-friendly clinical report summarizer with safety guardrails."""
import json
import logging
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a clinical report analyst for the Maate health platform helping patients understand their medical records.
Follow these strict safety, regulatory, and clinical guardrails:
1. NEVER diagnose any disease or medical condition.
2. NEVER prescribe medication, recommend pharmaceuticals, or alter dosages.
3. EXPLICIT SCOPING: Base your findings and summary STRICTLY AND ONLY on the extracted parameters provided in the prompt. Do NOT assume unmentioned tests are normal or that the provided data represents the entire physical document. Explicitly state the summary covers only the extracted findings.
4. For each parameter, objectively classify status as 'normal', 'low', 'high', or 'critical' compared to standard reference ranges.
5. Highlight abnormal values compassionately and advise discussing them with a licensed healthcare provider.
6. Provide a compassionate, clear layperson explanation suitable for a patient without medical training.
7. Return your response STRICTLY as a valid JSON object matching this schema:
{
  "summary": "Concise clinical summary strictly scoped to the provided extracted findings",
  "layperson_summary": "Plain, compassionate language explanation for the patient",
  "key_findings": [
    {
      "parameter": "string",
      "value": "string",
      "unit": "string",
      "status": "normal|low|high|critical",
      "note": "string"
    }
  ],
  "risk_flags": [
    {
      "parameter": "string",
      "severity": "mild|moderate|critical",
      "recommendation": "string"
    }
  ],
  "recommendations": ["string"],
  "scope_note": "Summary is strictly limited to the extracted parameters above."
}"""

USER_PROMPTS = {
    "lab_report": """Document Type: Laboratory Report
Patient Locale: {locale}
Extracted Data:
{data}

Provide an objective summary strictly scoped to these extracted test parameters. Remind the patient to discuss any abnormalities with their doctor.""",
    "prescription": """Document Type: Prescription
Patient Locale: {locale}
Extracted Data:
{data}

Provide an objective summary of the extracted medications, schedules, and precautions strictly based on the extracted text. Remind the patient to follow their doctor's and pharmacist's instructions.""",
    "discharge_summary": """Document Type: Hospital Discharge Summary
Patient Locale: {locale}
Extracted Data:
{data}

Provide an objective summary highlighting extracted diagnosis statements, procedures, medications, and follow-up instructions strictly as extracted. Remind the patient to attend all scheduled follow-ups.""",
}


class SummarizerEngine:
    """Generate patient-friendly summaries of medical documents using Groq / OpenAI."""

    async def summarize(
        self,
        structured_data: dict,
        document_type: str,
        locale: str = "en-IN",
    ) -> dict:
        """
        Summarize medical data using Groq (primary) or OpenAI (fallback).
        """
        # 1. Determine active LLM provider
        client: AsyncOpenAI | None = None
        model_used: str = "mock-engine"

        if settings.GROQ_API_KEY:
            client = AsyncOpenAI(
                api_key=settings.GROQ_API_KEY,
                base_url=settings.GROQ_BASE_URL,
            )
            model_used = settings.GROQ_MODEL
        elif settings.OPENAI_API_KEY:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            model_used = settings.OPENAI_MODEL
        else:
            logger.warning("Neither GROQ_API_KEY nor OPENAI_API_KEY is configured. Returning mock summary.")
            return self._get_mock_summary(document_type)

        # 2. Format user prompt
        prompt_template = USER_PROMPTS.get(document_type, USER_PROMPTS["lab_report"])
        user_prompt = prompt_template.format(
            data=json.dumps(structured_data, indent=2),
            locale=locale,
        )

        try:
            response = await client.chat.completions.create(
                model=model_used,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )

            content = response.choices[0].message.content or "{}"
            result = json.loads(content)
            usage = response.usage

            return {
                "summary_text": result.get("summary", ""),
                "layperson_summary": result.get("layperson_summary", result.get("summary", "")),
                "key_findings": result.get("key_findings", []),
                "risk_flags": result.get("risk_flags", []),
                "recommendations": result.get("recommendations", []),
                "model_used": model_used,
                "model_version": "1.0",
                "is_mock": False,
                "disclaimer": "This summary is AI-generated for informational purposes. Always consult your doctor for medical advice.",
                "scope_note": result.get("scope_note", "Summary is strictly limited to the extracted parameters above."),
                "prompt_tokens": usage.prompt_tokens if usage else None,
                "completion_tokens": usage.completion_tokens if usage else None,
            }
        except Exception as e:
            logger.error(f"LLM summarization failed with model {model_used}: {e}")
            return self._get_mock_summary(document_type)

    def _get_mock_summary(self, document_type: str) -> dict:
        return {
            "summary_text": f"[MOCK SUMMARY] A simulated mock summary for your {document_type}. Please configure a valid GROQ_API_KEY or OPENAI_API_KEY for real clinical analysis.",
            "layperson_summary": f"[MOCK SUMMARY] Simulated plain language summary for your {document_type}.",
            "key_findings": [
                {"parameter": "Simulated Parameter", "value": "N/A", "unit": "", "status": "normal", "note": "Simulated finding"}
            ],
            "risk_flags": [],
            "recommendations": ["Configure a real LLM API key to view real clinical summaries."],
            "model_used": "mock-engine",
            "model_version": "0.1",
            "is_mock": True,
            "disclaimer": "[MOCK DISCLAIMER] This summary is AI-simulated mock data for development purposes only and does not reflect real medical findings.",
            "scope_note": "Mock summary — no actual clinical data processed.",
            "prompt_tokens": 0,
            "completion_tokens": 0,
        }

