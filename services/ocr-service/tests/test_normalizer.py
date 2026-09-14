"""Unit tests for OCR unit normalizer and postprocessor."""
import pytest
from app.pipeline.postprocessor import PostProcessor, COMMON_UNIT_MAP


def test_normalize_common_unit_mappings():
    """Test standard lookup table transformations for OCR misreadings."""
    assert PostProcessor.normalize_unit("mgidl") == "mg/dL"
    assert PostProcessor.normalize_unit("mgldl") == "mg/dL"
    assert PostProcessor.normalize_unit("mg/dl") == "mg/dL"
    assert PostProcessor.normalize_unit("gidl") == "g/dL"
    assert PostProcessor.normalize_unit("gldl") == "g/dL"
    assert PostProcessor.normalize_unit("mcgidl") == "mcg/dL"
    assert PostProcessor.normalize_unit("ugidl") == "mcg/dL"
    assert PostProcessor.normalize_unit("mmoiil") == "mmol/L"
    assert PostProcessor.normalize_unit("mmolil") == "mmol/L"
    assert PostProcessor.normalize_unit("meqil") == "mEq/L"
    assert PostProcessor.normalize_unit("iuil") == "IU/L"
    assert PostProcessor.normalize_unit("uiuiml") == "uIU/mL"
    assert PostProcessor.normalize_unit("miuiml") == "mIU/mL"


def test_normalize_unit_regex_fallbacks():
    """Test regex pattern fallback replacements for noisy OCR text."""
    assert PostProcessor.normalize_unit("mgidL") == "mg/dL"
    assert PostProcessor.normalize_unit("mgldL") == "mg/dL"
    assert PostProcessor.normalize_unit("ngimL") == "ng/mL"
    assert PostProcessor.normalize_unit("pgimL") == "pg/mL"


def test_normalize_empty_or_clean_units():
    """Test that clean or empty units are safely handled."""
    assert PostProcessor.normalize_unit("") == ""
    assert PostProcessor.normalize_unit(None) == ""
    assert PostProcessor.normalize_unit("mg/dL") == "mg/dL"
    assert PostProcessor.normalize_unit("%") == "%"


def test_structure_lab_report_normalization():
    """Test that lab report structuring automatically normalizes parameter units."""
    processor = PostProcessor()
    entities = [
        {
            "label": "LAB_RESULT",
            "metadata": {
                "test_name": "Fasting Blood Glucose",
                "value": "95",
                "unit": "mgidl",
            },
        },
        {
            "label": "LAB_RESULT",
            "metadata": {
                "test_name": "Hemoglobin",
                "value": "13.8",
                "unit": "gidl",
            },
        },
    ]

    structured = processor.structure(entities, "lab_report")
    assert "tests" in structured
    assert len(structured["tests"]) == 2
    assert structured["tests"][0]["unit"] == "mg/dL"
    assert structured["tests"][1]["unit"] == "g/dL"
