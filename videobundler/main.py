from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, Response, send_file
from threading import Thread
from time import sleep

import io
import json
import os
import random
import string
import subprocess
import uuid

load_dotenv()

app = Flask(__name__)

def autodelete(job_id: str):
    sleep(os.getenv("TIME_BEFORE_DELETE"))
    os.remove(f"{job_id}.mp4")
    os.remove(f"{job_id}.m4a")
    os.remove(f"output.{job_id}.mp4")

def get_random_string(length):
    # choose from all lowercase letter
    letters = string.ascii_lowercase
    result_str = "".join(random.choice(letters) for i in range(length))
    return result_str

@app.route("/")
def ping():
    return json.loads("""
    {
        "success": true
    }
    """)

@app.route("/get_merged_video")
def get_merged_video():
    pwd = os.getcwd()
    video_id = request.args.get("id")
    job_id = get_random_string(10)
    audio_itag = request.args.get("audio_itag")
    video_itag = request.args.get("video_itag")
    # Download both audio and video
    subprocess.run(["wget", f"-O{job_id}.m4a", f"{os.getenv("PROXY_URL")}/latest_version?id={video_id}&itag={audio_itag}&local=true"], check=True)
    subprocess.run(["wget", f"-O{job_id}.mp4", f"{os.getenv("PROXY_URL")}/latest_version?id={video_id}&itag={video_itag}&local=true"], check=True)
    # Merge both files
    subprocess.run(f"ffmpeg -i {pwd}/{job_id}.m4a -i {pwd}/{job_id}.mp4 -c copy {pwd}/output.{job_id}.mp4", shell=True, check=True)
    thread = Thread(target=autodelete, args = (job_id, ))
    thread.start()
    with open(f"output.{job_id}.mp4", "rb") as bytes:
        return send_file(
            io.BytesIO(bytes.read()),
            mimetype="video/mp4",
            download_name=f"output.{job_id}.mp4",
            as_attachment=True
        )


if __name__ == "__main__":
    from waitress import serve
    serve(app, host="0.0.0.0", port=os.getenv("PORT"))