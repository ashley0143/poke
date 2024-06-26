# poke-videobundler

Takes 2 input streams, downloads them, and spits out a combined file.

## Installation

1. Make sure `ffmpeg` and Python 3 are all installed.
2. Download the program files to your computer - `main.py` and `.env.example`.
3. Run `python3 -m pip install aiohttp`.

## Usage

1. `python3 main.py`.
2. If everything went well, you shouldn't see any output at launch.
3. You will now be able to call the server at :3030.

## Endpoints

- `/`: Will return `{success:true}` if alive.
- `/[ANYTHING]?id=VIDEO_ID&audio_itag=AUDIO_ITAG&video_itag=VIDEO_ITAG`: Starts the merging process. ID is the youtube video ID, and itags are self explanatory. As a response, you will get a job ID that you will be able to use in future requests to query the video or its status. When this process is finished, the inactive autodelete counter will start, which will allow you to fetch the video until the countdown is over.
> Replace `[ANYTHING]` with absolutely anything, however it has to be unique to the request. Preferably use an UUID
