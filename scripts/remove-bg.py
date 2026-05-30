from PIL import Image
import os

def remove_white_bg(path):
    if not os.path.exists(path):
        print(f"Not found: {path}")
        return
    img = Image.open(path).convert("RGBA")
    data = img.getdata()

    newData = []
    # threshold for white
    for item in data:
        # item is (R, G, B, A)
        # If it's close to white, make it transparent
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            newData.append((255, 255, 255, 0))
        else:
            newData.append(item)

    img.putdata(newData)
    img.save(path, "PNG")
    print(f"Processed: {path}")

logos = [
    "public/logos/ucb-logo.png",
    "public/logos/redotpay-logo.png",
    "public/logos/Nagad-png.png",
    "public/logos/dbbl-rocket-logo.png",
    "public/logos/BKash-Icon-Logo.wine.png"
]

for l in logos:
    remove_white_bg(l)
