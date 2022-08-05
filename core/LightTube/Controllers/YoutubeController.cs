using System;
using System.Linq;
using System.Threading.Tasks;
using LightTube.Contexts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using InnerTube;
using InnerTube.Models;
using LightTube.Database;

namespace LightTube.Controllers
{
	public class YoutubeController : Controller
	{
		private readonly ILogger<YoutubeController> _logger;
		private readonly Youtube _youtube;

		public YoutubeController(ILogger<YoutubeController> logger, Youtube youtube)
		{
			_logger = logger;
			_youtube = youtube;
		}

		[Route("/watch")]
		public async Task<IActionResult> Watch(string v, string quality = null)
		{
			Task[] tasks = {
				_youtube.GetPlayerAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion()),
				_youtube.GetVideoAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion()),
				ReturnYouTubeDislike.GetDislikes(v)
			};
			await Task.WhenAll(tasks);

			bool cookieCompatibility = false;
			if (Request.Cookies.TryGetValue("compatibility", out string compatibilityString))
				bool.TryParse(compatibilityString, out cookieCompatibility);

			PlayerContext context = new()
			{
				Player = (tasks[0] as Task<YoutubePlayer>)?.Result,
				Video = (tasks[1] as Task<YoutubeVideo>)?.Result,
				Engagement = (tasks[2] as Task<YoutubeDislikes>)?.Result,
				Resolution = quality ?? (tasks[0] as Task<YoutubePlayer>)?.Result.Formats.FirstOrDefault(x => x.FormatId != "17")?.FormatNote,
				MobileLayout = Utils.IsClientMobile(Request),
				CompatibilityMode = cookieCompatibility
			};
			return View(context);
		}

		[Route("/download")]
		public async Task<IActionResult> Download(string v)
		{
			Task[] tasks = {
				_youtube.GetPlayerAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion()),
				_youtube.GetVideoAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion()),
				ReturnYouTubeDislike.GetDislikes(v)
			};
			await Task.WhenAll(tasks);

			bool cookieCompatibility = false;
			if (Request.Cookies.TryGetValue("compatibility", out string compatibilityString))
				bool.TryParse(compatibilityString, out cookieCompatibility);

			PlayerContext context = new()
			{
				Player = (tasks[0] as Task<YoutubePlayer>)?.Result,
				Video = (tasks[1] as Task<YoutubeVideo>)?.Result,
				Engagement = null,
				MobileLayout = Utils.IsClientMobile(Request),
				CompatibilityMode = cookieCompatibility
			};
			return View(context);
		}

		[Route("/embed/{v}")]
		public async Task<IActionResult> Embed(string v, string quality = null, bool compatibility = false)
		{
			Task[] tasks = {
				_youtube.GetPlayerAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion()),
				_youtube.GetVideoAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion()),
				ReturnYouTubeDislike.GetDislikes(v)
			};
			try
			{
				await Task.WhenAll(tasks);
			}
			catch { }

			
			bool cookieCompatibility = false;
			if (Request.Cookies.TryGetValue("compatibility", out string compatibilityString))
				bool.TryParse(compatibilityString, out cookieCompatibility);
			
			PlayerContext context = new()
			{
				Player = (tasks[0] as Task<YoutubePlayer>)?.Result,
				Video = (tasks[1] as Task<YoutubeVideo>)?.Result,
				Engagement = (tasks[2] as Task<YoutubeDislikes>)?.Result,
				Resolution = quality ?? (tasks[0] as Task<YoutubePlayer>)?.Result.Formats.FirstOrDefault(x => x.FormatId != "17")?.FormatNote,
				CompatibilityMode = compatibility || cookieCompatibility,
				MobileLayout = Utils.IsClientMobile(Request)
			};
			return View(context);
		}

		[Route("/results")]
		public async Task<IActionResult> Search(string search_query, string continuation = null)
		{
			SearchContext context = new()
			{
				Query = search_query,
				ContinuationKey = continuation,
				MobileLayout = Utils.IsClientMobile(Request)
			};
			if (!string.IsNullOrWhiteSpace(search_query))
			{
				context.Results = await _youtube.SearchAsync(search_query, continuation, HttpContext.GetLanguage(),
					HttpContext.GetRegion());
				Response.Cookies.Append("search_query", search_query);
			}
			else
			{
				context.Results =
					new YoutubeSearchResults
					{
						Refinements = Array.Empty<string>(),
						EstimatedResults = 0,
						Results = Array.Empty<DynamicItem>(),
						ContinuationKey = null
					};
			}
			return View(context);
		}

		[Route("/playlist")]
		public async Task<IActionResult> Playlist(string list, string continuation = null, int? delete = null, string add = null, string remove = null)
		{
			HttpContext.TryGetUser(out LTUser user, "web");
			
			YoutubePlaylist pl = list.StartsWith("LT-PL")
				? await (await DatabaseManager.Playlists.GetPlaylist(list)).ToYoutubePlaylist()
				: await _youtube.GetPlaylistAsync(list, continuation, HttpContext.GetLanguage(), HttpContext.GetRegion());

			string message = "";

			if (list.StartsWith("LT-PL") && (await DatabaseManager.Playlists.GetPlaylist(list)).Visibility == PlaylistVisibility.PRIVATE && pl.Channel.Name != user?.UserID)
				pl = new YoutubePlaylist
				{
					Id = null,
					Title = "",
					Description = "",
					VideoCount = "",
					ViewCount = "",
					LastUpdated = "",
					Thumbnail = Array.Empty<Thumbnail>(),
					Channel = new Channel
					{
						Name = "",
						Id = "",
						SubscriberCount = "",
						Avatars = Array.Empty<Thumbnail>()
					},
					Videos = Array.Empty<DynamicItem>(),
					ContinuationKey = null
				};

			if (string.IsNullOrWhiteSpace(pl.Title)) message = "Playlist unavailable";

			if (list.StartsWith("LT-PL") && pl.Channel.Name == user?.UserID)
			{
				if (delete != null)
				{
					LTVideo removed = await DatabaseManager.Playlists.RemoveVideoFromPlaylist(list, delete.Value);
					message += $"Removed video '{removed.Title}'";
				}

				if (add != null)
				{
					LTVideo added = await DatabaseManager.Playlists.AddVideoToPlaylist(list, add);
					message += $"Added video '{added.Title}'";
				}

				if (!string.IsNullOrWhiteSpace(remove))
				{
					await DatabaseManager.Playlists.DeletePlaylist(list);
					message = "Playlist deleted";
				}
				
				pl = await (await DatabaseManager.Playlists.GetPlaylist(list)).ToYoutubePlaylist();
			}

			PlaylistContext context = new()
			{
				Playlist = pl,
				Id = list,
				ContinuationToken = continuation,
				MobileLayout = Utils.IsClientMobile(Request),
				Message = message,
				Editable = list.StartsWith("LT-PL") && pl.Channel.Name == user?.UserID
			};
			return View(context);
		}

		[Route("/channel/{id}")]
		public async Task<IActionResult> Channel(string id, string continuation = null)
		{
			ChannelContext context = new()
			{
				Channel = await _youtube.GetChannelAsync(id, ChannelTabs.Videos, continuation, HttpContext.GetLanguage(), HttpContext.GetRegion()),
				Id = id,
				ContinuationToken = continuation,
				MobileLayout = Utils.IsClientMobile(Request)
			};
			await DatabaseManager.Channels.UpdateChannel(context.Channel.Id, context.Channel.Name, context.Channel.Subscribers,
				context.Channel.Avatars.First().Url.ToString());
			return View(context);
		}

		[Route("/shorts/{id}")]
		public IActionResult Shorts(string id)
		{
			// yea no fuck shorts
			return Redirect("/watch?v=" + id);
		}
	}
}