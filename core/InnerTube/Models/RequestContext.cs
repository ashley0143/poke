using System.Collections.Generic;
using Newtonsoft.Json;

namespace InnerTube.Models
{
	public class RequestContext
	{
		[JsonProperty("context")] public Context Context;

		public static string BuildRequestContextJson(Dictionary<string, object> additionalFields, string language = "en",
			string region = "US", string clientName = "WEB", string clientVersion = "2.20220224.07.00")
		{
			RequestContext ctx = new()
			{
				Context = new Context(
					new RequestClient(language, region, clientName, clientVersion),
					new RequestUser(false))
			};

			string json1 = JsonConvert.SerializeObject(ctx);
			Dictionary<string, object> json2 = JsonConvert.DeserializeObject<Dictionary<string, object>>(json1);
			foreach (KeyValuePair<string,object> pair in additionalFields) json2.Add(pair.Key, pair.Value);

			return JsonConvert.SerializeObject(json2);
		}
	}
	
	public class Context
	{
		[JsonProperty("client")] public RequestClient RequestClient { get; set; }
		[JsonProperty("user")] public RequestUser RequestUser { get; set; }

		public Context(RequestClient requestClient, RequestUser requestUser)
		{
			RequestClient = requestClient;
			RequestUser = requestUser;
		}
	}

	public class RequestClient
	{
		[JsonProperty("hl")] public string Language { get; set; }
		[JsonProperty("gl")] public string Region { get; set; }
		[JsonProperty("clientName")] public string ClientName { get; set; }
		[JsonProperty("clientVersion")] public string ClientVersion { get; set; }
		[JsonProperty("deviceModel")] public string DeviceModel { get; set; }

		public RequestClient(string language, string region, string clientName, string clientVersion)
		{
			Language = language;
			Region = region;
			ClientName = clientName;
			ClientVersion = clientVersion;
			if (clientName == "IOS") DeviceModel = "iPhone14,3";
		}
	}

	public class RequestUser
	{
		[JsonProperty("lockedSafetyMode")] public bool LockedSafetyMode { get; set; }

		public RequestUser(bool lockedSafetyMode)
		{
			LockedSafetyMode = lockedSafetyMode;
		}
	}
}