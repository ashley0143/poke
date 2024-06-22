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
- `/merge?id=VIDEO_ID&audio_itag=AUDIO_ITAG&video_itag=VIDEO_ITAG`: Starts the merging process. ID is the youtube video ID, and itags are self explanatory. As a response, you will get a job ID that you will be able to use in future requests to query the video or its status. When this process is finished, the inactive autodelete counter will start, which will allow you to fetch the video until the countdown is over.
- `/get?id=JOB_ID`: Queries a merged video and sends it to you. If the video is successfully and fully merged you will get a 200 response with a video. However, if it isn't finished, you will get a `success: false` 404 response. If the video indeed exists and is sent to you, the get autodelete counter will start, which will allow you to fetch it until this countdown is over.
- `/check?id=JOB_ID`: Queries a merged video's status. If the video is successfully and fully merged you will get a 200 response with `success:true`. However, if it isn't finished, you will get a `success: false` 404 response. Useful if you want to poll the status without triggering the get autodelete counter.