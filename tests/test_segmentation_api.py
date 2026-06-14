import urllib.request
import json
import random
import os
import sys

# Ensure parent directory is in sys.path so utils can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.config_loader import get_flat_config

# Load configuration values
config = get_flat_config()
COMFYUI_SERVER = config.get("comfyui_server", "http://127.0.0.1:8188")

def ping_server():
    """Checks if the ComfyUI API is running."""
    try:
        response = urllib.request.urlopen(COMFYUI_SERVER)
        if response.getcode() == 200:
            print("OK: ComfyUI API is reachable!")
            return True
    except Exception as e:
        print(f"ERROR: ComfyUI API is NOT reachable: {e}")
        print("Please ensure you have started ComfyUI.")
        return False

def test_segmentation_workflow_validation():
    """Validates that the ComfyUI server accepts the segmentation & inpainting workflow structure."""
    # Build the exact same workflow structure as app/api/generate/route.ts
    workflow = {
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": random.randint(1, 10000000),
                "steps": 1,  # 1 step for validation / fast test
                "cfg": float(config.get("sampler_settings.cfg", 8.0)),
                "sampler_name": config.get("sampler_settings.sampler_name", "euler"),
                "scheduler": config.get("sampler_settings.scheduler", "normal"),
                "denoise": float(config.get("sampler_settings.denoise", 1.0)),
                "model": ["4", 0],
                "positive": ["17", 0],
                "negative": ["17", 1],
                "latent_image": ["8", 0]
            }
        },
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": config.get("sdxl_checkpoint", "sd_xl_base_1.0.safetensors")
            }
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": "terracotta roof tiles",
                "clip": ["4", 1]
            }
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": config.get("prompts.negative_prompt", "text, watermark, ugly, deformed, blurry"),
                "clip": ["4", 1]
            }
        },
        "8": {
            "class_type": "VAEEncodeForInpaint",
            "inputs": {
                "pixels": ["9", 0],
                "vae": ["4", 2],
                "mask": ["14", 0],
                "grow_mask_by": int(config.get("sam_settings.grow_mask_by", 6))
            }
        },
        "9": {
            "class_type": "LoadImage",
            "inputs": {
                "image": "test_house_image.png"  # Placeholder name, will fail to process if file doesn't exist, but validates node schema
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
                "filename_prefix": config.get("local_paths.save_filename_prefix", "roof_tile_visualizer_test"),
                "images": ["10", 0]
            }
        },
        "12": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": config.get("sam_checkpoint", "sam3.1_multiplex_fp16.safetensors")
            }
        },
        "14": {
            "class_type": "SAM3_Detect",
            "inputs": {
                "model": ["12", 0],
                "image": ["9", 0],
                "conditioning": ["18", 0],
                "threshold": float(config.get("sam_settings.threshold", 0.3)),
                "refine_iterations": int(config.get("sam_settings.refine_iterations", 2)),
                "individual_masks": bool(config.get("sam_settings.individual_masks", False))
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
                "control_net_name": config.get("controlnet_checkpoint", "diffusion_pytorch_model.safetensors")
            }
        },
        "16": {
            "class_type": "MiDaS-DepthMapPreprocessor",
            "inputs": {
                "image": ["9", 0],
                "a": float(config.get("midas_settings.a", 6.283185307179586)),
                "bg_threshold": float(config.get("midas_settings.bg_threshold", 0.1)),
                "resolution": int(config.get("midas_settings.resolution", 512))
            }
        },
        "17": {
            "class_type": "ControlNetApplyAdvanced",
            "inputs": {
                "strength": float(config.get("controlnet_settings.strength", 0.45)),
                "start_percent": float(config.get("controlnet_settings.start_percent", 0.0)),
                "end_percent": float(config.get("controlnet_settings.end_percent", 1.0)),
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
    
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read())
        if "prompt_id" in result:
            print(f"SUCCESS: Workflow accepted successfully! Prompt ID: {result['prompt_id']}")
            return True
        else:
            print(f"WARNING: Unexpected response: {result}")
            return False
    except Exception as e:
        # Note: If it fails because of the placeholder image "test_house_image.png", that is expected
        # and proves the node routing and model parameters are registered correctly.
        err_msg = str(e)
        print(f"Server response check (expected if image/models missing): {err_msg}")
        return False

if __name__ == "__main__":
    print("Testing ComfyUI Segmentation Workflow Integration...")
    if ping_server():
        test_segmentation_workflow_validation()
