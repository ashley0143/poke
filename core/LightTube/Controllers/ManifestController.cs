using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using InnerTube;
using InnerTube.Models;
using Microsoft.AspNetCore.Mvc;
using Newtonsoft.Json.Linq;

namespace LightTube.Controllers
{
	[Route("/manifest")]
	public class ManifestController : Controller
	{
		private readonly Youtube _youtube;
		private readonly HttpClient _client = new();

		public ManifestController(Youtube youtube)
		{
			_youtube = youtube;
		}

		[Route("{v}")]
		public async Task<IActionResult> DefaultManifest(string v)
		{
			YoutubePlayer player = await _youtube.GetPlayerAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion());
			if (!string.IsNullOrWhiteSpace(player.ErrorMessage))
				return StatusCode(500, player.ErrorMessage);
			return Redirect(player.IsLive ? $"/manifest/{v}.m3u8" : $"/manifest/{v}.mpd" + Request.QueryString);
		}

		[Route("{v}.mpd")]
		public async Task<IActionResult> DashManifest(string v, string videoCodec = null, string audioCodec = null, bool useProxy = true)
		{
			YoutubePlayer player = await _youtube.GetPlayerAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion());
			string manifest = player.GetMpdManifest(useProxy ? $"https://{Request.Host}/proxy/" : null, videoCodec, audioCodec);
			return File(Encoding.UTF8.GetBytes(manifest), "application/dash+xml");
		}

		[Route("{v}.m3u8")]
		public async Task<IActionResult> HlsManifest(string v, bool useProxy = true)
		{
			YoutubePlayer player = await _youtube.GetPlayerAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion(), true);
			if (!string.IsNullOrWhiteSpace(player.ErrorMessage))
				return StatusCode(403, player.ErrorMessage);
			
			if (player.IsLive)
			{
				string manifest = await player.GetHlsManifest(useProxy ? $"https://{Request.Host}/proxy" : null);
				return File(Encoding.UTF8.GetBytes(manifest), "application/vnd.apple.mpegurl");
			}

			if (useProxy)
				return StatusCode(400, "HLS proxy for non-live videos are not supported at the moment.");
			return Redirect(player.HlsManifestUrl);
		}
	}
}