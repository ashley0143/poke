import asyncio
import aiohttp
from aiohttp import web
import string
import os
import random
import subprocess
from aiohttp.web import Response, FileResponse

app = web.Application()
app.router._frozen = False

def get_random_string(length):
	# choose from all lowercase letter
	letters = string.ascii_lowercase
	result_str = "".join(random.choice(letters) for i in range(length))
	return result_str

async def merge(request):
	# register params
	job_id = request.rel_url.query["id"]
	video_id: str = request.rel_url.query["id"]
	audio_itag: str = request.rel_url.query["audio_itag"]
	video_itag: str = request.rel_url.query["video_itag"]
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
	if os.path.isfile(f"{job_id}.mp4"):
		return web.FileResponse(
			path=f"{job_id}.mp4"
		)
	cmdline = f"ffmpeg -i \"https://eu-proxy.poketube.fun/latest_version?id={video_id}&itag={audio_itag}&local=true\" -i \"https://eu-proxy.poketube.fun/latest_version?id={video_id}&itag={video_itag}&local=true\" -c copy -f mp4 -movflags frag_keyframe+empty_moov {video_id}.mp4"
	proc_ffmpeg = await asyncio.create_subprocess_shell(
		cmdline,
		stdout=asyncio.subprocess.PIPE,
		stderr=asyncio.subprocess.PIPE
	)
	print(f"ffmpeg -i \"https://eu-proxy.poketube.fun/latest_version?id={video_id}&itag={audio_itag}&local=true\" -i \"https://eu-proxy.poketube.fun/latest_version?id={video_id}&itag={video_itag}&local=true\" -c copy -f mp4 -movflags frag_keyframe+empty_moov -")
	stdout, stderr = await proc_ffmpeg.communicate()
	response = FileResponse(f"{video_id}.mp4")
	return response

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