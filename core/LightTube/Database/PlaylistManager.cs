using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using InnerTube;
using InnerTube.Models;
using MongoDB.Driver;
using Newtonsoft.Json.Linq;

namespace LightTube.Database
{
	public class PlaylistManager
	{
		private IMongoCollection<LTUser> _userCollection;
		private IMongoCollection<LTPlaylist> _playlistCollection;
		private IMongoCollection<LTVideo> _videoCacheCollection;
		private Youtube _youtube;

		public PlaylistManager(IMongoCollection<LTUser> userCollection, IMongoCollection<LTPlaylist> playlistCollection,
			IMongoCollection<LTVideo> videoCacheCollection, Youtube youtube)
		{
			_userCollection = userCollection;
			_playlistCollection = playlistCollection;
			_videoCacheCollection = videoCacheCollection;
			_youtube = youtube;
		}

		public async Task<LTPlaylist> CreatePlaylist(LTUser user, string name, string description,
			PlaylistVisibility visibility, string idPrefix = null)
		{
			if (await _userCollection.CountDocumentsAsync(x => x.UserID == user.UserID) == 0)
				throw new UnauthorizedAccessException("Local accounts cannot create playlists");

			LTPlaylist pl = new()
			{
				Id = GenerateAuthorId(idPrefix),
				Name = name,
				Description = description,
				Visibility = visibility,
				VideoIds = new List<string>(),
				Author = user.UserID,
				LastUpdated = DateTimeOffset.Now
			};
			
			await _playlistCollection.InsertOneAsync(pl).ConfigureAwait(false);

			return pl;
		}

		public async Task<LTPlaylist> GetPlaylist(string id)
		{
			IAsyncCursor<LTPlaylist> cursor = await _playlistCollection.FindAsync(x => x.Id == id);
			return await cursor.FirstOrDefaultAsync() ?? new LTPlaylist
			{
				Id = null,
				Name = "",
				Description = "",
				Visibility = PlaylistVisibility.VISIBLE,
				VideoIds = new List<string>(),
				Author = "",
				LastUpdated = DateTimeOffset.MinValue
			};
		}

		public async Task<List<LTVideo>> GetPlaylistVideos(string id)
		{
			LTPlaylist pl = await GetPlaylist(id);
			List<LTVideo> videos = new();

			foreach (string videoId in pl.VideoIds)
			{
				IAsyncCursor<LTVideo> cursor = await _videoCacheCollection.FindAsync(x => x.Id == videoId);
				videos.Add(await cursor.FirstAsync());
			}

			return videos;
		}

		public async Task<LTVideo> AddVideoToPlaylist(string playlistId, string videoId)
		{
			LTPlaylist pl = await GetPlaylist(playlistId);
			YoutubeVideo vid = await _youtube.GetVideoAsync(videoId);
			JObject ytPlayer = await InnerTube.Utils.GetAuthorizedPlayer(videoId, new HttpClient());

			if (string.IsNullOrEmpty(vid.Id))
				throw new KeyNotFoundException($"Couldn't find a video with ID '{videoId}'");

			LTVideo v = new()
			{
				Id = vid.Id,
				Title = vid.Title,
				Thumbnails = ytPlayer?["videoDetails"]?["thumbnail"]?["thumbnails"]?.ToObject<Thumbnail[]>() ?? new []
				{
					new Thumbnail { Url = $"https://i.ytimg.com/vi_webp/{vid.Id}/maxresdefault.webp" }
				},
				UploadedAt = vid.UploadDate,
				Views = long.Parse(vid.Views.Split(" ")[0].Replace(",", "").Replace(".", "")),
				Channel = vid.Channel,
				Duration = GetDurationString(ytPlayer?["videoDetails"]?["lengthSeconds"]?.ToObject<long>() ?? 0),
				Index = pl.VideoIds.Count
			};
			pl.VideoIds.Add(vid.Id);

			if (await _videoCacheCollection.CountDocumentsAsync(x => x.Id == vid.Id) == 0)
				await _videoCacheCollection.InsertOneAsync(v);
			else
				await _videoCacheCollection.FindOneAndReplaceAsync(x => x.Id == vid.Id, v);

			UpdateDefinition<LTPlaylist> update = Builders<LTPlaylist>.Update
				.Push(x => x.VideoIds, vid.Id);
			_playlistCollection.FindOneAndUpdate(x => x.Id == playlistId, update);

			return v;
		}

		public async Task<LTVideo> RemoveVideoFromPlaylist(string playlistId, int videoIndex)
		{
			LTPlaylist pl = await GetPlaylist(playlistId);

			IAsyncCursor<LTVideo> cursor = await _videoCacheCollection.FindAsync(x => x.Id == pl.VideoIds[videoIndex]);
			LTVideo v = await cursor.FirstAsync();
			pl.VideoIds.RemoveAt(videoIndex);

			await _playlistCollection.FindOneAndReplaceAsync(x => x.Id == playlistId, pl);
			
			return v;
		}

		public async Task<IEnumerable<LTPlaylist>> GetUserPlaylists(string userId)
		{
			IAsyncCursor<LTPlaylist> cursor = await _playlistCollection.FindAsync(x => x.Author == userId);
			
			return cursor.ToEnumerable();
		}

		private string GetDurationString(long length)
		{
			string s = TimeSpan.FromSeconds(length).ToString();
			while (s.StartsWith("00:") && s.Length > 5) s = s[3..];
			return s;
		}

		public static string GenerateAuthorId(string prefix)
		{
			StringBuilder sb = new(string.IsNullOrWhiteSpace(prefix) || prefix.Trim().Length > 20
				? "LT-PL"
				: "LT-PL-" + prefix.Trim() + "_");

			string alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
			Random rng = new();
			while (sb.Length < 32) sb.Append(alphabet[rng.Next(0, alphabet.Length)]);
			return sb.ToString();
		}

		public async Task DeletePlaylist(string playlistId)
		{
			await _playlistCollection.DeleteOneAsync(x => x.Id == playlistId);
		}
	}
}