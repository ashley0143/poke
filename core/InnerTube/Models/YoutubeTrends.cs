using System;
using System.Xml;

namespace InnerTube.Models
{
	public class YoutubeTrends
	{
		public TrendCategory[] Categories;
		public DynamicItem[] Videos;

		public XmlDocument GetXmlDocument()
		{
			XmlDocument doc = new();
			XmlElement explore = doc.CreateElement("Explore");

			XmlElement categories = doc.CreateElement("Categories");
			foreach (TrendCategory category in Categories ?? Array.Empty<TrendCategory>()) categories.AppendChild(category.GetXmlElement(doc));
			explore.AppendChild(categories);

			XmlElement contents = doc.CreateElement("Videos");
			foreach (DynamicItem item in Videos ?? Array.Empty<DynamicItem>()) contents.AppendChild(item.GetXmlElement(doc));
			explore.AppendChild(contents);

			doc.AppendChild(explore);
			return doc;
		}
	}

	public class TrendCategory
	{
		public string Label;
		public Thumbnail[] BackgroundImage;
		public Thumbnail[] Icon;
		public string Id;

		public XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement category = doc.CreateElement("Category");
			category.SetAttribute("id", Id);

			XmlElement title = doc.CreateElement("Name");
			title.InnerText = Label;
			category.AppendChild(title);
			
			XmlElement backgroundImages = doc.CreateElement("BackgroundImage");
			foreach (Thumbnail t in BackgroundImage ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				backgroundImages.AppendChild(thumbnail);
			}
			category.AppendChild(backgroundImages);

			XmlElement icons = doc.CreateElement("Icon");
			foreach (Thumbnail t in Icon ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				icons.AppendChild(thumbnail);
			}
			category.AppendChild(icons);
			
			return category;
		}
	}
}