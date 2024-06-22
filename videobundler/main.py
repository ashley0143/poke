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
	f = open(f"pendingDelete.{job_id}", "a")
	f.write(":3")
	f.close()
	sleep(int(os.getenv("TIME_BEFORE_DELETE")))
	try:
		os.remove(f"done.{job_id}")
		os.remove(f"{job_id}.mp4")
		os.remove(f"{job_id}.m4a")
		os.remove(f"output.{job_id}.mp4")
		os.remove(f"pendingDelete.{job_id}")
	except Exception:
		_ = 0

def inactive_autodelete(job_id: str):
	pwd = os.getcwd()
	sleep(int(os.getenv("INACTIVE_TIME_BEFORE_DELETE")))
	if not os.path.isfile(f"{pwd}/done.{job_id}"):
		return
	try:
		os.remove(f"done.{job_id}")
		os.remove(f"{job_id}.mp4")
		os.remove(f"{job_id}.m4a")
		os.remove(f"output.{job_id}.mp4")
		os.remove(f"pendingDelete.{job_id}")
	except Exception:
		_ = 0

def get_random_string(length):
	# choose from all lowercase letter
	letters = string.ascii_lowercase
	result_str = "".join(random.choice(letters) for i in range(length))
	return result_str

def merge_video(job_id: str, video_id: str, audio_itag: str, video_itag: str):
	pwd = os.getcwd()
	# Download both audio and video
	subprocess.run(["wget", f"-O{job_id}.m4a", f"{os.getenv("PROXY_URL")}/latest_version?id={video_id}&itag={audio_itag}&local=true"], check=True)
	subprocess.run(["wget", f"-O{job_id}.mp4", f"{os.getenv("PROXY_URL")}/latest_version?id={video_id}&itag={video_itag}&local=true"], check=True)
	# Merge both files
	subprocess.run(f"ffmpeg -i {pwd}/{job_id}.m4a -i {pwd}/{job_id}.mp4 -c copy {pwd}/output.{job_id}.mp4", shell=True, check=True)
	f = open(f"done.{job_id}", "a")
	f.write(":3")
	f.close()
	thread = Thread(target=inactive_autodelete, args = (job_id, ))
	thread.start()

@app.route("/")
def ping():
	return json.loads("""
	{
		"success": true
	}
	""")

@app.route("/merge")
def merge():
	job_id = get_random_string(10)
	thread = Thread(target=merge_video, args = (job_id, request.args.get("id"), request.args.get("audio_itag"), request.args.get("video_itag")))
	thread.start()
	return json.loads('{"success":true,"job_id":"' + job_id + '"}')

@app.route("/get")
def get():
	pwd = os.getcwd()
	job_id = request.args.get("job_id")
	if os.path.isfile(f"{pwd}/done.{job_id}"):
		if not os.path.isfile(f"{pwd}/pendingDelete.{job_id}"):
			thread = Thread(target=autodelete, args = (job_id, ))
			thread.start()
		with open(f"output.{job_id}.mp4", "rb") as bytes:
			return send_file(
				io.BytesIO(bytes.read()),
				mimetype="video/mp4",
				download_name=f"output.{job_id}.mp4",
				as_attachment=True
			)
	return json.loads('{"success":false}'), 404

@app.route("/check")
def check():
	pwd = os.getcwd()
	job_id = request.args.get("job_id")
	if os.path.isfile(f"{pwd}/done.{job_id}"):
		return json.loads('{"success":true}')
	return json.loads('{"success":false}'), 404


if __name__ == "__main__":
	from waitress import serve
	serve(app, host="0.0.0.0", port=os.getenv("PORT"))

#with open(f"output.{job_id}.mp4", "rb") as bytes:
		#return send_file(
	  #      io.BytesIO(bytes.read()),
		#    mimetype="video/mp4",
	   #     download_name=f"output.{job_id}.mp4",
	  #      as_attachment=True
	 #   )
#
#
#
#
#
