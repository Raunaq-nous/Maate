# ============================================
# AI Service — Healthcare Chat Engine
# RAG + Memory + Medical Guardrails
# ============================================

import os
import json
from openai import AsyncOpenAI
from src.chat_models import ChatRequest, ChatResponse, RetrievalResult
from src.retriever import MultiModalRetriever
import logging

logger = logging.getLogger(__name__)

CHAT_SYSTEM_PROMPT = """
You are 'Maate AI', a professional and empathetic healthcare assistant.
Your goal is to help users understand their health history, reports, and medications.

CONSTRAINTS:
1. ONLY USE PROVIDED CONTEXT: Base your answers on the retrieved medical records.
2. ADHERENCE: If asked about medication, explain its purpose and check if the user has taken their doses.
3. TRENDS: If historical data is provided, summarize changes (e.g. "Your BP is improving").
4. MEDICAL SAFETY:
   - Do NOT provide formal diagnoses.
   - If symptoms sound severe (chest pain, shortness of breath), recommend immediate medical attention.
   - Always suggest consulting a doctor for treatment changes.
5. TONE: Be supportive, clear, and professional. Use simple language for complex terms.

GREETING: If it's a first message, be welcoming.
"""

class ChatEngine:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
        self.retriever = MultiModalRetriever()

    async def generate_response(self, req: ChatRequest) -> ChatResponse:
        """Execute RAG pipeline: Retrieve -> Augment -> Generate"""
        try:
            # 1. Retrieve Context
            context_results = await self.retriever.retrieve(req.user_id, req.message)
            context_text = "\n".join([f"[{r.source}]: {r.content}" for r in context_results])

            # 2. Build Messages
            messages = [
                {"role": "system", "content": CHAT_SYSTEM_PROMPT},
            ]
            
            # Add History
            for msg in req.history[-5:]:  # Last 5 messages for context
                messages.append({"role": msg.role, "content": msg.content})
            
            # Add Current Context & Message
            messages.append({
                "role": "user", 
                "content": f"Context from records:\n{context_text}\n\nUser Question: {req.message}"
            })

            # 3. Generate Response
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.3,
                max_tokens=500
            )

            answer = response.choices[0].message.content

            # 4. Post-process (Suggested Actions)
            suggested_actions = ["Show latest report", "Set a reminder", "Compare trends"]

            return ChatResponse(
                answer=answer,
                sources=context_results,
                suggested_actions=suggested_actions,
                confidence_score=0.95
            )

        except Exception as e:
            logger.error(f"Chat generation failed: {str(e)}")
            return ChatResponse(
                answer="I'm sorry, I'm having trouble accessing your records right now. Please try again in a moment.",
                confidence_score=0.0
            )
