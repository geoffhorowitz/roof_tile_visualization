import os
import sys
import json
import base64
import time
import subprocess
import urllib.request
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler

COMFYUI_PORT = 8188
COMFYUI_URL = f"http://127.0.0.1:{COMFYUI_PORT}"

# Global process handle for ComfyUI
comfyui_process = None

def start_comfyui():
    """Starts the ComfyUI server in the background."""
    global comfyui_process
    print("Starting local ComfyUI API server...")
    
    # ComfyUI is installed at workdir (/app) in the Docker image
    comfyui_process = subprocess.Popen(
        ["python3", "main.py", "--listen", "127.0.0.1", "--port", str(COMFYUI_PORT)],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
    
    # Wait for ComfyUI to fully start and listen
    print("Waiting for ComfyUI to start...")
    for _ in range(30):
        try:
            with urllib.request.urlopen(COMFYUI_URL, timeout=1) as response:
                if response.status == 200:
                    print("ComfyUI server is online and reachable!")
                    return
        except Exception:
            time.sleep(1)
            
    print("Error: ComfyUI server failed to start within 30 seconds.")
    sys.exit(1)

class VertexPredictorHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Override to log predictions to stdout/GCP Cloud Logging
        sys.stdout.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), format%args))

    def do_GET(self):
        """Handles health check requests from Vertex AI."""
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "healthy"}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        """Handles inference/prediction requests from Vertex AI."""
        if self.path != "/predict":
            self.send_response(404)
            self.end_headers()
            return

        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length)
        
        try:
            request_json = json.loads(post_data.decode("utf-8"))
            instances = request_json.get("instances", [])
            
            if not instances:
                raise ValueError("Request payload is missing 'instances' list.")
                
            instance = instances[0]
            workflow = instance.get("workflow")
            base64_image = instance.get("image")
            
            if not workflow or not base64_image:
                raise ValueError("Instance payload is missing 'workflow' or 'image' data.")
                
            # 1. Decode base64 input image and save to ComfyUI's input directory
            input_dir = "/app/input"
            os.makedirs(input_dir, exist_ok=True)
            input_filename = "input.png"
            input_filepath = os.path.join(input_dir, input_filename)
            
            # Clean up base64 prefix if present
            if "," in base64_image:
                base64_image = base64_image.split(",")[1]
                
            image_data = base64.b64decode(base64_image)
            with open(input_filepath, "wb") as f:
                f.write(image_data)
            print(f"Decoded and saved input image to {input_filepath}")
            
            # 2. Submit prompt workflow to local ComfyUI
            prompt_payload = json.dumps({"prompt": workflow}).encode("utf-8")
            req = urllib.request.Request(
                f"{COMFYUI_URL}/prompt",
                data=prompt_payload,
                headers={"Content-Type": "application/json"}
            )
            
            with urllib.request.urlopen(req) as res:
                res_data = json.loads(res.read().decode("utf-8"))
                prompt_id = res_data["prompt_id"]
                
            print(f"Workflow prompt queued with ID: {prompt_id}")
            
            # 3. Poll local ComfyUI history endpoint for completion
            is_done = False
            output_filename = None
            poll_attempts = 0
            
            while not is_done and poll_attempts < 60:
                time.sleep(2)
                poll_attempts += 1
                try:
                    with urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}") as history_res:
                        history_data = json.loads(history_res.read().decode("utf-8"))
                        
                        if prompt_id in history_data:
                            outputs = history_data[prompt_id].get("outputs", {})
                            for node_id, out in outputs.items():
                                if "images" in out and len(out["images"]) > 0:
                                    output_filename = out["images"][0]["filename"]
                                    is_done = True
                                    break
                except Exception as poll_err:
                    print(f"Polling warning: {poll_err}")
            
            if not is_done or not output_filename:
                raise TimeoutError("ComfyUI generation workflow timed out.")
                
            # 4. Read the local output file, convert to base64, and return it
            output_filepath = os.path.join("/app/output", output_filename)
            if not os.path.exists(output_filepath):
                # Search recursively in output just in case of subfolders
                found = False
                for root, dirs, files in os.walk("/app/output"):
                    if output_filename in files:
                        output_filepath = os.path.join(root, output_filename)
                        found = True
                        break
                if not found:
                    raise FileNotFoundError(f"Generated output file not found in output directories: {output_filename}")
                    
            with open(output_filepath, "rb") as f:
                output_data = f.read()
                
            base64_output = base64.b64encode(output_data).decode("utf-8")
            print(f"Successfully generated and encoded output image: {output_filename}")
            
            # Response in Vertex AI predictions structure
            response_json = {
                "predictions": [
                    {
                        "image": base64_output
                    }
                ]
            }
            
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(response_json).encode("utf-8"))
            
        except Exception as err:
            print(f"Prediction Error: {err}")
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(err)}).encode("utf-8"))

def run_server(port=8080):
    """Starts the Vertex AI Prediction Web Server."""
    server_address = ("", port)
    httpd = HTTPServer(server_address, VertexPredictorHandler)
    print(f"Vertex AI Predict server running on port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        if comfyui_process:
            print("Stopping ComfyUI process...")
            comfyui_process.terminate()
            comfyui_process.wait()

if __name__ == "__main__":
    start_comfyui()
    run_server()
