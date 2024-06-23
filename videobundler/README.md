# poke-videobundler

Takes 2 input streams, downloads them, and spits out a combined file.

## Installation

1. Make sure `ffmpeg`, `wget`, and Python 3 are all installed.
2. Download the program files to your computer - `main.py` and `.env.example`.
3. Run `python3 -m pip install flask python-dotenv waitress`.

## Configuration

1. Run `mv .env.example .env`, **even if you don't want to configure anything**.
2. Edit and fill in the values if needed.

## Usage

1. `python3 main.py`.
2. If everything went well, you shouldn't see any output at launch.
3. You will now be able to call the server at the configured port.

## Endpoints

- `/`: Will return `{success:true}` if alive.
- `/get_merged_video?id=VIDEO_ID&audio_itag=AUDIO_ITAG&video_itag=VIDEO_ITAG`: Returns a merged video. ID is the youtube video ID, and itags are self explanatory.
