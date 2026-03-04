#!/usr/bin/env python3
"""Check recent OpenAI analysis results from database with full text"""
import sys
from pathlib import Path

project_path = Path(__file__).parent
sys.path.insert(0, str(project_path))

from src.database.connection import Database, DatabaseConfig
from src.config import settings
from src.database.queries import AnalysisQueries

print("=" * 60)
print("RECENT OPENAI ANALYSIS RESULTS (FULL TEXT)")
print("=" * 60)
print()

try:
    db_config = DatabaseConfig(database_url=settings.database_url)
    db = Database(db_config)
    db.connect()
    
    with db.session() as session:
        recent = AnalysisQueries.get_recent_analysis(session, hours=24, limit=10)
        
        print(f"Found {len(recent)} analysis records:")
        print()
        
        if not recent:
            print("No recent analysis found.")
            print("This could mean:")
            print("  - No frames have been analyzed yet")
            print("  - Analysis is being cached")
            print("  - Smart triggering is disabled")
        else:
            for i, a in enumerate(recent, 1):
                print(f"{i}. Analysis Record")
                print(f"   ID: {a.id}")
                print(f"   Time: {a.created_at}")
                print(f"   Provider: {a.api_provider}")
                print(f"   Frame ID: {a.frame_id}")
                print(f"   Analysis Text Length: {len(a.analysis_text) if a.analysis_text else 0}")
                if a.analysis_text:
                    print(f"   Analysis Text:")
                    print(f"   {'-' * 56}")
                    # Print full text, wrapped nicely
                    text = a.analysis_text
                    # Split into lines and print with indentation
                    for line in text.split('\n'):
                        print(f"   {line}")
                    print(f"   {'-' * 56}")
                else:
                    print("   Analysis: None (empty)")
                print()
    
    db.close()
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
