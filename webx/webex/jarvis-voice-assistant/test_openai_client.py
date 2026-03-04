#!/usr/bin/env python3
"""
Test OpenAI Client Initialization
"""

def test_openai_client():
    try:
        print("Testing OpenAI client creation...")

        import openai

        # Try creating client with minimal parameters
        client = openai.OpenAI(
            api_key="YOUR_OPENAI_API_KEY_HERE"
        )

        print("✅ OpenAI client created successfully")
        print(f"Client type: {type(client)}")
        print(f"API key set: {'Yes' if hasattr(client, 'api_key') else 'No'}")

        return True

    except Exception as e:
        print(f"❌ OpenAI client error: {e}")
        print(f"Error type: {type(e)}")
        return False

if __name__ == "__main__":
    test_openai_client()
