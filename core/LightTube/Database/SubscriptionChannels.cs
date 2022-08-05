using System.Xml;

namespace LightTube.Database
{
	public class SubscriptionChannels
	{
		public LTChannel[] Channels { get; set; }

		public XmlNode GetXmlDocument()
		{
			XmlDocument doc = new();
			XmlElement feed = doc.CreateElement("Subscriptions");
			foreach (LTChannel channel in Channels) feed.AppendChild(channel.GetXmlElement(doc));
			doc.AppendChild(feed);
			return doc;
		}
	}
}