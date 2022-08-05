using LightTube.Database;

namespace LightTube.Contexts
{
	public class FeedContext : BaseContext
	{
		public LTChannel[] Channels;
		public FeedVideo[] Videos;
		public string RssToken;
	}
}