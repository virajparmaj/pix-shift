<p align="center">
  <img src="public/icons/pix-shift.png" alt="PixShift logo" width="140" />
</p>

<h1 align="center">PixShift</h1>

<p align="center">
  Automatically converts Google Photos HEIC downloads to PNG or JPEG.
</p>

## What PixShift Does

PixShift is a Chrome extension that watches your Google Photos downloads and converts HEIC/HEIF files into a format you choose.

- Converts single HEIC downloads to `PNG` or `JPEG`
- Converts HEIC files inside downloaded ZIP archives
- Keeps non-HEIC files in ZIPs untouched
- Renames converted files with the correct `.png` or `.jpg` extension
- Lets you toggle conversion on/off from the popup
- Tracks how many files have been converted

## How It Works

1. You download from Google Photos.
2. PixShift detects HEIC/HEIF content.
3. It converts files in an offscreen worker using `heic-to`.
4. It downloads the converted result automatically.
