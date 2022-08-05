using System.Xml;
using MongoDB.Bson.Serialization.Attributes;

namespace LightTube.Database
{
	[BsonIgnoreExtraElements]
	public class LTChannel
	{
		public string ChannelId;
		public string Name;
		public string Subscribers;
		public string IconUrl;

		public XmlNode GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Channel");
			item.SetAttribute("id", ChannelId);
			item.SetAttribute("subscribers", Subscribers);

			XmlElement title = doc.CreateElement("Name");
			title.InnerText = Name;
			item.AppendChild(title);

			XmlElement thumbnail = doc.CreateElement("Avatar");
			thumbnail.InnerText = IconUrl;
			item.AppendChild(thumbnail);

			return item;
		}
	}
}