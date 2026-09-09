"""Check an actual GPU CoC capture, rather than a CPU copy of the shader math.

Requires Pillow. With the dev server running, capture Adrift at its fixed pose:
  /?shot=adrift&still&dof-mask&capture=dof-mask
Then run: python3 tests/verify-dof-render.py renders/dof-mask.png
Repeat with &gfx=webgl2 to cover the other shader backend.
"""
import sys
from PIL import Image

for path in sys.argv[1:]:
    image = Image.open(path).convert("RGB")
    width, height = image.size
    # Clear water left of the buoy. The compose debug view gamma-encodes CoC.
    profile = [
        (image.getpixel((round(width * 0.15), y))[0] / 255) ** 2.2
        for y in range(round(height * 0.4), round(height * 0.54))
    ]
    transition = sum(0.1 < coc < 0.9 for coc in profile) / height
    assert transition > 0.09, (
        f"{path}: far blur is compressed into {transition:.1%} of the image height"
    )
    assert all(b <= a + 0.015 for a, b in zip(profile, profile[1:])), (
        f"{path}: open-water focus has a discontinuity"
    )
    focused = image.getpixel((round(width * 0.5), round(height * 0.56)))
    assert max(focused) <= 3, f"{path}: the buoy's focus plane should stay sharp"
    print(f"{path}: smooth far-focus transition ({transition:.1%}), subject in focus")

if len(sys.argv) < 2:
    raise SystemExit("Pass an Adrift dof-mask PNG capture to verify.")
