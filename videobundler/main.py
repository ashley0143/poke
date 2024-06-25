import asyncio
import aiohttp
from aiohttp import web
import string
import os
import random
import subprocess

app = web.Application()
app.router._frozen = False

def get_random_string(length):
	# choose from all lowercase letter
	letters = string.ascii_lowercase
	result_str = "".join(random.choice(letters) for i in range(length))
	return result_str

async def merge(request):
	# register params
	try:
		job_id = request.rel_url.query["id"]
		video_id: str = request.rel_url.query["id"]
		audio_itag: str = request.rel_url.query["audio_itag"]
		video_itag: str = request.rel_url.query["video_itag"]
	except:
		# no one gives a fuck
		_ = 0
	# validate
	if " " in video_id or len(video_id) > 11:
		print(f"Video {video_id} flagged as invalid, dropping request")
		return
	if not audio_itag.isdigit():
		print(f"Audio itag {audio_itag} flagged as invalid, dropping request")
		return
	if not video_itag.isdigit():
		print(f"Video itag {video_itag} flagged as invalid, dropping request")
		return
	if os.path.isfile(f"done.{job_id}"):
		return web.FileResponse(
			path=f"output.{job_id}.mp4"
		)
	proc_audio = await asyncio.create_subprocess_shell(
		f"wget -O{job_id}.m4a \"https://eu-proxy.poketube.fun/latest_version?id={video_id}&itag={audio_itag}&local=true\"",
	)
	proc_video = await asyncio.create_subprocess_shell(
		f"wget -O{job_id}.mp4 \"https://eu-proxy.poketube.fun/latest_version?id={video_id}&itag={video_itag}&local=true\""
	)
	await asyncio.gather(proc_audio.wait(), proc_video.wait())
	proc_ffmpeg = await asyncio.create_subprocess_shell(
		f"ffmpeg -i {job_id}.m4a -i {job_id}.mp4 -c copy output.{job_id}.mp4"
	)
	await proc_ffmpeg.wait()
	f = open(f"done.{job_id}", "a")
	f.write(":3")
	f.close()
	return web.FileResponse(
		path=f"output.{job_id}.mp4"
	)

async def ping(request):
	return web.Response(body='{"success": true}', content_type="application/json")

async def init_app():
	app.router.add_get("/{id:.+}", merge)
	app.router.add_get("/", ping)
	return app

if __name__ == '__main__':
	loop = asyncio.get_event_loop()
	app = loop.run_until_complete(init_app())
	web.run_app(app, port=3030)