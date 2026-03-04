import openai
import base64
import cv2
import numpy as np
from typing import Optional, Dict
from datetime import datetime
import json
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

logger = logging.getLogger(__name__)


class GPT4oVisionAPI:
    """GPT-4o Vision API integration with retry logic"""
    
    def __init__(self, api_key: str):
        self.client = openai.AsyncOpenAI(api_key=api_key)
        self.model = "gpt-4o"  # Updated to latest stable model
        self.max_tokens = 1024
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((openai.APIError, openai.OpenAIError))
    )
    async def analyze_image(self, image: np.ndarray, detail: str = "high") -> Dict:
        """Analyze image with GPT-4o Vision"""
        try:
            # Convert numpy array to base64
            image_base64 = self._encode_image(image)
            
            # Create message content
            content = [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_base64}",
                        "detail": detail
                    }
                },
                {
                    "type": "text",
                    "text": self._get_analysis_prompt(detail)
                }
            ]
            
            # Use correct OpenAI API method
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                max_tokens=self.max_tokens
            )
            
            # Parse response
            response_text = response.choices[0].message.content
            
            return {
                "success": True,
                "analysis": response_text,
                "api": "gpt4o",
                "timestamp": datetime.utcnow().isoformat(),
                "usage": {
                    "input_tokens": response.usage.prompt_tokens,
                    "output_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens
                }
            }
        
        except (openai.APIError, openai.OpenAIError) as e:
            # Check if it's a retryable error (rate limit, timeout, connection)
            error_str = str(e).lower()
            retryable = any(keyword in error_str for keyword in ['rate', 'timeout', 'connection', 'network'])
            if retryable:
                logger.warning(f"OpenAI API transient error: {e}")
            else:
                logger.error(f"OpenAI API error: {e}")
            return {
                "success": False,
                "error": f"API error: {str(e)}",
                "api": "gpt4o",
                "retryable": retryable
            }
        except openai.InvalidRequestError as e:
            logger.error(f"OpenAI API error: {e}")
            return {
                "success": False,
                "error": f"API error: {str(e)}",
                "api": "gpt4o",
                "retryable": False
            }
        except Exception as e:
            logger.error(f"Unexpected error in GPT-4o Vision API: {e}")
            return {
                "success": False,
                "error": str(e),
                "api": "gpt4o"
            }
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type((openai.APIError, openai.OpenAIError))
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
            content = [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{image_base64}",
                        "detail": "high"
                    }
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ]
            
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "user",
                        "content": content
                    }
                ],
                max_tokens=1024
            )
            
            # Extract JSON from response
            response_text = response.choices[0].message.content
            try:
                json_start = response_text.find('{')
                json_end = response_text.rfind('}') + 1
                if json_start >= 0 and json_end > json_start:
                    result = json.loads(response_text[json_start:json_end])
                else:
                    raise json.JSONDecodeError("No JSON found", response_text, 0)
            except (json.JSONDecodeError, ValueError) as e:
                logger.warning(f"Failed to parse JSON from response: {e}")
                result = {"raw": response_text}
            
            return {
                "success": True,
                "objects": result,
                "api": "gpt4o"
            }
        
        except (openai.APIError, openai.OpenAIError) as e:
            # Check if it's a retryable error (rate limit, timeout, connection)
            error_str = str(e).lower()
            retryable = any(keyword in error_str for keyword in ['rate', 'timeout', 'connection', 'network'])
            if retryable:
                logger.warning(f"OpenAI API transient error: {e}")
            else:
                logger.error(f"OpenAI API error: {e}")
            return {
                "success": False,
                "error": f"API error: {str(e)}",
                "retryable": retryable
            }
        except openai.InvalidRequestError as e:
            logger.error(f"OpenAI API invalid request: {e}")
            return {
                "success": False,
                "error": f"Invalid request: {str(e)}",
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
