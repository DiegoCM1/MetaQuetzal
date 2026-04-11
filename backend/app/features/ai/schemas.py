from pydantic import BaseModel                                    
                                                                    
class Message(BaseModel):                                 
    role: str                                                   
    content: str                                                  
                                                                
class ChatRequest(BaseModel):                                     
    messages: list[Message]
    location: str | None = None   
    latitude: float | None = None
    longitude: float | None = None                                             
                                                                
class ChatResponse(BaseModel):
    reply: str