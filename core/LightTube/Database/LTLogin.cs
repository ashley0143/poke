using System;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Xml;
using Humanizer;
using MongoDB.Bson.Serialization.Attributes;
using MyCSharp.HttpUserAgentParser;

namespace LightTube.Database
{
	[BsonIgnoreExtraElements]
	public class LTLogin
	{
		public string Identifier;
		public string Email;
		public string Token;
		public string UserAgent;
		public string[] Scopes;
		public DateTimeOffset Created = DateTimeOffset.MinValue;
		public DateTimeOffset LastSeen = DateTimeOffset.MinValue;

		public XmlDocument GetXmlElement()
		{
			XmlDocument doc = new();
			XmlElement login = doc.CreateElement("Login");
			login.SetAttribute("id", Identifier);
			login.SetAttribute("user", Email);

			XmlElement token = doc.CreateElement("Token");
			token.InnerText = Token;
			login.AppendChild(token);

			XmlElement scopes = doc.CreateElement("Scopes");
			foreach (string scope in Scopes)
			{
				XmlElement scopeElement = doc.CreateElement("Scope");
				scopeElement.InnerText = scope;
				login.AppendChild(scopeElement);
			}
			login.AppendChild(scopes);
			
			doc.AppendChild(login);
			return doc;
		}

		public string GetTitle()
		{
			Match match = Regex.Match(UserAgent, DatabaseManager.ApiUaRegex);
			if (match.Success)
				return $"API App: {match.Groups[2]} {match.Groups[3]}";

			HttpUserAgentInformation client = HttpUserAgentParser.Parse(UserAgent);
			StringBuilder sb = new($"{client.Name} {client.Version}");
			if (client.Platform.HasValue)
				sb.Append($" on {client.Platform.Value.PlatformType.ToString()}");
			return sb.ToString();
		}

		public string GetDescription()
		{
			StringBuilder sb = new();
			sb.AppendLine($"Created: {Created.Humanize(DateTimeOffset.Now)}");
			sb.AppendLine($"Last seen: {LastSeen.Humanize(DateTimeOffset.Now)}");

			Match match = Regex.Match(UserAgent, DatabaseManager.ApiUaRegex);
			if (match.Success)
			{
				sb.AppendLine($"API version: {HttpUtility.HtmlEncode(match.Groups[1])}");
				sb.AppendLine($"App info: {HttpUtility.HtmlEncode(match.Groups[4])}");
				sb.AppendLine("Allowed scopes:");
				foreach (string scope in Scopes) sb.AppendLine($"- {scope}");
			}

			return sb.ToString();
		}

		public async Task UpdateLastAccess(DateTimeOffset newTime)
		{
			await DatabaseManager.Logins.UpdateLastAccess(Identifier, newTime);
		}
	}
}