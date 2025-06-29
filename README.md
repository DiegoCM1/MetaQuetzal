# BluEye MVP📱🌀

**BluEye** is a cross-platform mobile app for hurricane prevention and response.  
It leverages real-time geolocation, official weather APIs, and on-device LLaMA-powered AI to deliver personalized alerts, safe-route guidance, and shelter information before, during, and after a storm.

---

## 🚀 Features

- **Real-time Alerts**  
  - Watches official weather feeds for hurricane watches/warnings  
  - Pushes urgent notifications based on user location  

- **AI-Driven Guidance**  
  - Uses a fine-tuned LLaMA model to answer “what to do” questions  
  - Crafts personalized checklists and safety tips  

- **Safe-Route & Shelter Finder**  
  - Maps nearest public shelters and evacuation routes  
  - Updates dynamically as conditions evolve  

- **Offline Fallback**  
  - Caches last known weather data and safety advice  
  - Continues to serve critical guidance when connectivity is lost  

---

## 🧱 Tech Stack

| Layer                   | Technology                                         |
|-------------------------|----------------------------------------------------|
| **Mobile App**          | React Native, JavaScript, Expo                     |
| **Styling**             | React Native Stylesheets, NativeWindCSS   |
| **AI Inference**        | Open Router LLaMA model  |
| **Weather & Geo APIs**  | OpenWeatherMap, Google Maps Geocoding              |
| **Backend Scripts**     | Python 3.9+, `httpx`, `python-dotenv`              |
| **Data Processing**     | Custom Python modules: `apiOpenWeather.py`, etc.   |

---

## 📂 Repository Structure

```
/
├── react-native-blueye/         # React Native Expo app
│   ├── App.js
│   ├── package.json
│   ├── assets/
│   └── src/
│       ├── screens/
│       ├── components/
│       └── llama/               # Native LLaMA integration
│
├── CubaOpenWeather/              # (Optional) sample region configs
├── apiOpenWeather.py             # Python helper for weather API calls
├── adivinanzaUpi.py              # Demo/chatbot script
├── open.py                       # Early PoC scripts
├── open1.py
├── open3.py
├── open6.py
│
├── .gitignore
└── README.md                     # ← you are here
```

“Prepared today, secure tomorrow.” 🌀
