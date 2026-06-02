from pydantic import BaseModel

class PredictionResponse(BaseModel):
    label:      str
    label_idx:  int
    confidence: float
    zones:      list[dict]
    mask_url:   str
    overlay_url: str

class FineTuneRequest(BaseModel):
    patient_id:   str
    corrected_label: int          # corrección del médico
    feedback_note: str = ""

class HealthResponse(BaseModel):
    status:          str
    model_loaded:    bool
    checkpoint_name: str