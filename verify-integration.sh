#!/bin/bash

echo "🔍 VERIFICACIÓN RÁPIDA - BLUEYE INTEGRATION"
echo "==========================================="
echo

# 1. Verificar Backend
echo "1️⃣ VERIFICANDO BACKEND..."
backend_status=$(curl -s http://localhost:3002/health | grep -o '"status":"[^"]*' | cut -d'"' -f4 2>/dev/null)
if [ "$backend_status" = "OK" ]; then
    echo "   ✅ Backend: FUNCIONANDO"
else
    echo "   ❌ Backend: NO RESPONDE"
    echo "   💡 Solución: cd backend && npm start"
fi
echo

# 2. Verificar Expo
echo "2️⃣ VERIFICANDO FRONTEND..."
expo_running=$(ps aux | grep "expo start" | grep -v grep | wc -l)
if [ $expo_running -gt 0 ]; then
    echo "   ✅ Expo: EJECUTÁNDOSE"
else
    echo "   ❌ Expo: NO EJECUTÁNDOSE"
    echo "   💡 Solución: npm start"
fi
echo

# 3. Verificar Archivos Nuevos
echo "3️⃣ VERIFICANDO ARCHIVOS..."
files_to_check=(
    "services/riskService.js"
    "app/risk-analysis.jsx"
    "app/alarmScreensReal.jsx"
    "app/navigation.jsx"
    "app/system-test.jsx"
    "backend/server.js"
)

all_exist=true
for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file - FALTA"
        all_exist=false
    fi
done
echo

# 4. Probar Endpoint
echo "4️⃣ PROBANDO ENDPOINT /risk..."
response=$(curl -s -X POST http://localhost:3002/risk -H "Content-Type: application/json" -d '{"lat":20.659698,"lon":-103.349609}' 2>/dev/null)
if echo "$response" | grep -q "riskLevel"; then
    risk_level=$(echo "$response" | grep -o '"riskLevel":"[^"]*' | cut -d'"' -f4)
    location=$(echo "$response" | grep -o '"name":"[^"]*' | cut -d'"' -f4)
    echo "   ✅ Endpoint funcionando"
    echo "   📍 Ubicación: $location"
    echo "   🎯 Riesgo: $risk_level"
else
    echo "   ❌ Endpoint no responde correctamente"
fi
echo

# 5. Instrucciones
echo "📱 CÓMO PROBAR EN TU APP:"
echo "========================"
echo "1. Abre tu navegador en: http://localhost:8081"
echo "2. O escanea el QR con Expo Go en tu teléfono"
echo "3. Navega a estas URLs:"
echo "   📋 /system-test     (verificar conexión)"
echo "   🗂️  /navigation     (menú principal)"
echo "   📊 /risk-analysis   (análisis completo)"
echo "   🚨 /alarmScreensReal (alertas reales)"
echo

if [ "$backend_status" = "OK" ] && [ $expo_running -gt 0 ] && [ "$all_exist" = true ]; then
    echo "🎉 TODO ESTÁ LISTO - ¡Prueba las nuevas pantallas!"
else
    echo "⚠️  HAY PROBLEMAS - Revisa los elementos marcados con ❌"
fi
echo
