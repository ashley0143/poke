using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace InnerTube
{
	public static class ReturnYouTubeDislike
	{
		private static HttpClient _client = new();
		private static Dictionary<string, YoutubeDislikes> DislikesCache = new();

		// TODO: better cache
		public static async Task<YoutubeDislikes> GetDislikes(string videoId)
		{
			if (DislikesCache.ContainsKey(videoId))
				return DislikesCache[videoId];

			HttpResponseMessage response = await _client.GetAsync("https://returnyoutubedislikeapi.com/votes?videoId=" + videoId);
			string json = await response.Content.ReadAsStringAsync();
			YoutubeDislikes dislikes = JsonConvert.DeserializeObject<YoutubeDislikes>(json);
			if (dislikes is not null)
				DislikesCache.Add(videoId, dislikes);
			return dislikes ?? new YoutubeDislikes();
		}
	}

	public class YoutubeDislikes
	{
		[JsonProperty("id")] public string Id { get; set; }
		[JsonProperty("dateCreated")] public string DateCreated { get; set; }
		[JsonProperty("likes")] public long Likes { get; set; }
		[JsonProperty("dislikes")] public long Dislikes { get; set; }
		[JsonProperty("rating")] public double Rating { get; set; }
		[JsonProperty("viewCount")] public long Views { get; set; }
		[JsonProperty("deleted")] public bool Deleted { get; set; }

		public float GetLikePercentage()
		{
			return Likes / (float)(Likes + Dislikes) * 100;
		}
	}
}