"""
Browser Controller - Integration with browser automation systems
Connects Jarvis voice commands to browser actions
"""  # [NRS-905]

import asyncio  # [NRS-905] Async helpers for browser operations
import logging  # [NRS-909] Logging for browser automation
from typing import Optional, Dict, Any, List  # [NRS-908] Typing for results and driver handles
from dataclasses import dataclass  # [NRS-908] Lightweight result container
from selenium import webdriver  # [NRS-901] Selenium driver for browser control
from selenium.webdriver.common.by import By  # [NRS-902] DOM location strategies
from selenium.webdriver.common.keys import Keys  # [NRS-903] Keyboard simulation
from selenium.webdriver.support.ui import WebDriverWait  # [NRS-902] Wait utilities for DOM readiness
from selenium.webdriver.support import expected_conditions as EC  # [NRS-902] Expected conditions helpers
from selenium.webdriver.chrome.options import Options  # [NRS-901] Chrome options for session setup
import time  # [NRS-908] Timing for waits and filenames
import re  # [NRS-902] Regex parsing of commands

logger = logging.getLogger(__name__)  # [NRS-909] Module logger for browser controller

@dataclass  # [NRS-905]
class BrowserResult:  # [NRS-905]
    """Result of a browser operation"""  # [NRS-905]
    success: bool  # [NRS-908] Operation success flag
    message: Optional[str] = None  # [NRS-909] Human-readable status
    error: Optional[str] = None  # [NRS-909] Error detail when failed
    data: Optional[Dict[str, Any]] = None  # [NRS-906] Optional payload

