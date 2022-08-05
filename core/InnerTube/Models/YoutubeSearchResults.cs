using System.Xml;

namespace InnerTube.Models
{
	public class YoutubeSearchResults
	{
		public string[] Refinements;
		public long EstimatedResults;
		public DynamicItem[] Results;
		public string ContinuationKey;

		public XmlDocument GetXmlDocument()
		{
			XmlDocument doc = new();
			XmlElement search = doc.CreateElement("Search");
			search.SetAttribute("estimatedResults", EstimatedResults.ToString());
			search.SetAttribute("continuation", ContinuationKey);

			if (Refinements.Length > 0)
			{
				XmlElement refinements = doc.CreateElement("Refinements");
				foreach (string refinementText in Refinements)
				{
					XmlElement refinement = doc.CreateElement("Refinement");
					refinement.InnerText = refinementText;
					refinements.AppendChild(refinement);
				}
				search.AppendChild(refinements);
			}

			XmlElement results = doc.CreateElement("Results");
			foreach (DynamicItem result in Results) results.AppendChild(result.GetXmlElement(doc));
			search.AppendChild(results);

			doc.AppendChild(search);
			return doc;
		}
	}
}