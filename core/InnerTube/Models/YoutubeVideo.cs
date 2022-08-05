using System;
using System.Xml;

namespace InnerTube.Models
{
	public class YoutubeVideo
	{
		public string Id;
		public string Title;
		public string Description;
		public Channel Channel;
		public string UploadDate;
		public DynamicItem[] Recommended;
		public string Views;

		public string GetHtmlDescription() => InnerTube.Utils.GetHtmlDescription(Description);

		public XmlDocument GetXmlDocument()
		{
			XmlDocument doc = new();
			XmlElement item = doc.CreateElement("Video");

			item.SetAttribute("id", Id);
			item.SetAttribute("views", Views);
			item.SetAttribute("uploadDate", UploadDate);

			XmlElement title = doc.CreateElement("Title");
			title.InnerText = Title;
			item.AppendChild(title);

			XmlElement description = doc.CreateElement("Description");
			description.InnerText = Description;
			item.AppendChild(description);

			item.AppendChild(Channel.GetXmlElement(doc));

			XmlElement recommendations = doc.CreateElement("Recommendations");
			foreach (DynamicItem f in Recommended ?? Array.Empty<DynamicItem>()) recommendations.AppendChild(f.GetXmlElement(doc));
			item.AppendChild(recommendations);

			doc.AppendChild(item);
			return doc;
		}
	}
}