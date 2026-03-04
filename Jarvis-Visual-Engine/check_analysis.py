#!/usr/bin/env python3
"""Check recent OpenAI analysis results from database"""
import sys
from pathlib import Path

project_path = Path(__file__).parent
sys.path.insert(0, str(project_path))

from src.database.connection import Database, DatabaseConfig
from src.config import settings
from src.database.queries import AnalysisQueries

print("=" * 60)
print("RECENT OPENAI ANALYSIS RESULTS")
print("=" * 60)
print()

try:
    db_config = DatabaseConfig(database_url=settings.database_url)
    db = Database(db_config)
    db.connect()
    
    with db.session() as session:
        recent = AnalysisQueries.get_recent_analysis(session, hours=2, limit=10)
        
        if not recent:
            print("No recent analysis found in database.")
            print("This could mean:")
            print("  - No frames have been analyzed yet")
            print("  - Analysis is being cached (check cache hits)")
            print("  - Smart triggering is disabled")
        else:
            print(f"Found {len(recent)} recent analysis records:\n")
            for i, a in enumerate(recent, 1):
                print(f"{i}. Analysis Record")
                print(f"   Time: {a.created_at}")
                print(f"   Provider: {a.api_provider}")
                print(f"   Frame ID: {a.frame_id}")
                if a.analysis_text:
                    print(f"   Analysis Text:")
                    # Print first 500 chars
                    text = a.analysis_text[:500]
                    print(f"   {text}")
                    if len(a.analysis_text) > 500:
                        print(f"   ... (truncated, total length: {len(a.analysis_text)} chars)")
                else:
                    print("   Analysis Text: (empty)")
                print()
    
    db.close()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
