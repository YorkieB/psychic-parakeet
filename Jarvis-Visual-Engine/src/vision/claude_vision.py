"""Claude Vision API integration as fallback"""
import anthropic
import base64
import cv2
import numpy as np
from typing import Optional, Dict
from datetime import datetime
import json
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)


class ClaudeVisionAPI:
    """Claude 3.5 Sonnet Vision API integration with retry logic"""
    
    def __init__(self, api_key: str):
        try:
            # Initialize Claude client - handle httpx compatibility
            self.client = anthropic.AsyncAnthropic(api_key=api_key)
            self.model = "claude-3-5-sonnet-20241022"
            self.max_tokens = 1024
        except TypeError as e:
            # httpx compatibility issue - try without proxies parameter
            logger.warning(f"Claude client initialization issue (httpx compatibility): {e}")
            try:
                # Try with explicit httpx client without proxies
                import httpx
                http_client = httpx.AsyncClient(timeout=60.0)
                self.client = anthropic.AsyncAnthropic(api_key=api_key, http_client=http_client)
                self.model = "claude-3-5-sonnet-20241022"
                self.max_tokens = 1024
            except Exception as e2:
                logger.error(f"Failed to initialize Claude client: {e2}. Claude Vision will be disabled.")
                self.client = None
                self.model = None
                self.max_tokens = 0
        except Exception as e:
            logger.error(f"Failed to initialize Claude client: {e}. Claude Vision will be disabled.")
            self.client = None
            self.model = None
            self.max_tokens = 0
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((anthropic.RateLimitError, anthropic.APITimeoutError, anthropic.APIConnectionError))
    )
    async def analyze_image(self, image: np.ndarray, detail: str = "high") -> Dict:
        """Analyze image with Claude Vision"""
        if not self.client:
            return {
                "success": False,
                "error": "Claude client not initialized",
                "api": "claude"
            }
        try:
            # Convert numpy array to base64
            image_base64 = self._encode_image(image)
            
            # Create message
            message = await self.client.messages.create(
                model=self.model,
                max_tokens=self.max_tokens,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": image_base64
                                }
                            },
                            {
                                "type": "text",
                                "text": self._get_analysis_prompt(detail)
                            }
                        ]
                    }
                ]
            )
            
            # Parse response
            response_text = message.content[0].text
            
            return {
                "success": True,
                "analysis": response_text,
                "api": "claude",
                "timestamp": datetime.utcnow().isoformat(),
                "usage": {
                    "input_tokens": message.usage.input_tokens,
                    "output_tokens": message.usage.output_tokens
                }
            }
        
        except (anthropic.RateLimitError, anthropic.APITimeoutError, anthropic.APIConnectionError) as e:
            logger.warning(f"Claude API transient error: {e}")
            return {
                "success": False,
                "error": f"API error: {str(e)}",
                "api": "claude",
                "retryable": True
            }
        except (anthropic.APIError, anthropic.AuthenticationError) as e:
            logger.error(f"Claude API error: {e}")
            return {
                "success": False,
                "error": f"API error: {str(e)}",
                "api": "claude",
                "retryable": False
            }
        except Exception as e:
            logger.error(f"Unexpected error in Claude Vision API: {e}")
            return {
                "success": False,
                "error": str(e),
                "api": "claude"
            }
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((anthropic.RateLimitError, anthropic.APITimeoutError, anthropic.APIConnectionError))
    )
    async def detect_objects(self, image: np.ndarray) -> Dict:
        """Detect objects in image"""
        prompt = """Analyze this image and provide:
1. List of objects detected with confidence levels
2. Their locations in the image (quadrants)
3. Relationships between objects
4. Any text visible in the image

Respond in JSON format:
{
    "objects": [{"name": "", "confidence": 0.0, "location": ""}],
    "text": [],
    "description": ""
}"""
        
        image_base64 = self._encode_image(image)
        
        try:
            message = await self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": image_base64
                                }
                            },
                            {
                                "type": "text",
                                "text": prompt
                            }
                        ]
                    }
                ]
            )
            
            # Extract JSON from response
            response_text = message.content[0].text
            try:
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    result = json.loads(response_text[json_start:json_end])
                else:
                    raise json.JSONDecodeError("No JSON found", response_text, 0)
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse JSON from Claude response: {e}")
                result = {"raw": response_text}
            
            return {
                "success": True,
                "objects": result,
                "api": "claude"
            }
        
        except (anthropic.RateLimitError, anthropic.APITimeoutError, anthropic.APIConnectionError) as e:
            logger.warning(f"Claude API transient error: {e}")
            return {
                "success": False,
                "error": f"API error: {str(e)}",
                "retryable": True
            }
        except (anthropic.APIError, anthropic.AuthenticationError) as e:
            logger.error(f"Claude API error: {e}")
            return {
                "success": False,
                "error": f"API error: {str(e)}",
                "retryable": False
            }
        except Exception as e:
            logger.error(f"Unexpected error in object detection: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    def _encode_image(self, image: np.ndarray) -> str:
        """Encode numpy array to base64 JPEG"""
        _, buffer = cv2.imencode('.jpg', image)
        image_base64 = base64.b64encode(buffer).decode('utf-8')
        return image_base64
    
    def _get_analysis_prompt(self, detail: str = "high") -> str:
        """Get analysis prompt based on detail level"""
        if detail == "high":
            return """Analyze this home surveillance image and provide:
1. Scene description (room type, lighting, etc)
2. People present (count, activities, approximate ages)
3. Objects visible (furniture, items, their locations)
4. Activity/events happening
5. Any unusual or noteworthy observations
6. Safety concerns if any

Be concise but thorough."""
        else:
            return """Briefly describe what's happening in this image."""
