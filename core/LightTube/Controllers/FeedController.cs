using System;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using LightTube.Contexts;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using InnerTube;
using LightTube.Database;

namespace LightTube.Controllers
{
	[Route("/feed")]
	public class FeedController : Controller
	{
		private readonly ILogger<FeedController> _logger;
		private readonly Youtube _youtube;

		public FeedController(ILogger<FeedController> logger, Youtube youtube)
		{
			_logger = logger;
			_youtube = youtube;
		}

		[Route("subscriptions")]
		public async Task<IActionResult> Subscriptions()
		{
			if (!HttpContext.TryGetUser(out LTUser user, "web"))
				return Redirect("/Account/Login");

			try
			{
				FeedContext context = new()
				{
					Channels = user.SubscribedChannels.Select(DatabaseManager.Channels.GetChannel).ToArray(),
					Videos = await YoutubeRSS.GetMultipleFeeds(user.SubscribedChannels),
					RssToken = user.RssToken,
					MobileLayout = Utils.IsClientMobile(Request)
				};
				Array.Sort(context.Channels, (p, q) => string.Compare(p.Name, q.Name, StringComparison.OrdinalIgnoreCase));
				return View(context);
			}
			catch
			{
				HttpContext.Response.Cookies.Delete("token");
				return Redirect("/Account/Login");
			}
		}

		[Route("channels")]
		public IActionResult Channels()
		{
			if (!HttpContext.TryGetUser(out LTUser user, "web"))
				return Redirect("/Account/Login");

			try
			{
				FeedContext context = new()
				{
					Channels = user.SubscribedChannels.Select(DatabaseManager.Channels.GetChannel).ToArray(),
					Videos = null,
					MobileLayout = Utils.IsClientMobile(Request)
				};
				Array.Sort(context.Channels, (p, q) => string.Compare(p.Name, q.Name, StringComparison.OrdinalIgnoreCase));
				return View(context);
			}
			catch
			{
				HttpContext.Response.Cookies.Delete("token");
				return Redirect("/Account/Login");
			}
		}

		[Route("explore")]
		public IActionResult Explore()
		{
			return View(new BaseContext
			{
				MobileLayout = Utils.IsClientMobile(Request)
			});
		}

		[Route("/feed/library")]
		public async Task<IActionResult> Playlists()
		{
			if (!HttpContext.TryGetUser(out LTUser user, "web"))
				Redirect("/Account/Login");

			return View(new PlaylistsContext
			{
				MobileLayout = Utils.IsClientMobile(Request),
				Playlists = await DatabaseManager.Playlists.GetUserPlaylists(user.UserID)
			});
		}

		[Route("/rss")]
		public async Task<IActionResult> Playlists(string token, int limit = 15)
		{
			if (!DatabaseManager.TryGetRssUser(token, out LTUser user))
				return Unauthorized();
			return File(Encoding.UTF8.GetBytes(await user.GenerateRssFeed(Request.Host.ToString(), Math.Clamp(limit, 0, 50))), "application/xml");
		}
	}
}