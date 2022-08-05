using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Xml;
using InnerTube;
using InnerTube.Models;
using Microsoft.AspNetCore.Mvc;

namespace LightTube.Controllers
{
	[Route("/api")]
	public class ApiController : Controller
	{
		private const string VideoIdRegex = @"[a-zA-Z0-9_-]{11}";
		private const string ChannelIdRegex = @"[a-zA-Z0-9_-]{24}";
		private const string PlaylistIdRegex = @"[a-zA-Z0-9_-]{34}";
		private readonly Youtube _youtube;

		public ApiController(Youtube youtube)
		{
			_youtube = youtube;
		}

		private IActionResult Xml(XmlNode xmlDocument)
		{
			MemoryStream ms = new();
			ms.Write(Encoding.UTF8.GetBytes(xmlDocument.OuterXml));
			ms.Position = 0;
			HttpContext.Response.Headers.Add("Access-Control-Allow-Origin", "*");
			return File(ms, "application/xml");
		}

		[Route("player")]
		public async Task<IActionResult> GetPlayerInfo(string v)
		{
			if (v is null)
				return GetErrorVideoPlayer("", "Missing YouTube ID (query parameter `v`)");
		
			Regex regex = new(VideoIdRegex);
			if (!regex.IsMatch(v) || v.Length != 11)
				return GetErrorVideoPlayer(v, "Invalid YouTube ID " + v);

			try
			{
				YoutubePlayer player =
					await _youtube.GetPlayerAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion());
				XmlDocument xml = player.GetXmlDocument();
				return Xml(xml);
			}
			catch (Exception e)
			{
				return GetErrorVideoPlayer(v, e.Message);
			}
		}

		private IActionResult GetErrorVideoPlayer(string videoId, string message)
		{
			YoutubePlayer player = new()
			{
				Id = videoId,
				Title = "",
				Description = "",
				Tags = Array.Empty<string>(),
				Channel = new Channel
				{
					Name = "",
					Id = "",
					Avatars = Array.Empty<Thumbnail>()
				},
				Duration = 0,
				Chapters = Array.Empty<Chapter>(),
				Thumbnails = Array.Empty<Thumbnail>(),
				Formats = Array.Empty<Format>(),
				AdaptiveFormats = Array.Empty<Format>(),
				Subtitles = Array.Empty<Subtitle>(),
				Storyboards = Array.Empty<string>(),
				ExpiresInSeconds = "0",
				ErrorMessage = message
			};
			return Xml(player.GetXmlDocument());
		}

		[Route("video")]
		public async Task<IActionResult> GetVideoInfo(string v)
		{
			if (v is null)
				return GetErrorVideoPlayer("", "Missing YouTube ID (query parameter `v`)");
		
			Regex regex = new(VideoIdRegex);
			if (!regex.IsMatch(v) || v.Length != 11)
			{
				XmlDocument doc = new();
				XmlElement item = doc.CreateElement("Error");

				item.InnerText = "Invalid YouTube ID " + v;

				doc.AppendChild(item);
				return Xml(doc);
			}

			YoutubeVideo player = await _youtube.GetVideoAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion());
			XmlDocument xml = player.GetXmlDocument();
			return Xml(xml);
		}

		[Route("search")]
		public async Task<IActionResult> Search(string query, string continuation = null)
		{
			if (string.IsNullOrWhiteSpace(query) && string.IsNullOrWhiteSpace(continuation))
			{
				XmlDocument doc = new();
				XmlElement item = doc.CreateElement("Error");

				item.InnerText = "Invalid query " + query;

				doc.AppendChild(item);
				return Xml(doc);
			}

			YoutubeSearchResults player = await _youtube.SearchAsync(query, continuation, HttpContext.GetLanguage(),
				HttpContext.GetRegion());
			XmlDocument xml = player.GetXmlDocument();
			return Xml(xml);
		}

		[Route("playlist")]
		public async Task<IActionResult> Playlist(string id, string continuation = null)
		{
			Regex regex = new(PlaylistIdRegex);
			if (!regex.IsMatch(id) || id.Length != 34) return GetErrorVideoPlayer(id, "Invalid playlist ID " + id);


			if (string.IsNullOrWhiteSpace(id) && string.IsNullOrWhiteSpace(continuation))
			{
				XmlDocument doc = new();
				XmlElement item = doc.CreateElement("Error");

				item.InnerText = "Invalid ID " + id;

				doc.AppendChild(item);
				return Xml(doc);
			}

			YoutubePlaylist player = await _youtube.GetPlaylistAsync(id, continuation, HttpContext.GetLanguage(),
				HttpContext.GetRegion());
			XmlDocument xml = player.GetXmlDocument();
			return Xml(xml);
		}

		[Route("channel")]
		public async Task<IActionResult> Channel(string id, ChannelTabs tab = ChannelTabs.Home,
			string continuation = null)
		{
			Regex regex = new(ChannelIdRegex);
			if (!regex.IsMatch(id) || id.Length != 24) return GetErrorVideoPlayer(id, "Invalid channel ID " + id);

			if (string.IsNullOrWhiteSpace(id) && string.IsNullOrWhiteSpace(continuation))
			{
				XmlDocument doc = new();
				XmlElement item = doc.CreateElement("Error");

				item.InnerText = "Invalid ID " + id;

				doc.AppendChild(item);
				return Xml(doc);
			}

			YoutubeChannel player = await _youtube.GetChannelAsync(id, tab, continuation, HttpContext.GetLanguage(),
				HttpContext.GetRegion());
			XmlDocument xml = player.GetXmlDocument();
			return Xml(xml);
		}

		[Route("trending")]
		public async Task<IActionResult> Trending(string id, string continuation = null)
		{
			YoutubeTrends player = await _youtube.GetExploreAsync(id, continuation,
				HttpContext.GetLanguage(),
				HttpContext.GetRegion());
			XmlDocument xml = player.GetXmlDocument();
			return Xml(xml);
		}
	}
}