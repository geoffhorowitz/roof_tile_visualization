import urllib.request
import urllib.parse
import json
import random
import time
import os
import sys

COMFYUI_SERVER = "http://127.0.0.1:8188"

def upload_image(image_path):
    """Uploads an image to ComfyUI."""
    print(f"Uploading {image_path} to ComfyUI...")
    if not os.path.exists(image_path):
        print(f"Error: {image_path} does not exist.")
        sys.exit(1)
        
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    headers = {'Content-Type': f'multipart/form-data; boundary={boundary}'}
    
    with open(image_path, 'rb') as f:
        file_content = f.read()
        
    filename = os.path.basename(image_path)
    
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="{filename}"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode('utf-8') + file_content + (
        f"\r\n--{boundary}\r\n"
        f'Content-Disposition: form-data; name="overwrite"\r\n\r\n'
        f"true\r\n--{boundary}--\r\n"
    ).encode('utf-8')
    
    req = urllib.request.Request(f"{COMFYUI_SERVER}/upload/image", data=body, headers=headers)
    try:
        response = urllib.request.urlopen(req)
        res_data = json.loads(response.read().decode('utf-8'))
        print(f"Uploaded successfully. ComfyUI filename: {res_data['name']}")
        return res_data['name']
    except Exception as e:
        print(f"Failed to upload image: {e}")
        sys.exit(1)

def run_inpainting(uploaded_filename, sam_prompt, controlnet_strength, output_path, tile_prompt="red terracotta spanish roof tiles"):
    """Runs the inpainting workflow with specified parameters."""
    print(f"Running inpainting: SAM='{sam_prompt}', ControlNet={controlnet_strength}, Output={output_path}")
    
    workflow = {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": random.randint(1, 10000000),
                "steps": 20,
                "cfg": 8,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["17", 0],
                "negative": ["17", 1],
                "latent_image": ["8", 0]
            }
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": "sd_xl_base_1.0_inpainting_0.1.safetensors"
            }
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": tile_prompt,
                "clip": ["4", 1]
            }
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": "text, watermark, ugly, deformed, blurry",
                "clip": ["4", 1]
            }
        },
        "8": {
            "class_type": "VAEEncodeForInpaint",
            "inputs": {
                "pixels": ["9", 0],
                "vae": ["4", 2],
                "mask": ["14", 0],
                "grow_mask_by": 6
            }
        },
        "9": {
            "class_type": "LoadImage",
            "inputs": {
                "image": uploaded_filename
            }
        },
        "10": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2]
            }
        },
        "11": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "roof_debug",
                "images": ["10", 0]
            }
        },
        "12": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": "sam3.1_multiplex_fp16.safetensors"
            }
        },
        "14": {
            "class_type": "SAM3_Detect",
            "inputs": {
                "model": ["12", 0],
                "image": ["9", 0],
                "conditioning": ["18", 0],
                "threshold": 0.3,
                "refine_iterations": 2,
                "individual_masks": False
            }
        },
        "18": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": sam_prompt,
                "clip": ["12", 1]
            }
        },
        "15": {
            "class_type": "ControlNetLoader",
            "inputs": {
                "control_net_name": "diffusion_pytorch_model.safetensors"
            }
        },
        "16": {
            "class_type": "MiDaS-DepthMapPreprocessor",
            "inputs": {
                "image": ["9", 0],
                "a": 6.283185307179586,
                "bg_threshold": 0.1,
                "resolution": 512
            }
        },
        "17": {
            "class_type": "ControlNetApplyAdvanced",
            "inputs": {
                "strength": controlnet_strength,
                "start_percent": 0.0,
                "end_percent": 1.0,
                "positive": ["6", 0],
                "negative": ["7", 0],
                "control_net": ["15", 0],
                "image": ["16", 0]
            }
        }
    }
    
    # Send request
    data = json.dumps({"prompt": workflow}).encode('utf-8')
    req = urllib.request.Request(f"{COMFYUI_SERVER}/prompt", data=data)
    req.add_header('Content-Type', 'application/json')
    
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode('utf-8'))
        prompt_id = result["prompt_id"]
        print(f"Prompt queued. ID: {prompt_id}")
    except Exception as e:
        print(f"Failed to queue prompt: {e}")
        sys.exit(1)
        
    # Poll for completion
    is_done = False
    output_filename = None
    poll_attempts = 0
    while not is_done and poll_attempts < 60:
        time.sleep(2)
        poll_attempts += 1
        try:
            history_req = urllib.request.urlopen(f"{COMFYUI_SERVER}/history/{prompt_id}")
            history_data = json.loads(history_req.read().decode('utf-8'))
            if prompt_id in history_data:
                outputs = history_data[prompt_id].get("outputs", {})
                for node_id, out in outputs.items():
                    if "images" in out and len(out["images"]) > 0:
                        output_filename = out["images"][0]["filename"]
                        is_done = True
                        break
        except Exception as e:
            print(f"Polling warning: {e}")
            
    if not is_done or not output_filename:
        print("Timeout waiting for generation.")
        sys.exit(1)
        
    # Download output image
    view_url = f"{COMFYUI_SERVER}/view?filename={urllib.parse.quote(output_filename)}&type=output"
    try:
        img_res = urllib.request.urlopen(view_url)
        img_data = img_res.read()
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'wb') as f:
            f.write(img_data)
        print(f"Saved generated image to {output_path}")
    except Exception as e:
        print(f"Failed to download generated image: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 run_real_inpainting.py <sam_prompt> <controlnet_strength> <output_path> [tile_prompt]")
        sys.exit(1)
        
    sam_prompt = sys.argv[1]
    controlnet_strength = float(sys.argv[2])
    output_path = sys.argv[3]
    tile_prompt = sys.argv[4] if len(sys.argv) > 4 else "red terracotta spanish roof tiles"
    
    # Upload house image
    img_name = upload_image("data/house.jpg")
    
    # Run inpainting
    run_inpainting(img_name, sam_prompt, controlnet_strength, output_path, tile_prompt)
