import urllib.request
import urllib.parse
import json
import random
import time
import os
import sys
import PIL.Image
import numpy as np

COMFYUI_SERVER = "http://127.0.0.1:8188"

def upload_image(image_path):
    with open(image_path, 'rb') as f:
        file_content = f.read()
    boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
    headers = {'Content-Type': f'multipart/form-data; boundary={boundary}'}
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
    response = urllib.request.urlopen(req)
    res_data = json.loads(response.read().decode('utf-8'))
    return res_data['name']

def run_inpainting(uploaded_filename, seed, controlnet_strength, tile_prompt):
    workflow = {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
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
                "filename_prefix": "roof_seed_test",
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
                "text": "roof:10",
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
    
    data = json.dumps({"prompt": workflow}).encode('utf-8')
    req = urllib.request.Request(f"{COMFYUI_SERVER}/prompt", data=data)
    req.add_header('Content-Type', 'application/json')
    response = urllib.request.urlopen(req)
    result = json.loads(response.read().decode('utf-8'))
    prompt_id = result["prompt_id"]
    
    is_done = False
    output_filename = None
    while not is_done:
        time.sleep(2)
        history_req = urllib.request.urlopen(f"{COMFYUI_SERVER}/history/{prompt_id}")
        history_data = json.loads(history_req.read().decode('utf-8'))
        if prompt_id in history_data:
            outputs = history_data[prompt_id].get("outputs", {})
            for node_id, out in outputs.items():
                if "images" in out and len(out["images"]) > 0:
                    output_filename = out["images"][0]["filename"]
                    is_done = True
                    break
                    
    view_url = f"{COMFYUI_SERVER}/view?filename={urllib.parse.quote(output_filename)}&type=output"
    img_res = urllib.request.urlopen(view_url)
    return img_res.read()

def analyze_redness(img_data):
    # Load image from bytes
    import io
    img = PIL.Image.open(io.BytesIO(img_data)).convert('RGB')
    orig = PIL.Image.open("data/house.jpg").convert('RGB')
    
    img_arr = np.array(img)
    orig_arr = np.array(orig)
    
    diff = np.abs(orig_arr.astype(int) - img_arr.astype(int))
    mask = np.any(diff > 10, axis=-1)
    
    if mask.sum() > 0:
        mod = img_arr[mask]
        reddish = (mod[:, 0].astype(int) - mod[:, 1].astype(int) > 30) & (mod[:, 0].astype(int) - mod[:, 2].astype(int) > 50)
        return mask.sum(), mod.mean(axis=0), reddish.mean() * 100
    return 0, np.zeros(3), 0.0

if __name__ == '__main__':
    img_name = upload_image("data/house.jpg")
    seeds = [3035939, 4474664, 993015, 12345]
    for seed in seeds:
        print(f"\n--- Testing seed {seed} ---")
        try:
            img_bytes = run_inpainting(img_name, seed, 0.45, "red terracotta spanish roof tiles")
            mod_pixels, mean_rgb, red_pct = analyze_redness(img_bytes)
            print(f"Seed: {seed} | Modified: {mod_pixels} | Mean RGB: {mean_rgb} | Reddish%: {red_pct:.2f}%")
        except Exception as e:
            print(f"Failed for seed {seed}: {e}")
