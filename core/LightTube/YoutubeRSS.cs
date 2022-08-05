using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Xml;
using System.Xml.Linq;

namespace LightTube
{
	public static class YoutubeRSS
	{
		private static HttpClient _httpClient = new();

		public static async Task<ChannelFeed> GetChannelFeed(string channelId)
		{
			HttpResponseMessage response =
				await _httpClient.GetAsync("https://www.youtube.com/feeds/videos.xml?channel_id=" + channelId);
			if (!response.IsSuccessStatusCode)
				throw response.StatusCode switch
				{
					HttpStatusCode.NotFound => new KeyNotFoundException($"Channel '{channelId}' does not exist"),
					var _ => new Exception("Failed to fetch RSS feed for channel " + channelId)
				};

			ChannelFeed feed = new();

			string xml = await response.Content.ReadAsStringAsync();
			XDocument doc = XDocument.Parse(xml);

			feed.Name = doc.Descendants().First(p => p.Name.LocalName == "title").Value;
			feed.Id = doc.Descendants().First(p => p.Name.LocalName == "channelId").Value;
			feed.Videos = doc.Descendants().Where(p => p.Name.LocalName == "entry").Select(x => new FeedVideo
			{
				Id = x.Descendants().First(p => p.Name.LocalName == "videoId").Value,
				Title = x.Descendants().First(p => p.Name.LocalName == "title").Value,
				Description = x.Descendants().First(p => p.Name.LocalName == "description").Value,
				ViewCount = long.Parse(x.Descendants().First(p => p.Name.LocalName == "statistics").Attribute("views")?.Value ?? "-1"),
				Thumbnail = x.Descendants().First(p => p.Name.LocalName == "thumbnail").Attribute("url")?.Value,
				ChannelName = x.Descendants().First(p => p.Name.LocalName == "name").Value,
				ChannelId = x.Descendants().First(p => p.Name.LocalName == "channelId").Value,
				PublishedDate = DateTimeOffset.Parse(x.Descendants().First(p => p.Name.LocalName == "published").Value)
			}).ToArray();

			return feed;
		}

		public static async Task<FeedVideo[]> GetMultipleFeeds(IEnumerable<string> channelIds)
		{
			Task<ChannelFeed>[] feeds = channelIds.Select(YoutubeRSS.GetChannelFeed).ToArray();
			await Task.WhenAll(feeds);

			List<FeedVideo> videos = new();
			foreach (ChannelFeed feed in feeds.Select(x => x.Result)) videos.AddRange(feed.Videos);

			videos.Sort((a, b) => DateTimeOffset.Compare(b.PublishedDate, a.PublishedDate));
			return videos.ToArray();
		}
	}

	public class ChannelFeed
	{
		public string Name;
		public string Id;
		public FeedVideo[] Videos;
	}

	public class FeedVideo
	{
		public string Id;
		public string Title;
		public string Description;
		public long ViewCount;
		public string Thumbnail;
		public string ChannelName;
		public string ChannelId;
		public DateTimeOffset PublishedDate;

		public XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Video");
			item.SetAttribute("id", Id);
			item.SetAttribute("views", ViewCount.ToString());
			item.SetAttribute("uploadedAt", PublishedDate.ToUnixTimeSeconds().ToString());

			XmlElement title = doc.CreateElement("Title");
			title.InnerText = Title;
			item.AppendChild(title);
			XmlElement channel = doc.CreateElement("Channel");
			channel.SetAttribute("id", ChannelId);

			XmlElement channelTitle = doc.CreateElement("Name");
			channelTitle.InnerText = ChannelName;
			channel.AppendChild(channelTitle);

			item.AppendChild(channel);

			XmlElement thumbnail = doc.CreateElement("Thumbnail");
			thumbnail.InnerText = Thumbnail;
			item.AppendChild(thumbnail);

			if (!string.IsNullOrWhiteSpace(Description))
			{
				XmlElement description = doc.CreateElement("Description");
				description.InnerText = Description;
				item.AppendChild(description);
			}

			return item;
		}
	}
}