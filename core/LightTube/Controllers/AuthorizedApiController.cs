using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Xml;
using InnerTube;
using InnerTube.Models;
using LightTube.Database;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Primitives;

namespace LightTube.Controllers
{
	[Route("/api/auth")]
	public class AuthorizedApiController : Controller
	{
		private readonly Youtube _youtube;

		private IReadOnlyList<string> _scopes = new[]
		{
			"api.subscriptions.read",
			"api.subscriptions.write"
		};

		public AuthorizedApiController(Youtube youtube)
		{
			_youtube = youtube;
		}

		private IActionResult Xml(XmlNode xmlDocument, HttpStatusCode statusCode)
		{
			MemoryStream ms = new();
			ms.Write(Encoding.UTF8.GetBytes(xmlDocument.OuterXml));
			ms.Position = 0;
			HttpContext.Response.Headers.Add("Access-Control-Allow-Origin", "*");
			Response.StatusCode = (int)statusCode;
			return File(ms, "application/xml");
		}

		private XmlNode BuildErrorXml(string message)
		{
			XmlDocument doc = new();
			XmlElement error = doc.CreateElement("Error");
			error.InnerText = message;
			doc.AppendChild(error);
			return doc;
		}

		[HttpPost]
		[Route("getToken")]
		public async Task<IActionResult> GetToken()
		{
			if (!Request.Headers.TryGetValue("User-Agent", out StringValues userAgent))
				return Xml(BuildErrorXml("Missing User-Agent header"), HttpStatusCode.BadRequest);

			Match match = Regex.Match(userAgent.ToString(), DatabaseManager.ApiUaRegex);
			if (!match.Success)
				return Xml(BuildErrorXml("Bad User-Agent header. Please see 'Documentation/API requests'"), HttpStatusCode.BadRequest);
			if (match.Groups[1].ToString() != "1.0")
				return Xml(BuildErrorXml($"Unknown API version {match.Groups[1]}"), HttpStatusCode.BadRequest);

			if (!Request.Form.TryGetValue("user", out StringValues user))
				return Xml(BuildErrorXml("Missing request value: 'user'"), HttpStatusCode.BadRequest);
			if (!Request.Form.TryGetValue("password", out StringValues password))
				return Xml(BuildErrorXml("Missing request value: 'password'"), HttpStatusCode.BadRequest);
			if (!Request.Form.TryGetValue("scopes", out StringValues scopes))
				return Xml(BuildErrorXml("Missing request value: 'scopes'"), HttpStatusCode.BadRequest);

			string[] newScopes = scopes.First().Split(",");
			foreach (string s in newScopes)
				if (!_scopes.Contains(s))
					return Xml(BuildErrorXml($"Unknown scope '{s}'"), HttpStatusCode.BadRequest);

			try
			{
				LTLogin ltLogin =
					await DatabaseManager.Logins.CreateToken(user, password, userAgent.ToString(),
						scopes.First().Split(","));
				return Xml(ltLogin.GetXmlElement(), HttpStatusCode.Created);
			}
			catch (UnauthorizedAccessException)
			{
				return Xml(BuildErrorXml("Invalid credentials"), HttpStatusCode.Unauthorized);
			}
			catch (InvalidOperationException)
			{
				return Xml(BuildErrorXml("User has API access disabled"), HttpStatusCode.Forbidden);
			}
		}

		[Route("subscriptions/feed")]
		public async Task<IActionResult> SubscriptionsFeed()
		{
			if (!HttpContext.TryGetUser(out LTUser user, "api.subscriptions.read"))
				return Xml(BuildErrorXml("Unauthorized"), HttpStatusCode.Unauthorized);

			SubscriptionFeed feed = new()
			{
				videos = await YoutubeRSS.GetMultipleFeeds(user.SubscribedChannels)
			};

			return Xml(feed.GetXmlDocument(), HttpStatusCode.OK);
		}

		[HttpGet]
		[Route("subscriptions/channels")]
		public IActionResult SubscriptionsChannels()
		{
			if (!HttpContext.TryGetUser(out LTUser user, "api.subscriptions.read"))
				return Xml(BuildErrorXml("Unauthorized"), HttpStatusCode.Unauthorized);

			SubscriptionChannels feed = new()
			{
				Channels = user.SubscribedChannels.Select(DatabaseManager.Channels.GetChannel).ToArray()
			};
			Array.Sort(feed.Channels, (p, q) => string.Compare(p.Name, q.Name, StringComparison.OrdinalIgnoreCase));

			return Xml(feed.GetXmlDocument(), HttpStatusCode.OK);
		}

		[HttpPut]
		[Route("subscriptions/channels")]
		public async Task<IActionResult> Subscribe()
		{
			if (!HttpContext.TryGetUser(out LTUser user, "api.subscriptions.write"))
				return Xml(BuildErrorXml("Unauthorized"), HttpStatusCode.Unauthorized);

			Request.Form.TryGetValue("id", out StringValues ids);
			string id = ids.ToString();

			if (user.SubscribedChannels.Contains(id))
				return StatusCode((int)HttpStatusCode.NotModified);

			try
			{
				YoutubeChannel channel = await _youtube.GetChannelAsync(id);

				if (channel.Id is null)
					return StatusCode((int)HttpStatusCode.NotFound);
				
				(LTChannel ltChannel, bool _) = await DatabaseManager.Logins.SubscribeToChannel(user, channel);

				XmlDocument doc = new();
				doc.AppendChild(ltChannel.GetXmlElement(doc));
				return Xml(doc, HttpStatusCode.OK);
			}
			catch (Exception e)
			{
				return Xml(BuildErrorXml(e.Message), HttpStatusCode.InternalServerError);
			}
		}

		[HttpDelete]
		[Route("subscriptions/channels")]
		public async Task<IActionResult> Unsubscribe()
		{
			if (!HttpContext.TryGetUser(out LTUser user, "api.subscriptions.write"))
				return Xml(BuildErrorXml("Unauthorized"), HttpStatusCode.Unauthorized);

			Request.Form.TryGetValue("id", out StringValues ids);
			string id = ids.ToString();

			if (!user.SubscribedChannels.Contains(id))
				return StatusCode((int)HttpStatusCode.NotModified);

			try
			{
				YoutubeChannel channel = await _youtube.GetChannelAsync(id);

				if (channel.Id is null)
					return StatusCode((int)HttpStatusCode.NotFound);
				
				(LTChannel ltChannel, bool _) = await DatabaseManager.Logins.SubscribeToChannel(user, channel);

				XmlDocument doc = new();
				doc.AppendChild(ltChannel.GetXmlElement(doc));
				return Xml(doc, HttpStatusCode.OK);
			}
			catch (Exception e)
			{
				return Xml(BuildErrorXml(e.Message), HttpStatusCode.InternalServerError);
			}
		}
	}
}