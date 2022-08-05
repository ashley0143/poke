using System.Collections.Generic;
using System.Xml;

namespace InnerTube.Models
{
	public class YoutubeLocals
	{
		public Dictionary<string, string> Languages { get; set; }
		public Dictionary<string, string> Regions { get; set; }

		public XmlDocument GetXmlDocument()
		{
			XmlDocument doc = new();
			XmlElement locals = doc.CreateElement("Locals");

			XmlElement languages = doc.CreateElement("Languages");
			foreach (KeyValuePair<string, string> l in Languages) 
			{
				XmlElement language = doc.CreateElement("Language");
				language.SetAttribute("hl", l.Key);
				language.InnerText = l.Value;
				languages.AppendChild(language);
			}
			locals.AppendChild(languages);

			XmlElement regions = doc.CreateElement("Regions");
			foreach (KeyValuePair<string, string> r in Regions) 
			{
				XmlElement region = doc.CreateElement("Region");
				region.SetAttribute("gl", r.Key);
				region.InnerText = r.Value;
				regions.AppendChild(region);
			}
			locals.AppendChild(regions);

			doc.AppendChild(locals);
			return doc;
		}
	}
}