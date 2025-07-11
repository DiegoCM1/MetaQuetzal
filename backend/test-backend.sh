#!/bin/bash

echo "=== TESTING BLUEYE BACKEND ==="
echo ""

echo "1. Health Check:"
wget -qO- http://localhost:3002/health | json_pp
echo ""

echo "2. Testing Risk Endpoint - Guadalajara:"
wget -qO- --header="Content-Type: application/json" --post-data='{"lat":20.659698,"lon":-103.349609}' http://localhost:3002/risk | json_pp
echo ""

echo "3. Testing Risk Endpoint - Miami (Hurricane prone):"
wget -qO- --header="Content-Type: application/json" --post-data='{"lat":25.7617,"lon":-80.1918}' http://localhost:3002/risk | json_pp
echo ""

echo "4. Testing Risk Endpoint - London:"
wget -qO- --header="Content-Type: application/json" --post-data='{"lat":51.5074,"lon":-0.1278}' http://localhost:3002/risk | json_pp
echo ""

echo "=== TESTS COMPLETED ==="
