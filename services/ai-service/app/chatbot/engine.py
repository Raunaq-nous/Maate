"""AI Chatbot Engine — Grounded clinical RAG health assistant with safety guardrails."""
import json
import logging
from typing import Any, Dict, List, Optional
from openai import AsyncOpenAI
from app.config import settings

logger = logging.getLogger(__name__)

CHAT_SYSTEM_PROMPT = """You are Maate Health Assistant, an empathetic, highly accurate clinical AI assistant helping patients and caregivers understand their health records.

FOLLOW THESE STRICT CLINICAL SAFETY AND ACCURACY RULES:
1. GROUNDING & FIDELITY:
   - Base your answers STRICTLY AND ONLY on the patient's retrieved medical documents, laboratory reports, vital signs, active medications, and chronic conditions provided in the prompt context.
   - If a requested parameter, test, or condition is NOT present in the provided context, state clearly and honestly that it is not found in their current uploaded records. NEVER guess, speculate, or fabricate medical facts.

2. MEDICAL SAFETY & SCOPE:
   - NEVER make definitive new diagnoses or tell a patient they definitely have a new disease.
   - NEVER prescribe medications, change dosage regimens, or advise discontinuing prescribed treatments.
   - For abnormal or out-of-range parameters, explain what the test generally measures in plain, compassionate language and advise discussing the findings with their healthcare provider.

3. CITATIONS & SOURCES:
   - When referencing specific lab numbers, dates, or physician instructions from the documents, clearly mention the source document (e.g. "[CBC Report, 15 Apr 2026]").
   
4. TONE & STRUCTURE:
   - Use clear, warm, patient-friendly language.
   - Use markdown bullet points and bold highlights for readability.
   - When appropriate, conclude with helpful next steps or questions to ask their doctor.
"""

