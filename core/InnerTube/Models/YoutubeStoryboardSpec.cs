using System;
using System.Collections.Generic;

namespace InnerTube.Models
{
	public class YoutubeStoryboardSpec
	{
		public Dictionary<string, string> Urls = new();
		public YoutubeStoryboardSpec(string specStr, long duration)
		{
			if (specStr is null) return;
			List<string> spec = new(specStr.Split("|"));
			string baseUrl = spec[0];
			spec.RemoveAt(0);
			spec.Reverse();
			int L = spec.Count - 1;
			for (int i = 0; i < spec.Count; i++)
			{
				string[] args = spec[i].Split("#");
				int width = int.Parse(args[0]);
				int height = int.Parse(args[1]);
				int frameCount = int.Parse(args[2]);
				int cols = int.Parse(args[3]);
				int rows = int.Parse(args[4]);
				string N = args[6];
				string sigh = args[7];
				string url = baseUrl
					.Replace("$L", (spec.Count - 1 - i).ToString())
					.Replace("$N", N) + "&sigh=" + sigh;
				float fragmentCount = frameCount / (cols * rows);
				float fragmentDuration = duration / fragmentCount;
				
				for (int j = 0; j < Math.Ceiling(fragmentCount); j++)
					Urls.TryAdd($"L{spec.Count - 1 - i}", url.Replace("$M", j.ToString()));
			}
		}
	}
}