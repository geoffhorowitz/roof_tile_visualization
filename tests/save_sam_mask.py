import urllib.request
import urllib.parse
import json
import time
import os
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

def save_mask(uploaded_filename):
    workflow = {
        "9": {
            "class_type": "LoadImage",
            "inputs": {
                "image": uploaded_filename
            }
        },
        "12": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": "sam3.1_multiplex_fp16.safetensors"
            }
        },
        "18": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": "roof:10",
                "clip": ["12", 1]
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
        "20": {
            "class_type": "MaskToImage",
            "inputs": {
                "mask": ["14", 0]
            }
        },
        "21": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "sam_mask_debug",
                "images": ["20", 0]
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

if __name__ == '__main__':
    img_name = upload_image("data/house.jpg")
    print("Queueing SAM mask detection...")
    img_bytes = save_mask(img_name)
    
    # Save the mask locally
    with open("data/sam_mask.png", "wb") as f:
        f.write(img_bytes)
    print("Saved SAM mask to data/sam_mask.png")
    
    # Analyze mask
    img = PIL.Image.open("data/sam_mask.png").convert('L')
    arr = np.array(img)
    white_pixels = np.sum(arr > 127)
    total_pixels = arr.size
    print(f"Mask white pixels: {white_pixels} ({white_pixels/total_pixels*100:.2f}%)")
