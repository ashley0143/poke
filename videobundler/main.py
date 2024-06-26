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

async def run_command(cmd):
	# Create subprocess
	process = await asyncio.create_subprocess_shell(
		cmd,
		stdout=asyncio.subprocess.PIPE,
	)
	# Wait for the subprocess to finish
	stdout, stderr = await process.communicate()
	# Check for errors
	if process.returncode!= 0:
	# Log or handle the error
		print(f"Command '{args}' failed with return code {process.returncode}")
		return None
	# Decode stdout and return
	return stdout

async def merge(request: aiohttp.web.Request):
	# register params
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
	if "Firefox" in request.headers["User-Agent"]:
		# Sane browser that supports streaming
		
		cmdline = f"ffmpeg -i \"https://eu-proxy.poketube.fun/latest_version?id={video_id}&itag={audio_itag}&local=true\" -i \"https://eu-proxy.poketube.fun/latest_version?id={video_id}&itag={video_itag}&local=true\" -c copy -f mp4 -movflags frag_keyframe+empty_moov -"
		process = await asyncio.create_subprocess_shell(
			cmdline,
			stdout=asyncio.subprocess.PIPE,
			stderr=asyncio.subprocess.PIPE
		)
		response = web.StreamResponse(status=206, reason='OK', headers={
			'Content-Type': 'application/octet-stream',
			'Transfer-Encoding': 'chunked',
			'Content-Disposition': 'inline'
		})
		await response.prepare(request)
		try:
			while True:
				chunk = await process.stdout.readline()
				if not chunk:
					break
				await response.write(chunk)
		except Exception as e:
			
			print(f"Error streaming FFmpeg output: {e}")
		#finally:
			#await response.write_eof()
	else:
		# Likely to be chromium browser, so to avoid browser shitting itself we download file
		job_id = f'{request.rel_url.query["id"]}_{request.rel_url.query["audio_itag"]}_{request.rel_url.query["video_itag"]}'
		if os.path.isfile(f"{job_id}.mp4"):
			return web.FileResponse(
				path=f"{job_id}.mp4"
			)
		cmdline = f"ffmpeg -i \"https://eu-proxy.poketube.fun/latest_version?id={video_id}&itag={audio_itag}&local=true\" -i \"https://eu-proxy.poketube.fun/latest_version?id={video_id}&itag={video_itag}&local=true\" -c:v copy -f mp4 -movflags frag_keyframe+empty_moov {job_id}.mp4"
		process = await asyncio.create_subprocess_shell(
			cmdline
		)
		await process.wait()
		if process.returncode != 0:                                                                                # Log or handle the error
			return None
		response = FileResponse(path=f"{job_id}.mp4")
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
