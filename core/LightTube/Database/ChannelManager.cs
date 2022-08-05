using System.Threading.Tasks;
using MongoDB.Driver;

namespace LightTube.Database
{
	public class ChannelManager
	{
		private static IMongoCollection<LTChannel> _channelCacheCollection;

		public ChannelManager(IMongoCollection<LTChannel> channelCacheCollection)
		{
			_channelCacheCollection = channelCacheCollection;
		}

		public LTChannel GetChannel(string id)
		{
			LTChannel res = _channelCacheCollection.FindSync(x => x.ChannelId == id).FirstOrDefault();
			return res ?? new LTChannel
			{
				Name = "Unknown Channel",
				ChannelId = id,
				IconUrl = "",
				Subscribers = ""
			};
		}

		public async Task<LTChannel> UpdateChannel(string id, string name, string subscribers, string iconUrl)
		{
			LTChannel channel = new()
			{
				ChannelId = id,
				Name = name,
				Subscribers = subscribers,
				IconUrl = iconUrl
			};
			if (channel.IconUrl is null && !string.IsNullOrWhiteSpace(GetChannel(id).IconUrl))
				channel.IconUrl = GetChannel(id).IconUrl;
			if (await _channelCacheCollection.CountDocumentsAsync(x => x.ChannelId == id) > 0)
				await _channelCacheCollection.ReplaceOneAsync(x => x.ChannelId == id, channel);
			else
				await _channelCacheCollection.InsertOneAsync(channel);

			return channel;
		}
	}
}