using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Threading.Tasks;
using System.Xml;
using MongoDB.Bson.Serialization.Attributes;

namespace LightTube.Database
{
	[BsonIgnoreExtraElements]
	public class LTUser
	{
		public string UserID;
		public string PasswordHash;
		public List<string> SubscribedChannels;
		public bool ApiAccess;
		public string RssToken;

		public async Task<string> GenerateRssFeed(string hostUrl, int limit)
		{
			XmlDocument document = new();
			XmlElement rss = document.CreateElement("rss");
			rss.SetAttribute("version", "2.0");

			XmlElement channel = document.CreateElement("channel");

			XmlElement title = document.CreateElement("title");
			title.InnerText = "LightTube subscriptions RSS feed for " + UserID;
			channel.AppendChild(title);

			XmlElement description = document.CreateElement("description");
			description.InnerText = $"LightTube subscriptions RSS feed for {UserID} with {SubscribedChannels.Count} channels";
			channel.AppendChild(description);

			FeedVideo[] feeds = await YoutubeRSS.GetMultipleFeeds(SubscribedChannels);
			IEnumerable<FeedVideo> feedVideos = feeds.Take(limit);

			foreach (FeedVideo video in feedVideos)
			{
				XmlElement item = document.CreateElement("item");

				XmlElement id = document.CreateElement("id");
				id.InnerText = $"id:video:{video.Id}";
				item.AppendChild(id);

				XmlElement vtitle = document.CreateElement("title");
				vtitle.InnerText = video.Title;
				item.AppendChild(vtitle);

				XmlElement vdescription = document.CreateElement("description");
				vdescription.InnerText = video.Description;
				item.AppendChild(vdescription);

				XmlElement link = document.CreateElement("link");
				link.InnerText = $"https://{hostUrl}/watch?v={video.Id}";
				item.AppendChild(link);

				XmlElement published = document.CreateElement("pubDate");
				published.InnerText = video.PublishedDate.ToString("R");
				item.AppendChild(published);

				XmlElement author = document.CreateElement("author");
				
				XmlElement name = document.CreateElement("name");
				name.InnerText = video.ChannelName;
				author.AppendChild(name);
				
				XmlElement uri = document.CreateElement("uri");
				uri.InnerText = $"https://{hostUrl}/channel/{video.ChannelId}";
				author.AppendChild(uri);
				
				item.AppendChild(author);
/*
				XmlElement mediaGroup = document.CreateElement("media_group");
				
				XmlElement mediaTitle = document.CreateElement("media_title");
				mediaTitle.InnerText = video.Title;
				mediaGroup.AppendChild(mediaTitle);
				
				XmlElement mediaThumbnail = document.CreateElement("media_thumbnail");
				mediaThumbnail.SetAttribute("url", video.Thumbnail);
				mediaGroup.AppendChild(mediaThumbnail);
				
				XmlElement mediaContent = document.CreateElement("media_content");
				mediaContent.SetAttribute("url", $"https://{hostUrl}/embed/{video.Id}");
				mediaContent.SetAttribute("type", "text/html");
				mediaGroup.AppendChild(mediaContent);
				
				item.AppendChild(mediaGroup);
*/
				channel.AppendChild(item);
			}

			rss.AppendChild(channel);
			
			document.AppendChild(rss);
			return document.OuterXml;//.Replace("<media_", "<media:").Replace("</media_", "</media:");
		}
	}
}