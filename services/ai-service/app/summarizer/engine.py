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
4. PHYSIOLOGICAL PLAUSIBILITY SAFETY NET (MANDATORY PATIENT SAFETY GUARDRAIL):
   Evaluate all extracted values against known physiologically plausible human ranges:
   - Hemoglobin: Plausible adult range: 3.0 to 25.0 g/dL (typical normal 11.5–17.5 g/dL). Values > 25 g/dL (e.g. 142 g/dL) are physiologically impossible in human blood and represent an OCR decimal-point drop (e.g. 14.2 g/dL) or unit confusion with g/L.
   - Creatinine: Plausible range: 0.2 to 20.0 mg/dL (typical normal 0.5–1.4 mg/dL). Two-digit values with a leading zero like '09' or '07' represent an OCR decimal-point drop (e.g. 0.9, 0.7 mg/dL).
   - Glucose: Plausible range: 30 to 1000 mg/dL (fasting normal 70–99 mg/dL).
   - HbA1c: Plausible range: 3.5% to 20.0% (normal 4.0–5.6%). Two-digit integers like 74% are missing a decimal for 7.4%.
   - Cholesterol: Plausible range: 50 to 800 mg/dL (desirable < 200 mg/dL).
   
   RULE FOR PLAUSIBILITY VIOLATIONS / OCR ARTIFACTS:
   When an extracted value falls outside any plausible range for that parameter, OR exhibits an obvious OCR decimal-loss artifact (e.g. Hemoglobin 142 g/dL or Creatinine 09 mg/dL):
   - You MUST NOT assert a confident clinical severity (such as 'critical', 'high', or 'normal').
   - You MUST classify its status as 'needs_verification'.
   - In 'note', explain clearly: "This value (<val> <unit>) appears inconsistent with expected human ranges for <parameter> and is likely an OCR data extraction artifact (e.g. missing decimal point). Please verify against your original physical laboratory report."
   - In 'risk_flags', do NOT generate an alarming 'critical' emergency warning for plausible OCR errors. If included in risk_flags, set severity strictly to 'needs_verification'.
   - In 'layperson_summary', reassure the patient that the number appears to be a scanning/formatting discrepancy rather than a confirmed medical emergency.
   - Do NOT silently drop the value — preserve it as extracted while marking it clearly as 'needs_verification'.

5. Return your response STRICTLY as a valid JSON object matching this schema:
{
  "summary": "Concise clinical summary strictly scoped to the provided extracted findings",
  "layperson_summary": "Plain, compassionate language explanation for the patient",
  "key_findings": [
    {
      "parameter": "string",
      "value": "string",
      "unit": "string",
      "status": "normal|low|high|critical|needs_verification",
      "note": "string"
    }
  ],
  "risk_flags": [
    {
      "parameter": "string",
      "severity": "mild|moderate|critical|needs_verification",
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

Provide an objective summary strictly scoped to these extracted test parameters. Apply physiological plausibility guardrails for any potential OCR artifacts.""",
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

# Programmatic physiological bounds for common parameters recognized by NER
PHYSIOLOGICAL_BOUNDS = {
    "hemoglobin": {"min": 3.0, "max": 25.0, "unit_pattern": r"g/?dl"},
    "creatinine": {"min": 0.2, "max": 20.0, "unit_pattern": r"mg/?dl"},
    "glucose": {"min": 30.0, "max": 1000.0, "unit_pattern": r"mg/?dl"},
    "hba1c": {"min": 3.5, "max": 20.0, "unit_pattern": r"%"},
    "cholesterol": {"min": 50.0, "max": 800.0, "unit_pattern": r"mg/?dl"},
}


class SummarizerEngine:
    """Generate patient-friendly summaries of medical documents using Groq / OpenAI."""

    @staticmethod
    def _apply_plausibility_safety_net(result: dict) -> dict:
        """
        Deterministic safety net: inspects key_findings and risk_flags.
        If any value is outside physiological bounds or matches leading-zero OCR artifacts,
        enforces 'needs_verification' status and demotes any alarming 'critical' risk flags.
        """
        key_findings = result.get("key_findings", [])
        risk_flags = result.get("risk_flags", [])
        flagged_params = set()

        for finding in key_findings:
            param = str(finding.get("parameter", "")).strip().lower()
            val_str = str(finding.get("value", "")).strip()

            if param in PHYSIOLOGICAL_BOUNDS:
                bounds = PHYSIOLOGICAL_BOUNDS[param]
                is_suspicious = False

                # Check 1: Leading-zero integer artifacts like '09', '07'
                if len(val_str) == 2 and val_str.startswith("0") and val_str.isdigit():
                    is_suspicious = True

                # Check 2: Numeric range violation
                try:
                    num_val = float(val_str)
                    if num_val < bounds["min"] or num_val > bounds["max"]:
                        is_suspicious = True
                except (ValueError, TypeError):
                    pass

                if is_suspicious:
                    finding["status"] = "needs_verification"
                    param_display = finding.get("parameter", param.capitalize())
                    unit_display = finding.get("unit", "")
                    finding["note"] = (
                        f"This value ({val_str} {unit_display}) appears inconsistent with expected "
                        f"human ranges for {param_display} and is likely an OCR extraction artifact "
                        f"(e.g. missing decimal point). Please verify against your original physical report."
                    )
                    flagged_params.add(param)

        # Sanitize risk_flags: demote critical flags on flagged OCR artifact parameters
        sanitized_risk_flags = []
        for flag in risk_flags:
            flag_param = str(flag.get("parameter", "")).strip().lower()
            if flag_param in flagged_params:
                flag["severity"] = "needs_verification"
                flag["recommendation"] = (
                    f"Verify the {flag.get('parameter', flag_param.capitalize())} value against "
                    "your physical report or with your healthcare provider."
                )
            sanitized_risk_flags.append(flag)

        result["key_findings"] = key_findings
        result["risk_flags"] = sanitized_risk_flags
        return result

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

            # Apply physiological plausibility safety net
            result = self._apply_plausibility_safety_net(result)

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

