"""Pytest suite for physiological plausibility safety net and emergency keyword intercept."""
import pytest
from app.summarizer.engine import SummarizerEngine
from app.chatbot.engine import ChatbotEngine


def test_plausibility_safety_net_flags_impossible_hemoglobin():
    """Hemoglobin 142 g/dL (decimal drop from 14.2 g/dL) must be marked needs_verification."""
    raw_summary = {
        "key_findings": [
            {
                "parameter": "Hemoglobin",
                "value": "142",
                "unit": "g/dL",
                "status": "critical",
                "note": "Extremely high hemoglobin",
            }
        ],
        "risk_flags": [
            {
                "parameter": "Hemoglobin",
                "severity": "critical",
                "recommendation": "Emergency venesection",
            }
        ],
    }

    sanitized = SummarizerEngine._apply_plausibility_safety_net(raw_summary)

    # Key finding must be demoted to needs_verification
    finding = sanitized["key_findings"][0]
    assert finding["status"] == "needs_verification"
    assert "OCR extraction artifact" in finding["note"]

    # Risk flag must be sanitized away from critical panic
    risk_flag = sanitized["risk_flags"][0]
    assert risk_flag["severity"] == "needs_verification"
    assert "Verify the Hemoglobin value" in risk_flag["recommendation"]


def test_plausibility_safety_net_flags_leading_zero_creatinine():
    """Creatinine '09' mg/dL (decimal drop from 0.9 mg/dL) must be marked needs_verification."""
    raw_summary = {
        "key_findings": [
            {
                "parameter": "Creatinine",
                "value": "09",
                "unit": "mg/dL",
                "status": "high",
                "note": "Elevated creatinine",
            }
        ],
        "risk_flags": [],
    }

    sanitized = SummarizerEngine._apply_plausibility_safety_net(raw_summary)
    finding = sanitized["key_findings"][0]
    assert finding["status"] == "needs_verification"
    assert "OCR extraction artifact" in finding["note"]


def test_plausibility_safety_net_preserves_physiologically_valid_findings():
    """Valid findings within human bounds must remain untouched."""
    raw_summary = {
        "key_findings": [
            {
                "parameter": "Glucose",
                "value": "95",
                "unit": "mg/dL",
                "status": "normal",
                "note": "Normal fasting blood sugar",
            },
            {
                "parameter": "Hemoglobin",
                "value": "14.2",
                "unit": "g/dL",
                "status": "normal",
                "note": "Optimal oxygen capacity",
            },
        ],
        "risk_flags": [],
    }

    sanitized = SummarizerEngine._apply_plausibility_safety_net(raw_summary)
    assert sanitized["key_findings"][0]["status"] == "normal"
    assert sanitized["key_findings"][1]["status"] == "normal"


@pytest.mark.asyncio
async def test_chatbot_emergency_keyword_intercept():
    """Emergency keywords (chest pain, cannot breathe) must trigger immediate 112 intercept."""
    engine = ChatbotEngine()

    response = await engine.respond(
        user_id="user-1",
        message="I am having severe chest pain and cannot breathe, what should I do?",
        session_id="sess-emerg-1",
    )

    assert response["metadata"]["is_emergency"] is True
    assert "112" in response["content"]
    assert "emergency room" in response["content"].lower()
    assert "Call 112 Emergency" in response["metadata"]["suggestions"]


@pytest.mark.asyncio
async def test_chatbot_non_emergency_query_passthrough():
    """Normal health query must not trigger the emergency intercept."""
    engine = ChatbotEngine()

    response = await engine.respond(
        user_id="user-1",
        message="What does a fasting glucose of 95 mg/dL mean?",
        session_id="sess-norm-1",
    )

    assert response["metadata"].get("is_emergency", False) is False
