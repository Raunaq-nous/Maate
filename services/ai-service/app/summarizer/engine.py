"""AI Summarization Engine."""
import logging

logger = logging.getLogger(__name__)

# Prompt templates by document type
PROMPTS = {
    "lab_report": """You are a medical report analyst helping patients understand their lab results.
Summarize the following lab report in plain, compassionate language.
For each parameter, indicate if it's normal, low, high, or critical.
Include actionable recommendations.
Always add a disclaimer that this is AI-generated and not medical advice.

Lab Data: {data}
Locale: {locale}""",
    "prescription": """Summarize this prescription in simple language.
List each medication with: name, dosage, frequency, purpose (if inferrable).
Flag any potential interactions.

Prescription Data: {data}""",
    "discharge_summary": """Summarize this hospital discharge summary for the patient.
Highlight: diagnosis, procedures performed, medications, follow-up instructions.

Discharge Data: {data}""",
}


class SummarizerEngine:
    """Generate patient-friendly summaries of medical documents."""

    async def summarize(
        self,
        structured_data: dict,
        document_type: str,
        locale: str = "en-IN",
    ) -> dict:
        """
        Summarize medical data using OpenAI GPT-4o.
        """
        import os
        from openai import AsyncOpenAI
        import json

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            logger.warning("OPENAI_API_KEY not set, returning mock summary")
            return self._get_mock_summary(document_type)

        client = AsyncOpenAI(api_key=api_key)
        prompt = PROMPTS.get(document_type, PROMPTS["lab_report"])
        formatted_prompt = prompt.format(data=json.dumps(structured_data), locale=locale)

        try:
            response = await client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a helpful medical assistant that provides patient-friendly summaries of medical records. Return response in JSON format."},
                    {"role": "user", "content": formatted_prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )

            result = json.loads(response.choices[0].message.content)
            
            return {
                "summary_text": result.get("summary", ""),
                "key_findings": result.get("key_findings", []),
                "risk_flags": result.get("risk_flags", []),
                "recommendations": result.get("recommendations", []),
                "model_used": "gpt-4o",
                "disclaimer": "This summary is AI-generated for informational purposes. Always consult your doctor.",
            }
        except Exception as e:
            logger.error(f"OpenAI summarization failed: {e}")
            return self._get_mock_summary(document_type)

    def _get_mock_summary(self, document_type: str) -> dict:
        return {
            "summary_text": f"A mock summary for your {document_type}. Please configure OPENAI_API_KEY for real summaries.",
            "key_findings": ["Finding 1", "Finding 2"],
            "risk_flags": ["Normal"],
            "model_used": "mock-engine",
            "disclaimer": "Mock summary for development purposes.",
        }
