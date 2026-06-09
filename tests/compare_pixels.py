import PIL.Image
import numpy as np

def compare_in_mask(orig_path, gen_path, mask_path):
    print(f"\n--- Comparing {orig_path} and {gen_path} inside mask {mask_path} ---")
    orig = np.array(PIL.Image.open(orig_path).convert('RGB'))
    gen = np.array(PIL.Image.open(gen_path).convert('RGB'))
    mask = np.array(PIL.Image.open(mask_path).convert('L'))
    
    # Mask is true where pixel value > 127
    mask_indices = mask > 127
    mask_count = np.sum(mask_indices)
    
    print(f"Mask size (pixels): {mask_count}")
    
    if mask_count > 0:
        orig_mod_pixels = orig[mask_indices]
        gen_mod_pixels = gen[mask_indices]
        
        print(f"Original pixels in mask - Mean RGB: {orig_mod_pixels.mean(axis=0)}")
        print(f"Generated pixels in mask - Mean RGB: {gen_mod_pixels.mean(axis=0)}")
        
        # Count pixels that are reddish in the generated area
        reddish = (gen_mod_pixels[:, 0].astype(int) - gen_mod_pixels[:, 1].astype(int) > 30) & \
                  (gen_mod_pixels[:, 0].astype(int) - gen_mod_pixels[:, 2].astype(int) > 50)
        reddish_count = np.sum(reddish)
        print(f"Reddish pixels in mask: {reddish_count} ({reddish_count/mask_count*100:.2f}% of mask)")

if __name__ == '__main__':
    mask_file = 'data/sam_mask.png'
    compare_in_mask('data/house.jpg', 'data/output/roof_tile_visualizer_00018_.png', mask_file)
    compare_in_mask('data/house.jpg', 'data/debug_test_3.png', mask_file)
