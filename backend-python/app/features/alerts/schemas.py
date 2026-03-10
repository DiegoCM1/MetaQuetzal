from pydantic import BaseModel
from datetime import datetime
from uuid import UUID

class AlertSummary(BaseModel):
    id:UUID
    timestamp:datetime
    level:int
    score:int
    title:str
    short:str


class AlertDetail(BaseModel):
    id:UUID
    timestamp:datetime
    level:int
    score:int
    title:str
    short:str
    lat:float
    lon:float
    factors:list
    recommendations:list
