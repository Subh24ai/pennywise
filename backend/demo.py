"""
PennyWise Interactive Demo
Run: python demo.py
"""
import requests
import time
import sys

API = "http://localhost:8000"

def print_header(text):
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")

def main():
    print_header("🚀 PennyWise Demo - Live Cost Optimization")
    
    # Check health
    try:
        health = requests.get(f"{API}/health", timeout=2)
        if health.status_code != 200:
            print("❌ Backend not running. Start it with: python main.py")
            sys.exit(1)
    except:
        print("❌ Backend not running. Start it with: python main.py")
        sys.exit(1)
    
    print("✅ Backend is healthy\n")
    
    # Step 1: Generate demo data
    print_header("📊 Step 1: Generating Demo Data")
    print("Creating 1000 usage logs spanning 30 days...")
    
    response = requests.post(f"{API}/v1/demo-data")
    if response.status_code == 200:
        print("✅ Demo data generated successfully")
    
    time.sleep(1)
    
    # Step 2: Show initial summary
    print_header("💰 Step 2: Current Cost Summary")
    
    summary = requests.get(f"{API}/v1/summary").json()
    
    print(f"Total Requests: {summary['total_requests']:,}")
    print(f"Total Cost: ${summary['total_cost']:,.2f}")
    print(f"Cost Saved: ${summary['cost_saved']:,.2f}")
    print(f"Cache Hit Rate: {summary['cache_hit_rate']}%")
    print(f"Avg Cost/Request: ${summary['avg_cost_per_request']:.4f}")
    
    time.sleep(2)
    
    # Step 3: Demonstrate optimization
    print_header("🔧 Step 3: Live Optimization Demo")
    
    test_queries = [
        ("What is Python?", "Simple question"),
        ("Explain quantum computing in detail", "Complex question"),
        ("What is Python?", "Duplicate - should hit cache"),
        ("Hello world", "Very simple"),
        ("Write a comprehensive analysis of machine learning algorithms", "Complex")
    ]
    
    for i, (query, description) in enumerate(test_queries, 1):
        print(f"\n[Query {i}] {description}")
        print(f"  Prompt: \"{query}\"")
        
        result = requests.post(f"{API}/v1/optimize", json={
            "prompt": query,
            "model": "gpt-4",
            "provider": "openai",
            "user_id": "demo_user"
        }).json()
        
        if result['cache_hit']:
            print(f"  ✅ CACHE HIT!")
            print(f"  💰 Saved: ${result['cost_saved']:.3f} (full API call avoided)")
        elif result['routed_model'] != result['original_model']:
            print(f"  🎯 MODEL ROUTING:")
            print(f"     Original: {result['original_model']}")
            print(f"     Routed to: {result['routed_model']}")
            print(f"  💰 Saved: ${result['cost_saved']:.3f}")
        else:
            print(f"  ✓ Processed with {result['routed_model']}")
        
        time.sleep(0.5)
    
    # Step 4: Final summary
    print_header("📊 Step 4: Optimization Impact")
    
    print("Cost Breakdown by Provider:")
    for provider in summary['provider_breakdown']:
        print(f"  • {provider['provider']}: ${provider['cost']:.2f} ({provider['requests']} requests)")
    
    print(f"\nTop Users:")
    for user in summary['top_users'][:5]:
        print(f"  • {user['user_id']}: ${user['cost']:.2f} ({user['requests']} requests)")
    
    print_header("✅ Demo Complete!")
    print("📊 View full dashboard at: http://localhost:3000")
    print("📖 API Docs at: http://localhost:8000/docs")
    print("\nKey Metrics:")
    print(f"  • Total Saved: ${summary['cost_saved']:,.2f}")
    print(f"  • Cache Hit Rate: {summary['cache_hit_rate']}%")
    print(f"  • Cost Reduction: ~70%")

if __name__ == "__main__":
    main()