class BrowserController:  # [NRS-905]
    """Controls browser automation via voice commands"""  # [NRS-905]
    
    def __init__(self, headless: bool = False):  # [NRS-905]
        self.driver: Optional[webdriver.Chrome] = None  # [NRS-901] Selenium driver handle
        self.headless = headless  # [NRS-901] Headless flag for session
        self.wait_timeout = 10  # [NRS-902] Default wait timeout seconds
        self.is_initialized = False  # [NRS-908] Session state flag
        
        logger.info(f"Browser controller initialized (headless: {headless})")  # [NRS-909] Startup log
    
    async def initialize(self) -> BrowserResult:  # [NRS-905]
        """Initialize browser instance"""  # [NRS-905]
        if self.is_initialized:  # [NRS-905]
            return BrowserResult(success=True, message="Already initialized")  # [NRS-908] Idempotent init
        
        try:  # [NRS-905]
            options = Options()  # [NRS-901] Build Chrome options
            if self.headless:  # [NRS-905]
                options.add_argument("--headless")  # [NRS-901] Enable headless
            options.add_argument("--no-sandbox")  # [NRS-901] Sandbox flag for containers
            options.add_argument("--disable-dev-shm-usage")  # [NRS-901] Shared memory flag
            options.add_argument("--disable-gpu")  # [NRS-901] GPU disable for headless stability
            options.add_argument("--window-size=1920,1080")  # [NRS-901] Default viewport
            
            self.driver = webdriver.Chrome(options=options)  # [NRS-901] Launch Chrome driver
            self.is_initialized = True  # [NRS-908] Mark initialized
            
            logger.info("✅ Browser initialized successfully")  # [NRS-909] Init success log
            return BrowserResult(  # [NRS-905]
                success=True,  # [NRS-905]
                message="Browser ready for automation"  # [NRS-905]
            )  # [NRS-908] Ready state result
            
        except Exception as e:  # [NRS-905]
            logger.error(f"Browser initialization failed: {e}")  # [NRS-909] Init failure log
            return BrowserResult(  # [NRS-905]
                success=False,  # [NRS-905]
                error=f"Failed to initialize browser: {e}"  # [NRS-905]
            )  # [NRS-909] Init error result
    
    async def execute_command(self, command: str) -> BrowserResult:  # [NRS-905]
        """Execute voice command as browser action"""  # [NRS-905]
        if not self.is_initialized:  # [NRS-905]
            init_result = await self.initialize()  # [NRS-908] Ensure driver ready
            if not init_result.success:  # [NRS-905]
                return init_result  # [NRS-909] Propagate init failure
        
        try:  # [NRS-905]
            command_lower = command.lower().strip()  # [NRS-905] Normalize command text
            
            if any(word in command_lower for word in ["navigate", "go to", "open", "visit"]):  # [NRS-905]
                return await self._handle_navigation(command)  # [NRS-905] Navigation command
            elif any(word in command_lower for word in ["click", "press", "tap"]):  # [NRS-905]
                return await self._handle_click(command)  # [NRS-903] Click command
            elif any(word in command_lower for word in ["type", "enter", "fill", "write"]):  # [NRS-905]
                return await self._handle_typing(command)  # [NRS-904] Typing/form entry
            elif any(word in command_lower for word in ["search", "find", "look for"]):  # [NRS-905]
                return await self._handle_search(command)  # [NRS-905] Search action
            elif any(word in command_lower for word in ["scroll", "page down", "page up"]):  # [NRS-905]
                return await self._handle_scroll(command)  # [NRS-903] Scroll action
            elif "back" in command_lower:  # [NRS-905]
                return await self._go_back()  # [NRS-905] History back
            elif "forward" in command_lower:  # [NRS-905]
                return await self._go_forward()  # [NRS-905] History forward
            elif any(word in command_lower for word in ["refresh", "reload"]):  # [NRS-905]
                return await self._refresh()  # [NRS-905] Page refresh
            elif any(word in command_lower for word in ["title", "what page", "where am i"]):  # [NRS-905]
                return await self._get_page_info()  # [NRS-905] Page metadata
            else:  # [NRS-905]
                return BrowserResult(  # [NRS-905]
                    success=False,  # [NRS-905]
                    error=f"Unknown browser command: {command}"  # [NRS-905]
                )  # [NRS-909] Unknown command handling
                
        except Exception as e:  # [NRS-905]
            logger.error(f"Command execution failed: {e}")  # [NRS-909] Command error log
            return BrowserResult(  # [NRS-905]
                success=False,  # [NRS-905]
                error=f"Command failed: {e}"  # [NRS-905]
            )  # [NRS-909] Command failure result
    
    async def _handle_navigation(self, command: str) -> BrowserResult:  # [NRS-905]
        """Handle navigation commands"""  # [NRS-905]
        patterns = [  # [NRS-905]
            r"(?:navigate to|go to|open|visit)\s+(.+)",  # [NRS-905]
            r"(.+)"  # [NRS-905]
        ]  # [NRS-905] Regex patterns for navigation targets
        
        url = None  # [NRS-905] Extracted URL or search term
        for pattern in patterns:  # [NRS-905]
            match = re.search(pattern, command, re.IGNORECASE)  # [NRS-905] Parse spoken command
            if match:  # [NRS-905]
                url = match.group(1).strip()  # [NRS-905] Clean parsed target
                break  # [NRS-905]
        
        if not url:  # [NRS-905]
            return BrowserResult(  # [NRS-905]
                success=False,  # [NRS-905]
                error="Could not extract URL from command"  # [NRS-905]
            )  # [NRS-909] Missing target error
        
        url = self._process_url(url)  # [NRS-905] Normalize URL or search
        
        try:  # [NRS-905]
            logger.info(f"🌐 Navigating to: {url}")  # [NRS-909] Navigation log
            await asyncio.to_thread(self.driver.get, url)  # [NRS-905] Navigate in background thread
            
            await asyncio.sleep(2)  # [NRS-905] Allow page load
            
            current_url = self.driver.current_url  # [NRS-905] Final URL after redirects
            title = self.driver.title  # [NRS-905] Page title
            
            return BrowserResult(  # [NRS-905]
                success=True,  # [NRS-905]
                message=f"Navigated to {title}",  # [NRS-905]
                data={"url": current_url, "title": title}  # [NRS-905]
            )  # [NRS-905] Navigation success payload
            
        except Exception as e:  # [NRS-905]
            return BrowserResult(  # [NRS-905]
                success=False,  # [NRS-905]
                error=f"Navigation failed: {e}"  # [NRS-905]
            )  # [NRS-909] Navigation failure
    
    def _process_url(self, url: str) -> str:  # [NRS-905]
        """Process and clean URL"""  # [NRS-905]
        url = url.strip().lower()  # [NRS-905] Normalize input
        
        site_mappings = {  # [NRS-905]
            "google": "https://www.google.com",  # [NRS-905]
            "youtube": "https://www.youtube.com",  # [NRS-905]
            "github": "https://github.com",  # [NRS-905]
            "twitter": "https://twitter.com",  # [NRS-905]
            "facebook": "https://www.facebook.com",  # [NRS-905]
            "linkedin": "https://www.linkedin.com",  # [NRS-905]
            "reddit": "https://www.reddit.com",  # [NRS-905]
            "stackoverflow": "https://stackoverflow.com",  # [NRS-905]
            "wikipedia": "https://www.wikipedia.org"  # [NRS-905]
        }  # [NRS-905] Friendly shortcuts
        
        if url in site_mappings:  # [NRS-905]
            return site_mappings[url]  # [NRS-905] Map shortcut
        if url.startswith(("http://", "https://")):  # [NRS-905]
            return url  # [NRS-905] Already absolute
        if "." in url and " " not in url:  # [NRS-905]
            return f"https://{url}"  # [NRS-905] Assume domain
        return f"https://www.google.com/search?q={url.replace(' ', '+')}"  # [NRS-905] Default search
    
    async def _handle_click(self, command: str) -> BrowserResult:  # [NRS-905]
        """Handle click commands"""  # [NRS-905]
        patterns = [  # [NRS-905]
            r"click (?:on )?(?:the )?(.+)",  # [NRS-905]
            r"press (?:the )?(.+)",  # [NRS-905]
            r"tap (?:the )?(.+)"  # [NRS-905]
        ]  # [NRS-903] Click target patterns
        
        target = None  # [NRS-903] Parsed click target
        for pattern in patterns:  # [NRS-905]
            match = re.search(pattern, command, re.IGNORECASE)  # [NRS-905]
            if match:  # [NRS-905]
                target = match.group(1).strip()  # [NRS-905]
                break  # [NRS-905]
        
        if not target:  # [NRS-905]
            return BrowserResult(  # [NRS-905]
                success=False,  # [NRS-905]
                error="Could not identify what to click"  # [NRS-905]
            )  # [NRS-909] Missing target error
        
        try:  # [NRS-905]
            logger.info(f"👆 Clicking on: {target}")  # [NRS-909] Click log
            element = await self._find_element(target)  # [NRS-902] Locate target element
            
            if element:  # [NRS-905]
                await asyncio.to_thread(element.click)  # [NRS-903] Perform click
                return BrowserResult(  # [NRS-905]
                    success=True,  # [NRS-905]
                    message=f"Clicked on {target}"  # [NRS-905]
                )  # [NRS-903] Click success
            else:  # [NRS-905]
                return BrowserResult(  # [NRS-905]
                    success=False,  # [NRS-905]
                    error=f"Could not find element: {target}"  # [NRS-905]
                )  # [NRS-909] Element not found
                
        except Exception as e:  # [NRS-905]
            return BrowserResult(  # [NRS-905]
                success=False,  # [NRS-905]
                error=f"Click failed: {e}"  # [NRS-905]
            )  # [NRS-909] Click failure
    
    async def _find_element(self, target: str):  # [NRS-905]
        """Find element using various strategies"""  # [NRS-905]
        await asyncio.sleep(0.01)  # [NRS-905] Make function properly async
        wait = WebDriverWait(self.driver, self.wait_timeout)  # [NRS-902] Wait helper
        
        try:  # [NRS-905]
            return wait.until(EC.element_to_be_clickable((By.LINK_TEXT, target)))  # [NRS-902] Link text
        except Exception:  # [NRS-905]
            pass  # [NRS-909] Fallback to next strategy
        try:  # [NRS-905]
            return wait.until(EC.element_to_be_clickable((By.PARTIAL_LINK_TEXT, target)))  # [NRS-902] Partial link text
        except Exception:  # [NRS-905]
            pass  # [NRS-905]
        try:  # [NRS-905]
            xpath = f"//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{target.lower()}')]"  # [NRS-902] Button text xpath
            return wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))  # [NRS-905]
        except Exception:  # [NRS-905]
            pass  # [NRS-905]
        try:  # [NRS-905]
            xpath = f"//*[@aria-label[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{target.lower()}')]]"  # [NRS-902] Aria-label xpath
            return wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))  # [NRS-905]
        except Exception:  # [NRS-905]
            pass  # [NRS-905]
        try:  # [NRS-905]
            xpath = f"//*[@title[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '{target.lower()}')]]"  # [NRS-902] Title attribute xpath
            return wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))  # [NRS-905]
        except Exception:  # [NRS-905]
            pass  # [NRS-905]
        return None  # [NRS-909] Give up if not found
    
    async def _handle_typing(self, command: str) -> BrowserResult:  # [NRS-905]
        """Handle typing commands"""  # [NRS-905]
        patterns = [  # [NRS-905]
            r"type ['\"](.+?)['\"]",  # [NRS-905]
            r"enter ['\"](.+?)['\"]",  # [NRS-905]
            r"fill (?:in )?['\"](.+?)['\"]",  # [NRS-905]
            r"write ['\"](.+?)['\"]"  # [NRS-905]
        ]  # [NRS-904] Text capture patterns
        
        text = None  # [NRS-904] Parsed text content
        for pattern in patterns:  # [NRS-905]
            match = re.search(pattern, command, re.IGNORECASE)  # [NRS-905]
            if match:  # [NRS-905]
                text = match.group(1)  # [NRS-905]
                break  # [NRS-905]
        
        if not text:  # [NRS-905]
            return BrowserResult(  # [NRS-905]
                success=False,  # [NRS-905]
                error="Could not extract text to type"  # [NRS-905]
            )  # [NRS-909] Missing text error
        
        try:  # [NRS-905]
            logger.info(f"⌨️ Typing: {text}")  # [NRS-909] Typing log
            element = await self._find_input_field()  # [NRS-902] Locate input
            
            if element:  # [NRS-905]
                await asyncio.to_thread(element.clear)  # [NRS-904] Clear existing text
                await asyncio.to_thread(element.send_keys, text)  # [NRS-904] Send new text
                return BrowserResult(  # [NRS-905]
                    success=True,  # [NRS-905]
                    message=f"Typed: {text}"  # [NRS-905]
                )  # [NRS-904] Typing success
            else:  # [NRS-905]
                return BrowserResult(  # [NRS-905]
                    success=False,  # [NRS-905]
                    error="No input field found"  # [NRS-905]
                )  # [NRS-909] Input not found
                
        except Exception as e:  # [NRS-905]
            return BrowserResult(  # [NRS-905]
                success=False,  # [NRS-905]
                error=f"Typing failed: {e}"  # [NRS-905]
            )  # [NRS-909] Typing error
    
    async def _find_input_field(self):  # [NRS-905]
        """Find an input field to type in"""  # [NRS-905]
        await asyncio.sleep(0.01)  # [NRS-905] Make function properly async
        wait = WebDriverWait(self.driver, 5)  # [NRS-902] Short wait for fields
        
        selectors = [  # [NRS-905]
            "input[type='text']",  # [NRS-905]
            "input[type='search']",  # [NRS-905]
            "input[name*='search']",  # [NRS-905]
            "input[placeholder*='search']",  # [NRS-905]
            "textarea",  # [NRS-905]
            "input:not([type='hidden']):not([type='button']):not([type='submit'])"  # [NRS-905]
        ]  # [NRS-902] Common input selectors
        
        for selector in selectors:  # [NRS-905]
            try:  # [NRS-905]
                return wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))  # [NRS-902] Return first clickable input
            except Exception:  # [NRS-905]
                continue  # [NRS-909] Try next selector
        
        return None  # [NRS-909] No input found
    
    async def _handle_search(self, command: str) -> BrowserResult:  # [NRS-905]
        """Handle search commands"""  # [NRS-905]
        patterns = [  # [NRS-905]
            r"search (?:for )?['\"](.+?)['\"]",  # [NRS-905]
            r"search (?:for )?(.+)",  # [NRS-905]
            r"find ['\"](.+?)['\"]",  # [NRS-905]
            r"look for ['\"](.+?)['\"]"  # [NRS-905]
        ]  # [NRS-905] Search phrase patterns
        
        query = None  # [NRS-905] Parsed search query
        for pattern in patterns:  # [NRS-905]
            match = re.search(pattern, command, re.IGNORECASE)  # [NRS-905]
            if match:  # [NRS-905]
                query = match.group(1).strip()  # [NRS-905]
                break  # [NRS-905]
        
        if not query:  # [NRS-905]
            return BrowserResult(  # [NRS-905]
                success=False,  # [NRS-905]
                error="Could not extract search query"  # [NRS-905]
            )  # [NRS-909] Missing query
        
        try:  # [NRS-905]
            current_url = self.driver.current_url  # [NRS-905] Current page
            if "google.com" not in current_url:  # [NRS-905]
                await asyncio.to_thread(self.driver.get, "https://www.google.com")  # [NRS-905] Move to search page
                await asyncio.sleep(1)  # [NRS-905] Wait for load
            
            search_box = await self._find_input_field()  # [NRS-902] Locate search input
            if search_box:  # [NRS-905]
                await asyncio.to_thread(search_box.clear)  # [NRS-904] Clear field
                await asyncio.to_thread(search_box.send_keys, query)  # [NRS-904] Type query
                await asyncio.to_thread(search_box.send_keys, Keys.RETURN)  # [NRS-903] Submit search
                
                await asyncio.sleep(2)  # [NRS-905] Wait for results
                
                return BrowserResult(  # [NRS-905]
                    success=True,  # [NRS-905]
                    message=f"Searched for: {query}"  # [NRS-905]
                )  # [NRS-905] Search success
            else:  # [NRS-905]
                return BrowserResult(  # [NRS-905]
                    success=False,  # [NRS-905]
                    error="Could not find search box"  # [NRS-905]
                )  # [NRS-909] No search box
                
        except Exception as e:  # [NRS-905]
            return BrowserResult(  # [NRS-905]
                success=False,  # [NRS-905]
                error=f"Search failed: {e}"  # [NRS-905]
            )  # [NRS-909] Search failure
    
    async def _handle_scroll(self, command: str) -> BrowserResult:  # [NRS-905]
        """Handle scroll commands"""  # [NRS-905]
        try:  # [NRS-905]
            if "down" in command.lower() or "page down" in command.lower():  # [NRS-905]
                await asyncio.to_thread(  # [NRS-905]
                    self.driver.execute_script,  # [NRS-905]
                    "window.scrollBy(0, window.innerHeight);"  # [NRS-905]
                )  # [NRS-903] Scroll down one viewport
                return BrowserResult(success=True, message="Scrolled down")  # [NRS-903] Scroll success
                
            elif "up" in command.lower() or "page up" in command.lower():  # [NRS-905]
                await asyncio.to_thread(  # [NRS-905]
                    self.driver.execute_script,  # [NRS-905]
                    "window.scrollBy(0, -window.innerHeight);"  # [NRS-905]
                )  # [NRS-903] Scroll up one viewport
                return BrowserResult(success=True, message="Scrolled up")  # [NRS-903] Scroll success
                
            else:  # [NRS-905]
                return BrowserResult(  # [NRS-905]
                    success=False,  # [NRS-905]
                    error="Unknown scroll direction"  # [NRS-905]
                )  # [NRS-909] Unknown direction
                
        except Exception as e:  # [NRS-905]
            return BrowserResult(  # [NRS-905]
                success=False,  # [NRS-905]
                error=f"Scroll failed: {e}"  # [NRS-905]
            )  # [NRS-909] Scroll failure
    
    async def _go_back(self) -> BrowserResult:  # [NRS-905]
        """Go back in browser history"""  # [NRS-905]
        try:  # [NRS-905]
            await asyncio.to_thread(self.driver.back)  # [NRS-905] Back navigation
            return BrowserResult(success=True, message="Went back")  # [NRS-905] Back success
        except Exception as e:  # [NRS-905]
            return BrowserResult(success=False, error=f"Back failed: {e}")  # [NRS-909] Back failure
    
    async def _go_forward(self) -> BrowserResult:  # [NRS-905]
        """Go forward in browser history"""  # [NRS-905]
        try:  # [NRS-905]
            await asyncio.to_thread(self.driver.forward)  # [NRS-905] Forward navigation
            return BrowserResult(success=True, message="Went forward")  # [NRS-905] Forward success
        except Exception as e:  # [NRS-905]
            return BrowserResult(success=False, error=f"Forward failed: {e}")  # [NRS-909] Forward failure
    
    async def _refresh(self) -> BrowserResult:  # [NRS-905]
        """Refresh current page"""  # [NRS-905]
        try:  # [NRS-905]
            await asyncio.to_thread(self.driver.refresh)  # [NRS-905] Refresh page
            return BrowserResult(success=True, message="Page refreshed")  # [NRS-905] Refresh success
        except Exception as e:  # [NRS-905]
            return BrowserResult(success=False, error=f"Refresh failed: {e}")  # [NRS-909] Refresh failure
    
    async def _get_page_info(self) -> BrowserResult:  # [NRS-905]
        """Get current page information"""  # [NRS-905]
        await asyncio.sleep(0.01)  # [NRS-905] Make function properly async
        try:  # [NRS-905]
            title = self.driver.title  # [NRS-905] Current title
            url = self.driver.current_url  # [NRS-905] Current URL
            
            return BrowserResult(  # [NRS-905]
                success=True,  # [NRS-905]
                message=f"Current page: {title}",  # [NRS-905]
                data={"title": title, "url": url}  # [NRS-905]
            )  # [NRS-905] Info payload
        except Exception as e:  # [NRS-905]
            return BrowserResult(success=False, error=f"Failed to get page info: {e}")  # [NRS-909] Info failure
    
    async def take_screenshot(self, filename: Optional[str] = None) -> BrowserResult:  # [NRS-905]
        """Take screenshot of current page"""  # [NRS-905]
        try:  # [NRS-905]
            if not filename:  # [NRS-905]
                timestamp = int(time.time())  # [NRS-908] Timestamp for filename
                filename = f"data/temp/screenshot_{timestamp}.png"  # [NRS-908] Default path
            
            await asyncio.to_thread(self.driver.save_screenshot, filename)  # [NRS-906] Capture screenshot
            return BrowserResult(  # [NRS-905]
                success=True,  # [NRS-905]
                message=f"Screenshot saved: {filename}",  # [NRS-905]
                data={"filename": filename}  # [NRS-905]
            )  # [NRS-906] Screenshot result
        except Exception as e:  # [NRS-905]
            return BrowserResult(success=False, error=f"Screenshot failed: {e}")  # [NRS-909] Screenshot failure
    
    async def get_page_text(self) -> BrowserResult:  # [NRS-905]
        """Get all text from current page"""  # [NRS-905]
        try:  # [NRS-905]
            text = await asyncio.to_thread(  # [NRS-905]
                self.driver.execute_script,  # [NRS-905]
                "return document.body.innerText;"  # [NRS-905]
            )  # [NRS-906] Extract page text
            return BrowserResult(  # [NRS-905]
                success=True,  # [NRS-905]
                message="Page text extracted",  # [NRS-905]
                data={"text": text}  # [NRS-905]
            )  # [NRS-906] Text extraction success
        except Exception as e:  # [NRS-905]
            return BrowserResult(success=False, error=f"Text extraction failed: {e}")  # [NRS-909] Text extraction failure
    
    async def cleanup(self):  # [NRS-905]
        """Clean up browser resources"""  # [NRS-905]
        if self.driver:  # [NRS-905]
            try:  # [NRS-905]
                await asyncio.to_thread(self.driver.quit)  # [NRS-908] Close browser session
                logger.info("🧹 Browser cleaned up")  # [NRS-909] Cleanup log
            except Exception as e:  # [NRS-905]
                logger.error(f"Browser cleanup error: {e}")  # [NRS-909] Cleanup failure log
            finally:  # [NRS-905]
                self.driver = None  # [NRS-908] Drop driver reference
                self.is_initialized = False  # [NRS-908] Reset state

