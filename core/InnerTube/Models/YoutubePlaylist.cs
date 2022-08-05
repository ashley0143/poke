using System.Xml;

namespace InnerTube.Models
{
	public class YoutubePlaylist
	{
		public string Id;
		public string Title;
		public string Description;
		public string VideoCount;
		public string ViewCount;
		public string LastUpdated;
		public Thumbnail[] Thumbnail;
		public Channel Channel;
		public DynamicItem[] Videos;
		public string ContinuationKey;

		public string GetHtmlDescription() => Utils.GetHtmlDescription(Description);

		public XmlDocument GetXmlDocument()
		{
			XmlDocument doc = new();
			XmlElement playlist = doc.CreateElement("Playlist");
			playlist.SetAttribute("id", Id);
			playlist.SetAttribute("continuation", ContinuationKey);
			
			XmlElement metadata = doc.CreateElement("Metadata");

			XmlElement title = doc.CreateElement("Title");
			title.InnerText = Title;
			metadata.AppendChild(title);

			metadata.AppendChild(Channel.GetXmlElement(doc));

			XmlElement thumbnails = doc.CreateElement("Thumbnails");
			foreach (Thumbnail t in Thumbnail) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				thumbnails.AppendChild(thumbnail);
			}
			metadata.AppendChild(thumbnails);

			XmlElement videoCount = doc.CreateElement("VideoCount");
			XmlElement viewCount = doc.CreateElement("ViewCount");
			XmlElement lastUpdated = doc.CreateElement("LastUpdated");

			videoCount.InnerText = VideoCount;
			viewCount.InnerText = ViewCount;
			lastUpdated.InnerText = LastUpdated;

			metadata.AppendChild(videoCount);
			metadata.AppendChild(viewCount);
			metadata.AppendChild(lastUpdated);

			playlist.AppendChild(metadata);

			XmlElement results = doc.CreateElement("Videos");
			foreach (DynamicItem result in Videos) results.AppendChild(result.GetXmlElement(doc));
			playlist.AppendChild(results);

			doc.AppendChild(playlist);
			return doc;
		}
	}
}