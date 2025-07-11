#!/bin/bash

echo "🧪 PRUEBAS EXHAUSTIVAS DEL BACKEND BLUEYE"
echo "=========================================="
echo

# Test 1: Health Check
echo "✅ Test 1: Health Check"
response=$(curl -s http://localhost:3002/health)
echo "Response: $response"
echo

# Test 2: Risk Analysis - Guadalajara (condiciones normales)
echo "✅ Test 2: Guadalajara, México (Condiciones Normales)"
curl -s -X POST http://localhost:3002/risk \
  -H "Content-Type: application/json" \
  -d '{"lat":20.659698,"lon":-103.349609}' | jq .
echo

# Test 3: Risk Analysis - Miami (zona de huracanes)
echo "✅ Test 3: Miami, Florida (Zona de Huracanes)"
curl -s -X POST http://localhost:3002/risk \
  -H "Content-Type: application/json" \
  -d '{"lat":25.7617,"lon":-80.1918}' | jq .
echo

# Test 4: Risk Analysis - Londres (clima cambiante)
echo "✅ Test 4: Londres, Reino Unido (Clima Cambiante)"
curl -s -X POST http://localhost:3002/risk \
  -H "Content-Type: application/json" \
  -d '{"lat":51.5074,"lon":-0.1278}' | jq .
echo

# Test 5: Risk Analysis - Tokio (zona de tifones)
echo "✅ Test 5: Tokio, Japón (Zona de Tifones)"
curl -s -X POST http://localhost:3002/risk \
  -H "Content-Type: application/json" \
  -d '{"lat":35.6762,"lon":139.6503}' | jq .
echo

# Test 6: Error Handling - Sin coordenadas
echo "✅ Test 6: Manejo de Errores (Sin Coordenadas)"
curl -s -X POST http://localhost:3002/risk \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
echo

# Test 7: Error Handling - Coordenadas inválidas
echo "✅ Test 7: Manejo de Errores (Coordenadas Inválidas)"
curl -s -X POST http://localhost:3002/risk \
  -H "Content-Type: application/json" \
  -d '{"lat":"invalid","lon":"invalid"}' | jq .
echo

# Test 8: Ruta no existente
echo "✅ Test 8: Ruta No Existente"
curl -s http://localhost:3002/nonexistent | jq .
echo

echo "🎉 PRUEBAS COMPLETADAS"
echo "======================"