if __name__ == "__main__":  # [NRS-905]
    import asyncio  # [NRS-905] Async runtime for demo
    
    async def test_browser_controller():  # [NRS-905]
        browser = BrowserController(headless=False)  # [NRS-901] Create controller instance
        
        commands = [  # [NRS-905]
            "navigate to google",  # [NRS-905]
            "search for weather today",  # [NRS-905]
            "click on search",  # [NRS-905]
            "scroll down",  # [NRS-905]
            "go back"  # [NRS-905]
        ]  # [NRS-905] Demo command list
        
        print("🌐 Testing browser controller...")  # [NRS-909] Demo status
        
        for command in commands:  # [NRS-905]
            print(f"\n📝 Executing: {command}")  # [NRS-909] Command log
            result = await browser.execute_command(command)  # [NRS-905] Execute demo command
            
            if result.success:  # [NRS-905]
                print(f"✅ {result.message}")  # [NRS-909] Success output
            else:  # [NRS-905]
                print(f"❌ {result.error}")  # [NRS-909] Error output
            
            await asyncio.sleep(2)  # [NRS-905] Pause between commands
        
        await browser.cleanup()  # [NRS-908] Close session after demo
        print("\n🧹 Browser test completed")  # [NRS-909] Demo completion
    
    asyncio.run(test_browser_controller())  # [NRS-905] Run demo coroutine