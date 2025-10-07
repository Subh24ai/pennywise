"""
PennyWise MVP Backend
Run: uvicorn main:app --reload
"""
from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict
import datetime
import hashlib
import sqlite3
import json

app = FastAPI(
    title="PennyWise API",
    description="LLM Cost Optimizer",
    version="1.0.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SQLite
def init_db():
    conn = sqlite3.connect('pennywise.db')
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS usage_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            org_id TEXT DEFAULT 'demo_org',
            user_id TEXT,
            provider TEXT,
            model TEXT,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            total_tokens INTEGER,
            cost REAL,
            cache_hit INTEGER DEFAULT 0,
            model_routed_from TEXT,
            feature TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# Simple in-memory cache (use Redis in production)
cache = {}

# Pricing per 1K tokens
PRICING = {
    "openai": {
        "gpt-4": 0.03,
        "gpt-4-turbo": 0.01,
        "gpt-3.5-turbo": 0.0015,
    },
    "anthropic": {
        "claude-opus": 0.075,
        "claude-sonnet": 0.015,
        "claude-haiku": 0.00125,
    }
}

# Models
class UsageLog(BaseModel):
    user_id: str
    provider: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    feature: Optional[str] = None

class OptimizeRequest(BaseModel):
    prompt: str
    model: str
    provider: str
    user_id: str

# Helpers
def calculate_cost(provider: str, model: str, tokens: int) -> float:
    price_per_1k = PRICING.get(provider, {}).get(model, 0.001)
    return (tokens / 1000) * price_per_1k

def route_model(prompt: str, requested_model: str) -> str:
    """Simple routing: downgrade if prompt is short"""
    if len(prompt) < 100:
        if "gpt-4" in requested_model:
            return "gpt-3.5-turbo"
        if "opus" in requested_model:
            return "claude-haiku"
    return requested_model

# ==================== ENDPOINTS ====================

@app.get("/")
async def root():
    return {
        "message": "PennyWise API",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health():
    conn = sqlite3.connect('pennywise.db')
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM usage_logs")
    count = c.fetchone()[0]
    conn.close()
    
    return {
        "status": "healthy",
        "timestamp": datetime.datetime.now().isoformat(),
        "total_logs": count
    }

@app.post("/v1/log")
async def log_usage(log: UsageLog):
    """Log LLM usage"""
    cost = calculate_cost(log.provider, log.model, log.total_tokens)
    
    conn = sqlite3.connect('pennywise.db')
    c = conn.cursor()
    c.execute('''
        INSERT INTO usage_logs 
        (user_id, provider, model, prompt_tokens, completion_tokens, total_tokens, cost, feature)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (log.user_id, log.provider, log.model, 
          log.prompt_tokens, log.completion_tokens, 
          log.prompt_tokens + log.completion_tokens, cost, log.feature))
    conn.commit()
    conn.close()
    
    return {
        "status": "logged",
        "cost": round(cost, 4),
        "timestamp": datetime.datetime.now().isoformat()
    }

@app.post("/v1/optimize")
async def optimize(req: OptimizeRequest):
    """Optimize prompt + route model"""
    
    # Check cache
    cache_key = hashlib.md5(req.prompt.encode()).hexdigest()
    
    if cache_key in cache:
        return {
            "response": cache[cache_key],
            "optimized": True,
            "cache_hit": True,
            "original_model": req.model,
            "routed_model": req.model,
            "cost_saved": 0.03
        }
    
    # Route to optimal model
    optimal_model = route_model(req.prompt, req.model)
    
    # Mock response
    response = f"Optimized response to: {req.prompt[:50]}..."
    
    # Cache it
    cache[cache_key] = response
    
    cost_saved = 0.025 if optimal_model != req.model else 0
    
    return {
        "response": response,
        "optimized": True,
        "cache_hit": False,
        "original_model": req.model,
        "routed_model": optimal_model,
        "cost_saved": round(cost_saved, 4)
    }

@app.get("/v1/summary")
async def get_summary(days: int = 30):
    """Get cost summary"""
    conn = sqlite3.connect('pennywise.db')
    c = conn.cursor()
    
    # Overall stats
    c.execute('''
        SELECT 
            COUNT(*) as requests,
            COALESCE(SUM(cost), 0) as total_cost,
            COALESCE(SUM(cache_hit), 0) as cache_hits,
            COALESCE(AVG(cost), 0) as avg_cost
        FROM usage_logs
        WHERE timestamp >= datetime('now', '-' || ? || ' days')
    ''', (days,))
    
    stats = c.fetchone()
    
    # Daily breakdown (last 30 days)
    c.execute('''
        SELECT 
            DATE(timestamp) as date,
            COALESCE(SUM(cost), 0) as cost,
            COUNT(*) as requests,
            COALESCE(SUM(cache_hit), 0) as cache_hits
        FROM usage_logs
        WHERE timestamp >= datetime('now', '-30 days')
        GROUP BY DATE(timestamp)
        ORDER BY date
    ''')
    
    daily = []
    for row in c.fetchall():
        daily.append({
            "date": row[0],
            "cost": round(row[1], 2),
            "requests": row[2],
            "cache_hits": row[3],
            "saved": round(row[1] * 0.7, 2)  # Assume 70% savings
        })
    
    # Provider breakdown
    c.execute('''
        SELECT 
            provider, 
            COALESCE(SUM(cost), 0) as cost,
            COUNT(*) as requests
        FROM usage_logs
        GROUP BY provider
    ''')
    
    providers = []
    for row in c.fetchall():
        providers.append({
            "provider": row[0],
            "cost": round(row[1], 2),
            "requests": row[2]
        })
    
    # Top users
    c.execute('''
        SELECT 
            user_id,
            COALESCE(SUM(cost), 0) as cost,
            COUNT(*) as requests
        FROM usage_logs
        GROUP BY user_id
        ORDER BY cost DESC
        LIMIT 10
    ''')
    
    top_users = []
    for row in c.fetchall():
        top_users.append({
            "user_id": row[0],
            "cost": round(row[1], 2),
            "requests": row[2]
        })
    
    conn.close()
    
    requests_count = stats[0] or 0
    cache_hit_rate = (stats[2] / requests_count * 100) if requests_count > 0 else 0
    
    return {
        "total_requests": requests_count,
        "total_cost": round(stats[1], 2),
        "cost_saved": round(stats[1] * 0.7, 2),
        "cache_hits": stats[2] or 0,
        "cache_hit_rate": round(cache_hit_rate, 1),
        "avg_cost_per_request": round(stats[3], 4),
        "daily_breakdown": daily,
        "provider_breakdown": providers,
        "top_users": top_users
    }

@app.post("/v1/demo-data")
async def generate_demo_data():
    """Generate demo data"""
    import random
    from datetime import timedelta
    
    conn = sqlite3.connect('pennywise.db')
    c = conn.cursor()
    
    # Clear existing data
    c.execute("DELETE FROM usage_logs")
    
    providers = ["openai", "anthropic"]
    models = {
        "openai": ["gpt-4", "gpt-3.5-turbo", "gpt-4-turbo"],
        "anthropic": ["claude-opus", "claude-sonnet", "claude-haiku"]
    }
    users = [f"user_{i:03d}" for i in range(1, 11)]
    features = ["chatbot", "summarization", "code-gen", "translation", "analysis"]
    
    # Generate 1000 logs over last 30 days
    for i in range(1000):
        provider = random.choice(providers)
        model = random.choice(models[provider])
        user = random.choice(users)
        feature = random.choice(features)
        
        prompt_tokens = random.randint(50, 1500)
        completion_tokens = random.randint(20, 800)
        total_tokens = prompt_tokens + completion_tokens
        
        cost = calculate_cost(provider, model, total_tokens)
        cache_hit = 1 if random.random() > 0.13 else 0  # 87% cache rate
        
        # Random timestamp in last 30 days
        days_ago = random.randint(0, 29)
        hours_ago = random.randint(0, 23)
        timestamp = datetime.datetime.now() - timedelta(days=days_ago, hours=hours_ago)
        
        c.execute('''
            INSERT INTO usage_logs 
            (timestamp, user_id, provider, model, prompt_tokens, completion_tokens, 
             total_tokens, cost, feature, cache_hit)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (timestamp, user, provider, model, prompt_tokens, completion_tokens,
              total_tokens, cost, feature, cache_hit))
    
    conn.commit()
    conn.close()
    
    return {
        "status": "success",
        "message": "Generated 1000 demo logs covering last 30 days"
    }

if __name__ == "__main__":
    import uvicorn
    import os
    port = int(os.getenv("PORT", 8000))
    print("🚀 Starting PennyWise API...")
    print("📖 API Docs: http://localhost:8000/docs")
    print("🏥 Health: http://localhost:8000/health")
    uvicorn.run(app, host="0.0.0.0", port=port)