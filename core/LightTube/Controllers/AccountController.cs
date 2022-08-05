using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using InnerTube;
using InnerTube.Models;
using LightTube.Contexts;
using LightTube.Database;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace LightTube.Controllers
{
	public class AccountController : Controller
	{
		private readonly Youtube _youtube;

		public AccountController(Youtube youtube)
		{
			_youtube = youtube;
		}

		[Route("/Account")]
		public IActionResult Account()
		{
			return View(new BaseContext
			{
				MobileLayout = Utils.IsClientMobile(Request)
			});
		}

		[HttpGet]
		public IActionResult Login(string err = null)
		{
			if (HttpContext.TryGetUser(out LTUser _, "web"))
				return Redirect("/");

			return View(new MessageContext
			{
				Message = err,
				MobileLayout = Utils.IsClientMobile(Request)
			});
		}

		[HttpPost]
		public async Task<IActionResult> Login(string userid, string password)
		{
			if (HttpContext.TryGetUser(out LTUser _, "web"))
				return Redirect("/");

			try
			{
				LTLogin login = await DatabaseManager.Logins.CreateToken(userid, password, Request.Headers["user-agent"], new []{"web"});
				Response.Cookies.Append("token", login.Token, new CookieOptions
				{
					Expires = DateTimeOffset.MaxValue
				});

				return Redirect("/");
			}
			catch (KeyNotFoundException e)
			{
				return Redirect("/Account/Login?err=" + HttpUtility.UrlEncode(e.Message));
			}
			catch (UnauthorizedAccessException e)
			{
				return Redirect("/Account/Login?err=" + HttpUtility.UrlEncode(e.Message));
			}
		}
		
		public async Task<IActionResult> Logout()
		{
			if (HttpContext.Request.Cookies.TryGetValue("token", out string token))
			{
				await DatabaseManager.Logins.RemoveToken(token);
			}

			HttpContext.Response.Cookies.Delete("token");
			HttpContext.Response.Cookies.Delete("account_data");
			return Redirect("/");
		}

		[HttpGet]
		public IActionResult Register(string err = null)
		{
			if (HttpContext.TryGetUser(out LTUser _, "web"))
				return Redirect("/");

			return View(new MessageContext
			{
				Message = err,
				MobileLayout = Utils.IsClientMobile(Request)
			});
		}

		[HttpPost]
		public async Task<IActionResult> Register(string userid, string password)
		{
			if (HttpContext.TryGetUser(out LTUser _, "web"))
				return Redirect("/");

			try
			{
				await DatabaseManager.Logins.CreateUser(userid, password);
				LTLogin login = await DatabaseManager.Logins.CreateToken(userid, password, Request.Headers["user-agent"], new []{"web"});
				Response.Cookies.Append("token", login.Token, new CookieOptions
				{
					Expires = DateTimeOffset.MaxValue
				});

				return Redirect("/");
			}
			catch (DuplicateNameException e)
			{
				return Redirect("/Account/Register?err=" + HttpUtility.UrlEncode(e.Message));
			}
		}

		public IActionResult RegisterLocal()
		{
			if (!HttpContext.TryGetUser(out LTUser _, "web"))
				HttpContext.CreateLocalAccount();
			
			return Redirect("/");
		}

		[HttpGet]
		public IActionResult Delete(string err = null)
		{
			if (!HttpContext.TryGetUser(out LTUser _, "web"))
				return Redirect("/");

			return View(new MessageContext
			{
				Message = err,
				MobileLayout = Utils.IsClientMobile(Request)
			});
		}

		[HttpPost]
		public async Task<IActionResult> Delete(string userid, string password)
		{
			try
			{
				if (userid == "Local Account" && password == "local_account")
					Response.Cookies.Delete("account_data");
				else
					await DatabaseManager.Logins.DeleteUser(userid, password);
				return Redirect("/Account/Register?err=Account+deleted");
			}
			catch (KeyNotFoundException e)
			{
				return Redirect("/Account/Delete?err=" + HttpUtility.UrlEncode(e.Message));
			}
			catch (UnauthorizedAccessException e)
			{
				return Redirect("/Account/Delete?err=" + HttpUtility.UrlEncode(e.Message));
			}
		}

		public async Task<IActionResult> Logins()
		{
			if (!HttpContext.TryGetUser(out LTUser _, "web") || !HttpContext.Request.Cookies.TryGetValue("token", out string token))
				return Redirect("/Account/Login");

			return View(new LoginsContext
			{
				CurrentLogin = await DatabaseManager.Logins.GetCurrentLoginId(token),
				Logins = await DatabaseManager.Logins.GetAllUserTokens(token),
				MobileLayout = Utils.IsClientMobile(Request)
			});
		}

		public async Task<IActionResult> DisableLogin(string id)
		{
			if (!HttpContext.Request.Cookies.TryGetValue("token", out string token))
				return Redirect("/Account/Login");

			try
			{
				await DatabaseManager.Logins.RemoveTokenFromId(token, id);
			} catch { }
			return Redirect("/Account/Logins");
		}

		public async Task<IActionResult> Subscribe(string channel)
		{
			if (!HttpContext.TryGetUser(out LTUser user, "web"))
				return Unauthorized();

			try
			{
				YoutubeChannel youtubeChannel = await _youtube.GetChannelAsync(channel, ChannelTabs.About);
				
				(LTChannel channel, bool subscribed) result;
				result.channel = await DatabaseManager.Channels.UpdateChannel(youtubeChannel.Id, youtubeChannel.Name, youtubeChannel.Subscribers,
					youtubeChannel.Avatars.First().Url);
				
				if (user.PasswordHash == "local_account")
				{
					LTChannel ltChannel = await DatabaseManager.Channels.UpdateChannel(youtubeChannel.Id, youtubeChannel.Name, youtubeChannel.Subscribers,
						youtubeChannel.Avatars.First().Url);
					if (user.SubscribedChannels.Contains(ltChannel.ChannelId))
						user.SubscribedChannels.Remove(ltChannel.ChannelId);
					else
						user.SubscribedChannels.Add(ltChannel.ChannelId);

					HttpContext.Response.Cookies.Append("account_data", JsonConvert.SerializeObject(user),
						new CookieOptions
						{
							Expires = DateTimeOffset.MaxValue
						});

					result.subscribed = user.SubscribedChannels.Contains(ltChannel.ChannelId);
				}
				else
				{
					result =
						await DatabaseManager.Logins.SubscribeToChannel(user, youtubeChannel);
				}

				return Ok(result.subscribed ? "true" : "false");
			}
			catch
			{
				return Unauthorized();
			}
		}

		public IActionResult SubscriptionsJson()
		{
			if (!HttpContext.TryGetUser(out LTUser user, "web"))
				return Json(Array.Empty<string>());
			try
			{
				return Json(user.SubscribedChannels);
			}
			catch
			{
				return Json(Array.Empty<string>());
			}
		}

		public async Task<IActionResult> Settings()
		{
			if (!HttpContext.TryGetUser(out LTUser user, "web"))
				Redirect("/Account/Login");

			if (Request.Method == "POST")
			{
				CookieOptions opts = new()
				{
					Expires = DateTimeOffset.MaxValue
				};
				foreach ((string key, StringValues value) in Request.Form)
				{
					switch (key)
					{
						case "theme":
							Response.Cookies.Append("theme", value, opts);
							break;
						case "hl":
							Response.Cookies.Append("hl", value, opts);
							break;
						case "gl":
							Response.Cookies.Append("gl", value, opts);
							break;
						case "compatibility":
							Response.Cookies.Append("compatibility", value, opts);
							break;
						case "api-access":
							await DatabaseManager.Logins.SetApiAccess(user, bool.Parse(value));
							break;
					}
				}
				return Redirect("/Account");
			}

			YoutubeLocals locals = await _youtube.GetLocalsAsync();

			Request.Cookies.TryGetValue("theme", out string theme);

			bool compatibility = false;
			if (Request.Cookies.TryGetValue("compatibility", out string compatibilityString))
				bool.TryParse(compatibilityString, out compatibility);

			return View(new SettingsContext
			{
				Languages = locals.Languages,
				Regions = locals.Regions,
				CurrentLanguage = HttpContext.GetLanguage(),
				CurrentRegion = HttpContext.GetRegion(),
				MobileLayout = Utils.IsClientMobile(Request),
				Theme = theme ?? "light",
				CompatibilityMode = compatibility,
				ApiAccess = user.ApiAccess
			});
		}

		public async Task<IActionResult> AddVideoToPlaylist(string v)
		{
			if (!HttpContext.TryGetUser(out LTUser user, "web"))
				Redirect("/Account/Login");

			JObject ytPlayer = await InnerTube.Utils.GetAuthorizedPlayer(v, new HttpClient());
			return View(new AddToPlaylistContext
			{
				Id = v,
				Video = await _youtube.GetVideoAsync(v, HttpContext.GetLanguage(), HttpContext.GetRegion()),
				Playlists = await DatabaseManager.Playlists.GetUserPlaylists(user.UserID),
				Thumbnail = ytPlayer?["videoDetails"]?["thumbnail"]?["thumbnails"]?[0]?["url"]?.ToString() ?? $"https://i.ytimg.com/vi_webp/{v}/maxresdefault.webp",
				MobileLayout = Utils.IsClientMobile(Request),
			});
		}

		[HttpGet]
		public IActionResult CreatePlaylist(string returnUrl = null)
		{
			if (!HttpContext.TryGetUser(out LTUser user, "web"))
				Redirect("/Account/Login");

			return View(new BaseContext
			{
				MobileLayout = Utils.IsClientMobile(Request),
			});
		}

		[HttpPost]
		public async Task<IActionResult> CreatePlaylist()
		{
			if (!HttpContext.TryGetUser(out LTUser user, "web"))
				Redirect("/Account/Login");
			
			if (!Request.Form.ContainsKey("name") || string.IsNullOrWhiteSpace(Request.Form["name"])) return BadRequest();

			LTPlaylist pl = await DatabaseManager.Playlists.CreatePlaylist(
				user,
				Request.Form["name"],
				string.IsNullOrWhiteSpace(Request.Form["description"]) ? "" : Request.Form["description"],
				Enum.Parse<PlaylistVisibility>(string.IsNullOrWhiteSpace(Request.Form["visibility"]) ? "UNLISTED" : Request.Form["visibility"]));

			return Redirect($"/playlist?list={pl.Id}");
		}
	}
}