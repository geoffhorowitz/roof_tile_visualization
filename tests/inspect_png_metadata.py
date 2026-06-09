import sys
from PIL import Image
import json

def inspect_png(image_path):
    print(f"\n=================== {image_path} ===================")
    try:
        with Image.open(image_path) as img:
            info = img.info
            for key, val in info.items():
                if key in ['prompt']:
                    try:
                        data = json.loads(val)
                        print(json.dumps(data, indent=2))
                    except Exception as e:
                        print(f"Error parsing json for {key}: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    inspect_png('data/output/roof_tile_visualizer_00018_.png')
    inspect_png('data/debug_denoise_1_0.png')
    inspect_png('data/debug_test_1.png')
