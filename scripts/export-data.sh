#!/bin/bash
# 导出games数据
echo "-- Games数据"
curl -s 'http://localhost:5000/api/games' | python3 -c "
import json, sys
data = json.load(sys.stdin)
games = data.get('games', [])
for g in games:
    name = g['name'].replace(\"'\", \"''\")
    desc = (g.get('description') or '').replace(\"'\", \"''\")
    genre = (g.get('genre') or '').replace(\"'\", \"''\")
    platform = (g.get('platform') or '').replace(\"'\", \"''\")
    print(f\"INSERT INTO games (id, name, slug, genre, platform, release_date, description) VALUES ({g['id']}, '{name}', '{g['slug']}', '{genre}', '{platform}', '{g.get('release_date','')}', '{desc}') ON CONFLICT (slug) DO NOTHING;\")
"
