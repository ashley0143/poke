using System;
using System.Xml;
using InnerTube.Models;

namespace LightTube.Database
{
	public class LTVideo : PlaylistVideoItem
	{
		public string UploadedAt;
		public long Views;

		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Video");
			item.SetAttribute("id", Id);
			item.SetAttribute("duration", Duration);
			item.SetAttribute("views", Views.ToString());
			item.SetAttribute("uploadedAt", UploadedAt);
			item.SetAttribute("index", Index.ToString());

			XmlElement title = doc.CreateElement("Title");
			title.InnerText = Title;
			item.AppendChild(title);
			if (Channel is not null)
				item.AppendChild(Channel.GetXmlElement(doc));

			foreach (Thumbnail t in Thumbnails ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				item.AppendChild(thumbnail);
			}

			return item;
		}
	}
}