#!/bin/bash
echo "Stopping RTGS Sales Automation..."
pkill -f "api-server.js"
pkill -f "vite"
echo "All services stopped"
