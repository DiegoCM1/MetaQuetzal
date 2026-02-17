## Technologies to use.
Use MMKV instead of asyncStorage for local storage.
- Language: Python (FastAPI) for AI heavy lifting on offline models
- Arquitechture: Feature Based
- State: TanStack Query or Zustand
- Packages UI: Flash list (for rendering lists, of messages, for example, in an efficient/optimized way)
 - React Native Gesture Handler: Easily include gestures.
 - Expo vector icons
 - Uniwind (Faster), NativeWind
 - ReactNative Reusables (like shadcn). Expo UI 
- (Auth): Clerk
- Metrics:
- Payments: Revenue Cat (Used by Open AI), Stripe
- Alerts and hurricane tracking: Initially openweather one call (pay as you go) and NHC for hurricane tracking. Make architechture plug and play so if hurricane tracking is not enough, then we can switch to XWeather.
- AI Online: Model agnostic: Llama 4 Maverick with LoRA on Groq or together.ai as the primary, with Gemini Vertex AI as a possible alternative.
- AI offline Model agnostic: Llama 3.2 instruct-3b/1b quantized and fine tuned.
- AI Custom/Universal MCP Tools: Tool for grounding on google maps information. Tool for getting the last alert from Mexican sources?. Tool for getting weather data. All of them custom to avoid vendor lock-in and switch models easily.

 OpenWeather vs Xweather — Full Comparison                                                                      
                                                                                                                 
  The Key Difference                                                                                             
  ┌─────────────────────────────────┬─────────────────────────────┬──────────────────────────────────────────┐   
  │             Aspect              │         OpenWeather         │                 Xweather                 │   
  ├─────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────┤   
  │ Hurricane-specific endpoint     │ ❌ NO                       │ ✅ YES                                   │   
  ├─────────────────────────────────┼─────────────────────────────┼──────────────────────────────────────────┤   
  │ Can you paint hurricane on map? │ ❌ No storm track/cone data │ ✅ Yes — track, forecast cone, positions │   
  └─────────────────────────────────┴─────────────────────────────┴──────────────────────────────────────────┘   
  This is the critical distinction. OpenWeather gives you weather data and government alerts, but does not       
  provide hurricane tracking data (position, path, forecast cone). Xweather has a dedicated tropicalcyclones     
  endpoint specifically for this.                                                                                
                                                                                                                 
  ---                                                                         
  Feature Comparison                                                                                             
  ┌───────────────────────────────────┬─────────────────────────────────────┬─────────────────────────────────┐  
  │              Feature              │             OpenWeather             │            Xweather             │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Current Weather                   │ ✅                                  │ ✅                              │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Forecasts (hourly/daily)          │ ✅ 8-day                            │ ✅ 7-day                        │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Government Alerts                 │ ✅ (via One Call 3.0)               │ ✅ (alerts endpoint)            │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Hurricane Position                │ ❌                                  │ ✅ lat/lon of storm             │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Hurricane Track (past)            │ ❌                                  │ ✅ GeoJSON LineString           │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Hurricane Forecast Track          │ ❌                                  │ ✅ 5-day forecast path          │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Forecast Error Cone               │ ❌                                  │ ✅ GeoJSON Polygon              │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Advisory Breakpoints              │ ❌                                  │ ✅ Coastal alert zones          │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ "Cities Affected" Query           │ ❌                                  │ ✅ affects action               │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Storm Intensity/Category          │ ❌                                  │ ✅ Saffir-Simpson               │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Weather Maps (temp, precip, wind) │ ✅ 15 layers                        │ ✅ 100+ layers                  │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Hurricane Map Layers              │ ❌                                  │ ✅ Storm icons, tracks, cones   │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Radar/Satellite                   │ ✅ Precipitation maps               │ ✅                              │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Historical Weather                │ ✅ (since 1979)                     │ ✅                              │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Air Quality                       │ ✅                                  │ ✅                              │  
  ├───────────────────────────────────┼─────────────────────────────────────┼─────────────────────────────────┤  
  │ Data Sources                      │ Global models, satellites, stations │ NHC, CPHC, JTWC + global models │  
  └───────────────────────────────────┴─────────────────────────────────────┴─────────────────────────────────┘  
  ---                                        


# Architechture
                                                                                                                 
  backend-python/                                                                                                
  ├── app/                                                                                                       
  │   ├── features/                                                                                              
  │   │   ├── risk/                                                                                              
  │   │   │   ├── __init__.py                                                                                    
  │   │   │   ├── router.py                                                                                      
  │   │   │   ├── service.py                                                                                     
  │   │   │   ├── models.py                                                                                      
  │   │   │   └── dependencies.py                                                                                
  │   │   │                                                                                                      
  │   │   ├── alerts/                                                                                            
  │   │   │   ├── __init__.py                                                                                    
  │   │   │   ├── router.py                                                                                      
  │   │   │   ├── service.py                                                                                     
  │   │   │   ├── models.py                                                                                      
  │   │   │   └── repository.py                                                                                  
  │   │   │                                                                                                      
  │   │   ├── hurricanes/                                                                                        
  │   │   │   ├── __init__.py                                                                                    
  │   │   │   ├── router.py                                                                                      
  │   │   │   ├── service.py                                                                                     
  │   │   │   ├── models.py                                                                                      
  │   │   │   └── geo.py                                                                                         
  │   │   │                                                                                                      
  │   │   ├── notifications/                                                                                     
  │   │   │   ├── __init__.py                                                                                    
  │   │   │   ├── router.py                                                                                      
  │   │   │   ├── service.py                                                                                     
  │   │   │   └── models.py                                                                                      
  │   │   │                                                                                                      
  │   │   └── ai/                  # Future                                                                      
  │   │       └── ...                                                                                            
  │   │                                                                                                          
  │   ├── shared/                  # Shared across features                                                      
  │   │   ├── providers/                                                                                         
  │   │   │   ├── weather/                                                                                       
  │   │   │   │   ├── base.py                                                                                    
  │   │   │   │   ├── openweather.py                                                                             
  │   │   │   │   └── xweather.py                                                                                
  │   │   │   └── hurricane/                                                                                     
  │   │   │       ├── base.py                                                                                    
  │   │   │       ├── nhc.py                                                                                     
  │   │   │       └── xweather.py                                                                                
  │   │   ├── database/                                                                           
  │   │   │   └── connection.py                                                                                  
  │   │   └── firebase/                                                                                          
  │   │       └── messaging.py                                                                                   
  │   │                                                                                                          
  │   ├── core/                                                                                                  
  │   │   ├── config.py                                                                                          
  │   │   ├── exceptions.py                                                                                      
  │   │   └── security.py                                                                                        
  │   │                                                                                                          
  │   └── main.py                                                                                                
  │                                                                                                              
  ├── tasks/                                                                                                     
  │   └── check_risk.py                                                                                          
  │                                                                                                              
  ├── tests/                                                                                                     
  ├── pyproject.toml                                                                                             
  └── .env.example    