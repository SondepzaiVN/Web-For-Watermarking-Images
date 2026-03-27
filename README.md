# Watermark Studio Web

This web app lets you embed and extract watermarks by calling a Hugging Face Space API.

## Live Website

- Website URL: https://sondepzaivn.github.io/Web-For-Watermarking-Images/

## How To Use

### 1. Open the website

- Wait a few seconds on the first load.
- The app connects to the backend API automatically.

### 2. Embed tab

1. Upload a Host image.
2. Select mode:

- `image`: upload a Watermark image.
- `text`: enter watermark text.

3. Set parameters: Alpha, N (ROI), Seed, and affine option.
4. Click `Run Embed`.
5. Download:

- Watermarked image
- Metadata file (`.npz`)

Important: Keep the metadata file. You need it for extraction.

### 3. Extract tab

1. Upload the image to extract from.
2. Upload the matching metadata file (`.npz`) from the Embed step.
3. Click `Run Extract`.
4. Check results:

- Extracted watermark image (image mode)
- Decoded text (text mode)

## Notes

- TIFF files are supported with preview fallback in the browser.
- If the backend Space is sleeping, the first request can be slower.
