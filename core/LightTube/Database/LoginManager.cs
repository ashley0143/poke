using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using InnerTube.Models;
using MongoDB.Driver;

namespace LightTube.Database
{
	public class LoginManager
	{
		private IMongoCollection<LTUser> _userCollection;
		private IMongoCollection<LTLogin> _tokenCollection;

		public LoginManager(IMongoCollection<LTUser> userCollection, IMongoCollection<LTLogin> tokenCollection)
		{
			_userCollection = userCollection;
			_tokenCollection = tokenCollection;
		}

		public async Task<LTLogin> CreateToken(string email, string password, string userAgent, string[] scopes)
		{
			IAsyncCursor<LTUser> users = await _userCollection.FindAsync(x => x.UserID == email);
			if (!await users.AnyAsync())
				throw new UnauthorizedAccessException("Invalid credentials");
			LTUser user = (await _userCollection.FindAsync(x => x.UserID == email)).First();
			if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
				throw new UnauthorizedAccessException("Invalid credentials");
			if (!scopes.Contains("web") && !user.ApiAccess)
				throw new InvalidOperationException("This user has API access disabled");

			LTLogin login = new()
			{
				Identifier = Guid.NewGuid().ToString(),
				Email = email,
				Token = GenerateToken(256),
				UserAgent = userAgent,
				Scopes = scopes.ToArray(),
				Created = DateTimeOffset.Now,
				LastSeen = DateTimeOffset.Now
			};
			await _tokenCollection.InsertOneAsync(login);
			return login;
		}

		public async Task UpdateLastAccess(string id, DateTimeOffset offset)
		{
			LTLogin login = (await _tokenCollection.FindAsync(x => x.Identifier == id)).First();
			login.LastSeen = offset;
			await _tokenCollection.ReplaceOneAsync(x => x.Identifier == id, login);
		}

		public async Task RemoveToken(string token)
		{
			await _tokenCollection.FindOneAndDeleteAsync(t => t.Token == token);
		}

		public async Task RemoveToken(string email, string password, string identifier)
		{
			IAsyncCursor<LTUser> users = await _userCollection.FindAsync(x => x.UserID == email);
			if (!await users.AnyAsync())
				throw new KeyNotFoundException("Invalid credentials");
			LTUser user = (await _userCollection.FindAsync(x => x.UserID == email)).First();
			if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
				throw new UnauthorizedAccessException("Invalid credentials");

			await _tokenCollection.FindOneAndDeleteAsync(t => t.Identifier == identifier && t.Email == user.UserID);
		}

		[EditorBrowsable(EditorBrowsableState.Never)]
		public async Task RemoveTokenFromId(string sourceToken, string identifier)
		{
			LTLogin login = (await _tokenCollection.FindAsync(x => x.Token == sourceToken)).First();
			LTLogin deletedLogin = (await _tokenCollection.FindAsync(x => x.Identifier == identifier)).First();

			if (login.Email == deletedLogin.Email)
				await _tokenCollection.FindOneAndDeleteAsync(t => t.Identifier == identifier);
			else
				throw new UnauthorizedAccessException(
					"Logged in user does not match the token that is supposed to be deleted");
		}

		public async Task<LTUser> GetUserFromToken(string token)
		{
			string email = (await _tokenCollection.FindAsync(x => x.Token == token)).First().Email;
			return (await _userCollection.FindAsync(u => u.UserID == email)).First();
		}

		public async Task<LTUser> GetUserFromRssToken(string token) => (await _userCollection.FindAsync(u => u.RssToken == token)).First();

		public async Task<LTLogin> GetLoginFromToken(string token)
		{
			var res = await _tokenCollection.FindAsync(x => x.Token == token);
			return res.First();
		}

		public async Task<List<LTLogin>> GetAllUserTokens(string token)
		{
			string email = (await _tokenCollection.FindAsync(x => x.Token == token)).First().Email;
			return await (await _tokenCollection.FindAsync(u => u.Email == email)).ToListAsync();
		}

		public async Task<string> GetCurrentLoginId(string token)
		{
			return (await _tokenCollection.FindAsync(t => t.Token == token)).First().Identifier;
		}

		public async Task<(LTChannel channel, bool subscribed)> SubscribeToChannel(LTUser user, YoutubeChannel channel)
		{
			LTChannel ltChannel = await DatabaseManager.Channels.UpdateChannel(channel.Id, channel.Name, channel.Subscribers,
				channel.Avatars.FirstOrDefault()?.Url);

			if (user.SubscribedChannels.Contains(ltChannel.ChannelId))
				user.SubscribedChannels.Remove(ltChannel.ChannelId);
			else
				user.SubscribedChannels.Add(ltChannel.ChannelId);
			
			await _userCollection.ReplaceOneAsync(x => x.UserID == user.UserID, user);
			return (ltChannel, user.SubscribedChannels.Contains(ltChannel.ChannelId));
		}

		public async Task SetApiAccess(LTUser user, bool access)
		{
			user.ApiAccess = access;
			await _userCollection.ReplaceOneAsync(x => x.UserID == user.UserID, user);
		}

		public async Task DeleteUser(string email, string password)
		{
			IAsyncCursor<LTUser> users = await _userCollection.FindAsync(x => x.UserID == email);
			if (!await users.AnyAsync())
				throw new KeyNotFoundException("Invalid credentials");
			LTUser user = (await _userCollection.FindAsync(x => x.UserID == email)).First();
			if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
				throw new UnauthorizedAccessException("Invalid credentials");

			await _userCollection.DeleteOneAsync(x => x.UserID == email);
			await _tokenCollection.DeleteManyAsync(x => x.Email == email);
			foreach (LTPlaylist pl in await DatabaseManager.Playlists.GetUserPlaylists(email))
				await DatabaseManager.Playlists.DeletePlaylist(pl.Id);
		}

		public async Task CreateUser(string email, string password)
		{
			IAsyncCursor<LTUser> users = await _userCollection.FindAsync(x => x.UserID == email);
			if (await users.AnyAsync())
				throw new DuplicateNameException("A user with that email already exists");

			LTUser user = new()
			{
				UserID = email,
				PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
				SubscribedChannels = new List<string>(),
				RssToken = GenerateToken(32)
			};
			await _userCollection.InsertOneAsync(user);
		}

		private string GenerateToken(int length)
		{
			string tokenAlphabet = @"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-+*/()[]{}";
			Random rng = new();
			StringBuilder sb = new();
			for (int i = 0; i < length; i++)
				sb.Append(tokenAlphabet[rng.Next(0, tokenAlphabet.Length)]);
			return sb.ToString();
		}
	}
}