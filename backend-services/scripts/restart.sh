#!/bin/bash

#CHANGE ME
compose_file="/path/to/compose/file"

# Threshold in MB (8 GB = 8192 MB)
threshold=8980

# Get total memory usage in MB
used=$(free -m | awk '/^Mem:/ {print $3}')

if [ "$USED" -ge "$THRESHOLD" ]; then
    echo "Memory usage is ${used}MB (≥ ${threshold}MB). Restarting Invidious..."
    docker compose -f "$compose_file" down >/dev/null 2>&1
    docker compose -f "$compose_file" up -d >/dev/null 2>&1
else
    echo "Memory usage is ${used}MB (< ${threshold}MB). No restart performed."
fi
