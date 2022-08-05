using System.Xml;

namespace InnerTube.Models
{
	public class YoutubeChannel
	{
		public string Id;
		public string Name;
		public string Url;
		public Thumbnail[] Avatars;
		public Thumbnail[] Banners;
		public string Description;
		public DynamicItem[] Videos;
		public string Subscribers;

		public string GetHtmlDescription()
		{
			return Utils.GetHtmlDescription(Description);
		}

		public XmlDocument GetXmlDocument()
		{
			XmlDocument doc = new();
			XmlElement channel = doc.CreateElement("Channel");
			channel.SetAttribute("id", Id);
			if (Id != Url)
				channel.SetAttribute("customUrl", Url);
			
			XmlElement metadata = doc.CreateElement("Metadata");

			XmlElement name = doc.CreateElement("Name");
			name.InnerText = Name;
			metadata.AppendChild(name);

			XmlElement avatars = doc.CreateElement("Avatars");
			foreach (Thumbnail t in Avatars) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				avatars.AppendChild(thumbnail);
			}
			metadata.AppendChild(avatars);

			XmlElement banners = doc.CreateElement("Banners");
			foreach (Thumbnail t in Banners) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				banners.AppendChild(thumbnail);
			}
			metadata.AppendChild(banners);

			XmlElement subscriberCount = doc.CreateElement("Subscribers");
			subscriberCount.InnerText = Subscribers;
			metadata.AppendChild(subscriberCount);

			channel.AppendChild(metadata);

			XmlElement contents = doc.CreateElement("Contents");
			foreach (DynamicItem item in Videos) contents.AppendChild(item.GetXmlElement(doc));
			channel.AppendChild(contents);

			doc.AppendChild(channel);
			return doc;
		}
	}
}