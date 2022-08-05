using System.Xml;

namespace LightTube.Database
{
	public class SubscriptionFeed
	{
		public FeedVideo[] videos;

		public XmlDocument GetXmlDocument()
		{
			XmlDocument doc = new();
			XmlElement feed = doc.CreateElement("Feed");
			foreach (FeedVideo feedVideo in videos) feed.AppendChild(feedVideo.GetXmlElement(doc));
			doc.AppendChild(feed);
			return doc;
		}
	}
}