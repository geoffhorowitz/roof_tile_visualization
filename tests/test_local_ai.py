import urllib.request
import json
import time

COMFYUI_SERVER = "http://127.0.0.1:8188"

def ping_server():
    """Checks if the ComfyUI API is running."""
    try:
        response = urllib.request.urlopen(COMFYUI_SERVER)
        if response.getcode() == 200:
            print("✅ ComfyUI API is reachable!")
            return True
    except Exception as e:
        print(f"❌ ComfyUI API is NOT reachable: {e}")
        print("Please ensure you have started ComfyUI as per docs/LOCAL_AI_SETUP.md")
        return False

def test_generation():
    """Sends a basic dummy workflow to ensure the queue accepts it."""
    # A simplified dummy ComfyUI workflow JSON that just tests connectivity 
    # without requiring all models to be perfectly set up for this ping test.
    prompt = {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": 12345,
                "steps": 1, # fast test
                "cfg": 8,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0]
            }
        }
    }
    
    data = json.dumps({"prompt": prompt}).encode('utf-8')
    req = urllib.request.Request(f"{COMFYUI_SERVER}/prompt", data=data)
    req.add_header('Content-Type', 'application/json')
    
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        if "prompt_id" in result:
            print(f"✅ Generation API works! Prompt queued with ID: {result['prompt_id']}")
        else:
            print(f"⚠️ Unexpected response: {result}")
    except Exception as e:
        print(f"❌ Failed to queue generation: {e}")

if __name__ == "__main__":
    print("Testing Local AI Setup (ComfyUI)...")
    if ping_server():
        print("Note: Skipping full generation test by default to avoid missing model errors during basic setup.")
        # test_generation()
