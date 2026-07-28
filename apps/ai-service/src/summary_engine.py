# ============================================
# AI Service — Summary Engine
# Powered by OpenAI GPT-4o
# ============================================

import os
import json
from openai import AsyncOpenAI
from src.summary_models import ReportSummary, SummarizeRequest
import logging

logger = logging.getLogger(__name__)

SUMMARY_PROMPT = """
You are an expert Clinical Pathologist and Patient Communicator. 
Your task is to summarize a medical lab report accurately and safely.

CONSTRAINTS:
1. NO HALLUCINATION: Only use information present in the OCR text. If a value is missing, say "Not detected".
2. RISK DETECTION: Flag any value outside the reference range as is_abnormal=true.
3. TREND ANALYSIS: If historical context is provided, compare current values to previous ones.
4. CITATIONS: Provide exact quotes from the text for every key finding.
5. TONE: The 'layperson_summary' must be empathetic and simple (6th-grade level). The 'clinical_summary' must be precise.
6. GUARDRAIL: Include a 'hallucination_check' by self-verifying every extracted number against the raw OCR text.

OUTPUT SCHEMA:
Return a valid JSON object matching the ReportSummary model.
"""

class SummaryEngine:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o")

    async def summarize(self, req: SummarizeRequest) -> ReportSummary:
        """Generate structured AI summary with trend analysis and guardrails"""
        try:
            # Construct context-aware prompt
            context_str = f"Document Type: {req.document_type}\n"
            if req.historical_context:
                context_str += f"Historical Trends: {json.dumps(req.historical_context)}\n"
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": SUMMARY_PROMPT},
                    {"role": "user", "content": f"{context_str}\n\nRaw OCR Text:\n{req.ocr_text}"}
                ],
                response_format={"type": "json_object"},
                temperature=0.0  # Zero temperature for maximum grounding
            )

            content = response.choices[0].message.content
            structured_json = json.loads(content)
            
            # Post-processing: Add confidence score based on LLM's own self-check or logprobs if available
            # For now, we trust the deterministic output at temp 0
            
            return ReportSummary(**structured_json)

        except Exception as e:
            logger.error(f"Summarization failed: {str(e)}")
            raise e