class ChatbotEngine:
    """Clinical chatbot engine with RAG context integration and emergency guardrails."""

    EMERGENCY_KEYWORDS = [
        "suicide",
        "kill myself",
        "end my life",
        "heart attack",
        "stroke",
        "emergency",
        "dying",
        "chest pain",
        "severe chest pressure",
        "severe bleeding",
        "cannot breathe",
        "trouble breathing",
        "unconscious",
        "overdose",
        "anaphylaxis",
        "poisoning",
    ]

    async def respond(
        self,
        user_id: str,
        message: str,
        session_id: str,
        history: Optional[List[Dict[str, str]]] = None,
        context_chunks: Optional[List[Dict[str, Any]]] = None,
        health_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Process a user message:
        1. Emergency Keyword Intercept -> immediate 112 emergency redirect.
        2. Format RAG context (document chunks, vitals, medications, conditions).
        3. Invoke Groq (or OpenAI / Mock fallback) with clinical guardrails.
        4. Extract response, source citations, and follow-up suggestion chips.
        """
        lower_msg = message.lower()

        # ─── 1. Emergency Safety Intercept ─────────────────────────────────────
        if any(kw in lower_msg for kw in self.EMERGENCY_KEYWORDS):
            logger.warning(f"Emergency keyword detected in session {session_id} for user {user_id}")
            return {
                "role": "assistant",
                "content": (
                    "⚠️ **This sounds like a medical emergency.**\n\n"
                    "Please call **112 (India National Emergency)** or your local emergency number immediately, "
                    "or visit the nearest emergency room. If someone is with you, ask them for immediate assistance."
                ),
                "metadata": {
                    "is_emergency": True,
                    "sources": [],
                    "suggestions": ["Call 112 Emergency", "Nearest Hospital", "Contact Emergency Contact"],
                },
            }

        # ─── 2. Assemble RAG Context ──────────────────────────────────────────
        context_sections = []
        sources = []

        # Structured health profile
        if health_profile:
            hp_parts = []
            if health_profile.get("conditions"):
                hp_parts.append(f"• Chronic Conditions: {', '.join(health_profile['conditions'])}")
            if health_profile.get("medications"):
                hp_parts.append(f"• Active Medications: {', '.join(health_profile['medications'])}")
            if health_profile.get("latest_vitals"):
                vitals_str = ", ".join([f"{k}: {v}" for k, v in health_profile["latest_vitals"].items()])
                hp_parts.append(f"• Latest Vitals: {vitals_str}")
            if health_profile.get("allergies"):
                hp_parts.append(f"• Known Allergies: {', '.join(health_profile['allergies'])}")
            if hp_parts:
                context_sections.append("### Patient Health Profile:\n" + "\n".join(hp_parts))

        # Retrieved Document Chunks
        if context_chunks:
            chunk_texts = []
            for i, chunk in enumerate(context_chunks):
                doc_title = chunk.get("documentTitle") or chunk.get("title") or "Medical Document"
                doc_type = chunk.get("documentType") or "Record"
                doc_date = chunk.get("documentDate") or ""
                content = chunk.get("content", "").strip()
                score = chunk.get("score")
                
                chunk_header = f"Document [{i+1}]: {doc_title} ({doc_type})" + (f" - Date: {doc_date}" if doc_date else "")
                chunk_texts.append(f"{chunk_header}\nContent: {content}")

                sources.append({
                    "id": chunk.get("id") or chunk.get("documentId"),
                    "title": doc_title,
                    "documentType": doc_type,
                    "documentDate": doc_date,
                    "snippet": content[:160] + "..." if len(content) > 160 else content,
                    "score": round(score, 3) if isinstance(score, (int, float)) else None,
                })
            
            if chunk_texts:
                context_sections.append("### Retrieved Medical Document Excerpts:\n" + "\n\n".join(chunk_texts))

        context_prompt_text = "\n\n".join(context_sections) if context_sections else "No relevant medical documents or records found in user profile."

        # ─── 3. LLM Generation ────────────────────────────────────────────────
        client: AsyncOpenAI | None = None
        model_name: str = "mock-engine"

        if settings.GROQ_API_KEY:
            client = AsyncOpenAI(api_key=settings.GROQ_API_KEY, base_url=settings.GROQ_BASE_URL)
            model_name = settings.GROQ_MODEL
        elif settings.OPENAI_API_KEY:
            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            model_name = settings.OPENAI_MODEL

        if not client:
            # Fallback when no LLM key configured
            logger.warning("No LLM key configured for ChatbotEngine; returning context-aware template response.")
            return {
                "role": "assistant",
                "content": (
                    "I reviewed your records. Based on your available documents:\n\n"
                    f"{context_prompt_text[:300]}...\n\n"
                    "*(Note: AI service is operating in local demonstration mode. Consult your physician for medical guidance.)*"
                ),
                "metadata": {
                    "is_emergency": False,
                    "sources": sources[:3],
                    "suggestions": ["Explain my medications", "View recent reports", "Contact doctor"],
                },
            }

        # Build messages payload for Groq / OpenAI
        api_messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]

        # Include prior conversation history (up to last 6 turns)
        if history:
            for turn in history[-6:]:
                role = "user" if turn.get("role") in ["user", "USER"] else "assistant"
                content = turn.get("content", "")
                if content:
                    api_messages.append({"role": role, "content": content})

        # Inject context in user prompt
        user_turn_content = (
            f"--- RELEVANT PATIENT RECORDS & CONTEXT ---\n"
            f"{context_prompt_text}\n"
            f"--- END CONTEXT ---\n\n"
            f"Patient / Caregiver Question: {message}"
        )
        api_messages.append({"role": "user", "content": user_turn_content})

        try:
            logger.info(f"Calling LLM ({model_name}) for chat session {session_id}...")
            response = await client.chat.completions.create(
                model=model_name,
                messages=api_messages,
                temperature=0.1,
                max_tokens=800,
            )
            raw_content = response.choices[0].message.content or ""
            
            # Generate 2-3 dynamic suggestion chips based on context
            suggestions = self._generate_suggestions(message, context_chunks, health_profile)

            return {
                "role": "assistant",
                "content": raw_content.strip(),
                "metadata": {
                    "is_emergency": False,
                    "sources": sources,
                    "suggestions": suggestions,
                    "model": model_name,
                },
            }
        except Exception as e:
            logger.error(f"Chat completion failed: {e}", exc_info=True)
            # Safe clinical fallback
            return {
                "role": "assistant",
                "content": (
                    "I apologize, but I encountered an issue retrieving complete analysis right now. "
                    "Your health records remain safely recorded in your profile. Please try your question again."
                ),
                "metadata": {
                    "is_emergency": False,
                    "sources": sources[:2],
                    "suggestions": ["Try again", "View documents", "Check reminders"],
                },
            }

    @staticmethod
    def _generate_suggestions(
        message: str,
        context_chunks: Optional[List[Dict[str, Any]]],
        health_profile: Optional[Dict[str, Any]]
    ) -> List[str]:
        """Generate relevant quick follow-up question chips."""
        lower = message.lower()
        if "sugar" in lower or "glucose" in lower or "hba1c" in lower:
            return ["What is my target HbA1c?", "How does diet affect blood sugar?", "Review diabetes medications"]
        if "medication" in lower or "medicine" in lower or "dose" in lower:
            return ["When should I take my morning pills?", "Any food interactions?", "Set reminder for medicines"]
        if "blood" in lower or "cbc" in lower or "hemoglobin" in lower:
            return ["Is my hemoglobin normal?", "What foods improve iron levels?", "When is my next lab test?"]
        if "kidney" in lower or "creatinine" in lower or "egfr" in lower:
            return ["Explain creatinine levels", "How much water should I drink?", "Questions for my nephrologist"]
        
        # Default smart suggestions
        defaults = ["Explain my latest lab report", "What medications am I on?", "Show my vitals trends"]
        return defaults
