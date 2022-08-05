using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using InnerTube;
using InnerTube.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace LightTube.Controllers
{
	[Route("/proxy")]
	public class ProxyController : Controller
	{
		private readonly ILogger<YoutubeController> _logger;
		private readonly Youtube _youtube;
		private string[] BlockedHeaders =
		{
			"host",
			"cookies"
		};

		public ProxyController(ILogger<YoutubeController> logger, Youtube youtube)
		{
			_logger = logger;
			_youtube = youtube;
		}

		[Route("media/{videoId}/{formatId}")]
		public async Task Media(string videoId, string formatId)
		{
			try
			{
				YoutubePlayer player = await _youtube.GetPlayerAsync(videoId);
				if (!string.IsNullOrWhiteSpace(player.ErrorMessage))
				{
					Response.StatusCode = (int) HttpStatusCode.InternalServerError;
					await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(player.ErrorMessage));
					await Response.StartAsync();
					return;
				}

				List<Format> formats = new();

				formats.AddRange(player.Formats);
				formats.AddRange(player.AdaptiveFormats);

				if (!formats.Any(x => x.FormatId == formatId))
				{
					Response.StatusCode = (int) HttpStatusCode.NotFound;
					await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(
						$"Format with ID {formatId} not found.\nAvailable IDs are: {string.Join(", ", formats.Select(x => x.FormatId.ToString()))}"));
					await Response.StartAsync();
					return;
				}

				string url = formats.First(x => x.FormatId == formatId).Url;

				if (!url.StartsWith("http://") && !url.StartsWith("https://"))
					url = "https://" + url;

				HttpWebRequest request = (HttpWebRequest) WebRequest.Create(url);
				request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;
				request.Method = Request.Method;

				foreach ((string header, StringValues values) in HttpContext.Request.Headers.Where(header =>
					!header.Key.StartsWith(":") && !BlockedHeaders.Contains(header.Key.ToLower())))
				foreach (string value in values)
					request.Headers.Add(header, value);

				HttpWebResponse response;

				try
				{
					response = (HttpWebResponse) request.GetResponse();
				}
				catch (WebException e)
				{
					response = e.Response as HttpWebResponse;
				}

				if (response == null)
					await Response.StartAsync();

				foreach (string header in response.Headers.AllKeys)
					if (Response.Headers.ContainsKey(header))
						Response.Headers[header] = response.Headers.Get(header);
					else
						Response.Headers.Add(header, response.Headers.Get(header));
				Response.StatusCode = (int) response.StatusCode;

				await using Stream stream = response.GetResponseStream();
				try
				{
					await stream.CopyToAsync(Response.Body, HttpContext.RequestAborted);
				}
				catch (Exception)
				{
					// an exception is thrown if the client suddenly stops streaming
				}

				await Response.StartAsync();
			}
			catch (Exception e)
			{
				Response.StatusCode = (int) HttpStatusCode.InternalServerError;
				await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(e.ToString()));
				await Response.StartAsync();
			}
		}

		[Route("download/{videoId}/{formatId}/{filename}")]
		public async Task Download(string videoId, string formatId, string filename)
		{
			try
			{
				YoutubePlayer player = await _youtube.GetPlayerAsync(videoId);
				if (!string.IsNullOrWhiteSpace(player.ErrorMessage))
				{
					Response.StatusCode = (int) HttpStatusCode.InternalServerError;
					await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(player.ErrorMessage));
					await Response.StartAsync();
					return;
				}

				List<Format> formats = new();

				formats.AddRange(player.Formats);
				formats.AddRange(player.AdaptiveFormats);

				if (!formats.Any(x => x.FormatId == formatId))
				{
					Response.StatusCode = (int) HttpStatusCode.NotFound;
					await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(
						$"Format with ID {formatId} not found.\nAvailable IDs are: {string.Join(", ", formats.Select(x => x.FormatId.ToString()))}"));
					await Response.StartAsync();
					return;
				}

				string url = formats.First(x => x.FormatId == formatId).Url;

				if (!url.StartsWith("http://") && !url.StartsWith("https://"))
					url = "https://" + url;

				HttpWebRequest request = (HttpWebRequest) WebRequest.Create(url);
				request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;
				request.Method = Request.Method;

				foreach ((string header, StringValues values) in HttpContext.Request.Headers.Where(header =>
					!header.Key.StartsWith(":") && !BlockedHeaders.Contains(header.Key.ToLower())))
				foreach (string value in values)
					request.Headers.Add(header, value);

				HttpWebResponse response;

				try
				{
					response = (HttpWebResponse) request.GetResponse();
				}
				catch (WebException e)
				{
					response = e.Response as HttpWebResponse;
				}

				if (response == null)
					await Response.StartAsync();

				foreach (string header in response.Headers.AllKeys)
					if (Response.Headers.ContainsKey(header))
						Response.Headers[header] = response.Headers.Get(header);
					else
						Response.Headers.Add(header, response.Headers.Get(header));
				Response.Headers.Add("Content-Disposition", $"attachment; filename=\"{Regex.Replace(filename, @"[^\u0000-\u007F]+", string.Empty)}\"");
				Response.StatusCode = (int) response.StatusCode;

				await using Stream stream = response.GetResponseStream();
				try
				{
					await stream.CopyToAsync(Response.Body, HttpContext.RequestAborted);
				}
				catch (Exception)
				{
					// an exception is thrown if the client suddenly stops streaming
				}

				await Response.StartAsync();
			}
			catch (Exception e)
			{
				Response.StatusCode = (int) HttpStatusCode.InternalServerError;
				await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(e.ToString()));
				await Response.StartAsync();
			}
		}

		[Route("caption/{videoId}/{language}")]
		public async Task<FileStreamResult> SubtitleProxy(string videoId, string language)
		{
			YoutubePlayer player = await _youtube.GetPlayerAsync(videoId);
			if (!string.IsNullOrWhiteSpace(player.ErrorMessage))
			{
				Response.StatusCode = (int) HttpStatusCode.InternalServerError;
				return File(new MemoryStream(Encoding.UTF8.GetBytes(player.ErrorMessage)),
					"text/plain");
			}

			string url = null;
			Subtitle? subtitle = player.Subtitles.FirstOrDefault(x => string.Equals(x.Language, language, StringComparison.InvariantCultureIgnoreCase));
			if (subtitle is null)
			{
				Response.StatusCode = (int) HttpStatusCode.NotFound;
				return File(
					new MemoryStream(Encoding.UTF8.GetBytes(
						$"There are no available subtitles for {language}. Available language codes are: {string.Join(", ", player.Subtitles.Select(x => $"\"{x.Language}\""))}")),
					"text/plain");
			}
			url = subtitle.Url.Replace("fmt=srv3", "fmt=vtt");
			
			if (!url.StartsWith("http://") && !url.StartsWith("https://"))
				url = "https://" + url;

			HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
			request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;

			foreach ((string header, StringValues values) in HttpContext.Request.Headers.Where(header =>
				!header.Key.StartsWith(":") && !BlockedHeaders.Contains(header.Key.ToLower())))
				foreach (string value in values)
					request.Headers.Add(header, value);

			using HttpWebResponse response = (HttpWebResponse)request.GetResponse();

			await using Stream stream = response.GetResponseStream();
			using StreamReader reader = new(stream);

			return File(new MemoryStream(Encoding.UTF8.GetBytes(await reader.ReadToEndAsync())),
				"text/vtt");
		}

		[Route("image")]
		[Obsolete("Use /proxy/thumbnail instead")]
		public async Task ImageProxy(string url)
		{
			if (!url.StartsWith("http://") && !url.StartsWith("https://"))
				url = "https://" + url;

			HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
			request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;

			foreach ((string header, StringValues values) in HttpContext.Request.Headers.Where(header =>
				!header.Key.StartsWith(":") && !BlockedHeaders.Contains(header.Key.ToLower())))
				foreach (string value in values)
					request.Headers.Add(header, value);

			using HttpWebResponse response = (HttpWebResponse)request.GetResponse();

			foreach (string header in response.Headers.AllKeys)
				if (Response.Headers.ContainsKey(header))
					Response.Headers[header] = response.Headers.Get(header);
				else
					Response.Headers.Add(header, response.Headers.Get(header));
			Response.StatusCode = (int)response.StatusCode;

			await using Stream stream = response.GetResponseStream();
			await stream.CopyToAsync(Response.Body);
			await Response.StartAsync();
		}

		[Route("thumbnail/{videoId}/{index:int}")]
		public async Task ThumbnailProxy(string videoId, int index = 0)
		{
			YoutubePlayer player = await _youtube.GetPlayerAsync(videoId);
			if (index == -1) index = player.Thumbnails.Length - 1;
			if (index >= player.Thumbnails.Length)
			{
				Response.StatusCode = 404;
				await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(
					$"Cannot find thumbnail #{index} for {videoId}. The maximum quality is {player.Thumbnails.Length - 1}"));
				await Response.StartAsync();
				return;
			}

			string url = player.Thumbnails.FirstOrDefault()?.Url;
			
			if (!url.StartsWith("http://") && !url.StartsWith("https://"))
				url = "https://" + url;

			HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
			request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;

			foreach ((string header, StringValues values) in HttpContext.Request.Headers.Where(header =>
				!header.Key.StartsWith(":") && !BlockedHeaders.Contains(header.Key.ToLower())))
				foreach (string value in values)
					request.Headers.Add(header, value);

			using HttpWebResponse response = (HttpWebResponse)request.GetResponse();

			foreach (string header in response.Headers.AllKeys)
				if (Response.Headers.ContainsKey(header))
					Response.Headers[header] = response.Headers.Get(header);
				else
					Response.Headers.Add(header, response.Headers.Get(header));
			Response.StatusCode = (int)response.StatusCode;

			await using Stream stream = response.GetResponseStream();
			await stream.CopyToAsync(Response.Body);
			await Response.StartAsync();
		}

		[Route("storyboard/{videoId}")]
		public async Task StoryboardProxy(string videoId)
		{
			try
			{
				YoutubePlayer player = await _youtube.GetPlayerAsync(videoId);
				if (!string.IsNullOrWhiteSpace(player.ErrorMessage))
				{
					Response.StatusCode = (int) HttpStatusCode.InternalServerError;
					await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(player.ErrorMessage));
					await Response.StartAsync();
					return;
				}

				if (!player.Storyboards.Any())
				{
					Response.StatusCode = (int) HttpStatusCode.NotFound;
					await Response.Body.WriteAsync(Encoding.UTF8.GetBytes("No usable storyboard found."));
					await Response.StartAsync();
					return;
				}

				string url = player.Storyboards.First();

				HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
				request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;

				foreach ((string header, StringValues values) in HttpContext.Request.Headers.Where(header =>
					!header.Key.StartsWith(":") && !BlockedHeaders.Contains(header.Key.ToLower())))
					foreach (string value in values)
						request.Headers.Add(header, value);

				using HttpWebResponse response = (HttpWebResponse)request.GetResponse();

				foreach (string header in response.Headers.AllKeys)
					if (Response.Headers.ContainsKey(header))
						Response.Headers[header] = response.Headers.Get(header);
					else
						Response.Headers.Add(header, response.Headers.Get(header));
				Response.StatusCode = (int)response.StatusCode;

				await using Stream stream = response.GetResponseStream();
				await stream.CopyToAsync(Response.Body);
				await Response.StartAsync();
			}
			catch (Exception e)
			{
				Response.StatusCode = (int) HttpStatusCode.InternalServerError;
				await Response.Body.WriteAsync(Encoding.UTF8.GetBytes(e.ToString()));
				await Response.StartAsync();
			}
		}

		[Route("hls")]
		public async Task<IActionResult> HlsProxy(string url)
		{
			if (!url.StartsWith("http://") && !url.StartsWith("https://"))
				url = "https://" + url;

			HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
			request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;

			foreach ((string header, StringValues values) in HttpContext.Request.Headers.Where(header =>
				!header.Key.StartsWith(":") && !BlockedHeaders.Contains(header.Key.ToLower())))
				foreach (string value in values)
					request.Headers.Add(header, value);

			using HttpWebResponse response = (HttpWebResponse)request.GetResponse();

			await using Stream stream = response.GetResponseStream();
			using StreamReader reader = new(stream);
			string manifest = await reader.ReadToEndAsync();
			StringBuilder proxyManifest = new ();
			
			foreach (string s in manifest.Split("\n"))
			{
				// also check if proxy enabled
				proxyManifest.AppendLine(!s.StartsWith("http")
					? s
					: $"https://{Request.Host}/proxy/video?url={HttpUtility.UrlEncode(s)}");
			}

			return File(new MemoryStream(Encoding.UTF8.GetBytes(proxyManifest.ToString())),
				"application/vnd.apple.mpegurl");
		}

		[Route("manifest/{videoId}")]
		public async Task<IActionResult> ManifestProxy(string videoId, string formatId, bool useProxy = true)
		{
			YoutubePlayer player = await _youtube.GetPlayerAsync(videoId, iOS: true);
			if (!string.IsNullOrWhiteSpace(player.ErrorMessage))
			{
				Response.StatusCode = (int) HttpStatusCode.InternalServerError;
				return File(new MemoryStream(Encoding.UTF8.GetBytes(player.ErrorMessage)),
					"text/plain");
			}

			if (player.HlsManifestUrl == null)
			{
				Response.StatusCode = (int) HttpStatusCode.NotFound;
				return File(new MemoryStream(Encoding.UTF8.GetBytes("This video does not have an HLS manifest URL")),
					"text/plain");
			}

			string url = player.HlsManifestUrl;
			
			if (!url.StartsWith("http://") && !url.StartsWith("https://"))
				url = "https://" + url;

			HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
			request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;

			foreach ((string header, StringValues values) in HttpContext.Request.Headers.Where(header =>
				!header.Key.StartsWith(":") && !BlockedHeaders.Contains(header.Key.ToLower())))
				foreach (string value in values)
					request.Headers.Add(header, value);

			using HttpWebResponse response = (HttpWebResponse)request.GetResponse();

			await using Stream stream = response.GetResponseStream();
			using StreamReader reader = new(stream);
			string manifest = await reader.ReadToEndAsync();
			StringBuilder proxyManifest = new ();

			if (useProxy)
				foreach (string s in manifest.Split("\n"))
				{
					// also check if proxy enabled
					proxyManifest.AppendLine(!s.StartsWith("http")
						? s
						: $"https://{Request.Host}/proxy/ytmanifest?path=" + HttpUtility.UrlEncode(s[46..]));
				}
			else
				proxyManifest.Append(manifest);

			return File(new MemoryStream(Encoding.UTF8.GetBytes(proxyManifest.ToString())),
				"application/vnd.apple.mpegurl");
		}

		[Route("ytmanifest")]
		public async Task<IActionResult> YoutubeManifestProxy(string path)
		{
			string url = "https://manifest.googlevideo.com" + path;
			StringBuilder sb = new();

			if (!url.StartsWith("http://") && !url.StartsWith("https://"))
				url = "https://" + url;

			HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
			request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;

			foreach ((string header, StringValues values) in HttpContext.Request.Headers.Where(header =>
				!header.Key.StartsWith(":") && !BlockedHeaders.Contains(header.Key.ToLower())))
				foreach (string value in values)
					request.Headers.Add(header, value);

			using HttpWebResponse response = (HttpWebResponse)request.GetResponse();

			await using Stream stream = response.GetResponseStream();
			using StreamReader reader = new(stream);
			string manifest = await reader.ReadToEndAsync();

			foreach (string line in manifest.Split("\n"))
			{
				if (string.IsNullOrWhiteSpace(line)) 
					sb.AppendLine();
				else if (line.StartsWith("#"))
					sb.AppendLine(line);
				else
				{
					Uri u = new(line);
					sb.AppendLine($"https://{Request.Host}/proxy/videoplayback?host={u.Host}&path={HttpUtility.UrlEncode(u.PathAndQuery)}");
				}
			}

			return File(new MemoryStream(Encoding.UTF8.GetBytes(sb.ToString())),
				"application/vnd.apple.mpegurl");
		}

		[Route("videoplayback")]
		public async Task VideoPlaybackProxy(string path, string host)
		{
			// make sure this is only used in livestreams

			string url = $"https://{host}{path}";
			HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
			request.AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate;

			foreach ((string header, StringValues values) in HttpContext.Request.Headers.Where(header =>
				!header.Key.StartsWith(":") && !BlockedHeaders.Contains(header.Key.ToLower())))
				foreach (string value in values)
					request.Headers.Add(header, value);

			using HttpWebResponse response = (HttpWebResponse)request.GetResponse();

			await using Stream stream = response.GetResponseStream();

			Response.ContentType = "application/octet-stream";
			await Response.StartAsync();
			await stream.CopyToAsync(Response.Body, HttpContext.RequestAborted);
		}
	}
}