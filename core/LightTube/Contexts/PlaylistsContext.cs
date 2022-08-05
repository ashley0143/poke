using System.Collections.Generic;
using InnerTube.Models;
using LightTube.Database;

namespace LightTube.Contexts
{
	public class PlaylistsContext : BaseContext
	{
		public IEnumerable<LTPlaylist> Playlists;
	}
}