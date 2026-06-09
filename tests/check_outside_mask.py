import PIL.Image
import numpy as np
import glob

def check_outside(orig_path, gen_path, mask_path):
    orig = np.array(PIL.Image.open(orig_path).convert('RGB'))
    gen = np.array(PIL.Image.open(gen_path).convert('RGB'))
    mask = np.array(PIL.Image.open(mask_path).convert('L'))
    outside_mask = mask <= 127
    diff = np.abs(orig.astype(int) - gen.astype(int))
    max_diff_outside = diff[outside_mask].max()
    mean_diff_outside = diff[outside_mask].mean()
    print(f"\n--- {gen_path} outside mask ---")
    print('Max pixel channel difference outside mask:', max_diff_outside)
    print('Mean pixel channel difference outside mask:', mean_diff_outside)

check_outside('data/house.jpg', 'data/output/roof_tile_visualizer_00018_.png', 'data/sam_mask.png')
comfy_output_dir = '/home/gh-wsl/comfyui/output/'
paths = sorted(glob.glob(comfy_output_dir + 'roof_model_test_*.png'))
if paths:
    check_outside('data/house.jpg', paths[-1], 'data/sam_mask.png')
