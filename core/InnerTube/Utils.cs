using System;
using System.Collections.Generic;
using System.Collections.Specialized;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web;
using System.Xml;
using InnerTube.Models;
using Newtonsoft.Json.Linq;

namespace InnerTube
{
	public static class Utils
	{
		private static string Sapisid;
		private static string Psid;
		private static bool UseAuthorization;

		public static string GetHtmlDescription(string description) => description?.Replace("\n", "<br>") ?? "";

		public static string GetMpdManifest(this YoutubePlayer player, string proxyUrl, string videoCodec = null, string audioCodec = null)
		{
			XmlDocument doc = new();

			XmlDeclaration xmlDeclaration = doc.CreateXmlDeclaration("1.0", "UTF-8", null);
			XmlElement root = doc.DocumentElement;
			doc.InsertBefore(xmlDeclaration, root);

			XmlElement mpdRoot = doc.CreateElement(string.Empty, "MPD", string.Empty);
			mpdRoot.SetAttribute("xmlns:xsi", "http://www.w3.org/2001/XMLSchema-instance");
			mpdRoot.SetAttribute("xmlns", "urn:mpeg:dash:schema:mpd:2011");
			mpdRoot.SetAttribute("xsi:schemaLocation", "urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd");
			//mpdRoot.SetAttribute("profiles", "urn:mpeg:dash:profile:isoff-on-demand:2011");
			mpdRoot.SetAttribute("profiles", "urn:mpeg:dash:profile:isoff-main:2011");
			mpdRoot.SetAttribute("type", "static");
			mpdRoot.SetAttribute("minBufferTime", "PT1.500S");
			TimeSpan durationTs = TimeSpan.FromMilliseconds(double.Parse(HttpUtility
				.ParseQueryString(player.Formats.First().Url.Split("?")[1])
				.Get("dur")?.Replace(".", "") ?? "0"));
			StringBuilder duration = new("PT");
			if (durationTs.TotalHours > 0)
				duration.Append($"{durationTs.Hours}H");
			if (durationTs.Minutes > 0)
				duration.Append($"{durationTs.Minutes}M");
			if (durationTs.Seconds > 0)
				duration.Append(durationTs.Seconds);
			mpdRoot.SetAttribute("mediaPresentationDuration", $"{duration}.{durationTs.Milliseconds}S");
			doc.AppendChild(mpdRoot);

			XmlElement period = doc.CreateElement("Period");

			period.AppendChild(doc.CreateComment("Audio Adaptation Set"));
			XmlElement audioAdaptationSet = doc.CreateElement("AdaptationSet");
			List<Format> audios;
			if (audioCodec != "all")
				audios = player.AdaptiveFormats
					.Where(x => x.AudioSampleRate.HasValue && x.FormatId != "17" &&
					            (audioCodec == null || x.AudioCodec.ToLower().Contains(audioCodec.ToLower())))
					.GroupBy(x => x.FormatNote)
					.Select(x => x.Last())
					.ToList();
			else
				audios = player.AdaptiveFormats
					.Where(x => x.AudioSampleRate.HasValue && x.FormatId != "17")
					.ToList();

			audioAdaptationSet.SetAttribute("mimeType",
				HttpUtility.ParseQueryString(audios.First().Url.Split("?")[1]).Get("mime"));
			audioAdaptationSet.SetAttribute("subsegmentAlignment", "true");
			audioAdaptationSet.SetAttribute("contentType", "audio");
			foreach (Format format in audios)
			{
				XmlElement representation = doc.CreateElement("Representation");
				representation.SetAttribute("id", format.FormatId);
				representation.SetAttribute("codecs", format.AudioCodec);
				representation.SetAttribute("startWithSAP", "1");
				representation.SetAttribute("bandwidth",
					Math.Floor((format.Filesize ?? 1) / (double)player.Duration).ToString());

				XmlElement audioChannelConfiguration = doc.CreateElement("AudioChannelConfiguration");
				audioChannelConfiguration.SetAttribute("schemeIdUri",
					"urn:mpeg:dash:23003:3:audio_channel_configuration:2011");
				audioChannelConfiguration.SetAttribute("value", "2");
				representation.AppendChild(audioChannelConfiguration);

				XmlElement baseUrl = doc.CreateElement("BaseURL");
				baseUrl.InnerText = string.IsNullOrWhiteSpace(proxyUrl) ? format.Url : $"{proxyUrl}media/{player.Id}/{format.FormatId}";
				representation.AppendChild(baseUrl);

				if (format.IndexRange != null && format.InitRange != null)
				{
					XmlElement segmentBase = doc.CreateElement("SegmentBase");
					segmentBase.SetAttribute("indexRange", $"{format.IndexRange.Start}-{format.IndexRange.End}");
					segmentBase.SetAttribute("indexRangeExact", "true");

					XmlElement initialization = doc.CreateElement("Initialization");
					initialization.SetAttribute("range", $"{format.InitRange.Start}-{format.InitRange.End}");

					segmentBase.AppendChild(initialization);
					representation.AppendChild(segmentBase);
				}

				audioAdaptationSet.AppendChild(representation);
			}

			period.AppendChild(audioAdaptationSet);

			period.AppendChild(doc.CreateComment("Video Adaptation Set"));

			List<Format> videos;
			if (videoCodec != "all")
				videos = player.AdaptiveFormats.Where(x => !x.AudioSampleRate.HasValue && x.FormatId != "17" &&
				                                           (videoCodec == null || x.VideoCodec.ToLower()
					                                           .Contains(videoCodec.ToLower())))
					.GroupBy(x => x.FormatNote)
					.Select(x => x.Last())
					.ToList();
			else
				videos = player.AdaptiveFormats.Where(x => x.Resolution != "audio only" && x.FormatId != "17").ToList();


			XmlElement videoAdaptationSet = doc.CreateElement("AdaptationSet");
			videoAdaptationSet.SetAttribute("mimeType",
				HttpUtility.ParseQueryString(videos.FirstOrDefault()?.Url?.Split("?")[1] ?? "mime=video/mp4")
					.Get("mime"));
			videoAdaptationSet.SetAttribute("subsegmentAlignment", "true");
			videoAdaptationSet.SetAttribute("contentType", "video");

			foreach (Format format in videos)
			{
				XmlElement representation = doc.CreateElement("Representation");
				representation.SetAttribute("id", format.FormatId);
				representation.SetAttribute("codecs", format.VideoCodec);
				representation.SetAttribute("startWithSAP", "1");
				string[] widthAndHeight = format.Resolution.Split("x");
				representation.SetAttribute("width", widthAndHeight[0]);
				representation.SetAttribute("height", widthAndHeight[1]);
				representation.SetAttribute("bandwidth",
					Math.Floor((format.Filesize ?? 1) / (double)player.Duration).ToString());

				XmlElement baseUrl = doc.CreateElement("BaseURL");
				baseUrl.InnerText = string.IsNullOrWhiteSpace(proxyUrl) ? format.Url : $"{proxyUrl}media/{player.Id}/{format.FormatId}";
				representation.AppendChild(baseUrl);

				if (format.IndexRange != null && format.InitRange != null)
				{
					XmlElement segmentBase = doc.CreateElement("SegmentBase");
					segmentBase.SetAttribute("indexRange", $"{format.IndexRange.Start}-{format.IndexRange.End}");
					segmentBase.SetAttribute("indexRangeExact", "true");

					XmlElement initialization = doc.CreateElement("Initialization");
					initialization.SetAttribute("range", $"{format.InitRange.Start}-{format.InitRange.End}");

					segmentBase.AppendChild(initialization);
					representation.AppendChild(segmentBase);
				}

				videoAdaptationSet.AppendChild(representation);
			}

			period.AppendChild(videoAdaptationSet);

			period.AppendChild(doc.CreateComment("Subtitle Adaptation Sets"));
			foreach (Subtitle subtitle in player.Subtitles ?? Array.Empty<Subtitle>())
			{
				period.AppendChild(doc.CreateComment(subtitle.Language));
				XmlElement adaptationSet = doc.CreateElement("AdaptationSet");
				adaptationSet.SetAttribute("mimeType", "text/vtt");
				adaptationSet.SetAttribute("lang", subtitle.Language);

				XmlElement representation = doc.CreateElement("Representation");
				representation.SetAttribute("id", $"caption_{subtitle.Language.ToLower()}");
				representation.SetAttribute("bandwidth", "256"); // ...why do we need this for a plaintext file
				
				XmlElement baseUrl = doc.CreateElement("BaseURL");
				string url = subtitle.Url;
				url = url.Replace("fmt=srv3", "fmt=vtt");
				baseUrl.InnerText = string.IsNullOrWhiteSpace(proxyUrl) ? url : $"{proxyUrl}caption/{player.Id}/{subtitle.Language}";

				representation.AppendChild(baseUrl);
				adaptationSet.AppendChild(representation);
				period.AppendChild(adaptationSet);
			}

			mpdRoot.AppendChild(period);
			return doc.OuterXml.Replace(" schemaLocation=\"", " xsi:schemaLocation=\"");
		}

		public static async Task<string> GetHlsManifest(this YoutubePlayer player, string proxyUrl)
		{
			StringBuilder sb = new StringBuilder();
			sb.AppendLine("#EXTM3U");
			sb.AppendLine("##Generated by LightTube");
			sb.AppendLine("##Video ID: " + player.Id);

			sb.AppendLine("#EXT-X-VERSION:7");
			sb.AppendLine("#EXT-X-INDEPENDENT-SEGMENTS");

			string hls = await new HttpClient().GetStringAsync(player.HlsManifestUrl);
			string[] hlsLines = hls.Split("\n");
			foreach (string line in hlsLines)
			{
				if (line.StartsWith("#EXT-X-STREAM-INF:"))
					sb.AppendLine(line);
				if (line.StartsWith("http"))
				{
					Uri u = new(line);
					sb.AppendLine($"{proxyUrl}/ytmanifest?path={HttpUtility.UrlEncode(u.PathAndQuery)}");
				}
			}

			return sb.ToString();
		}

		public static string ReadRuns(JArray runs)
		{
			string str = "";
			foreach (JToken runToken in runs ?? new JArray())
			{
				JObject run = runToken as JObject;
				if (run is null) continue;

				if (run.ContainsKey("bold"))
				{
					str += "<b>" + run["text"] + "</b>";
				}
				else if (run.ContainsKey("navigationEndpoint"))
				{
					if (run?["navigationEndpoint"]?["urlEndpoint"] is not null)
					{
						string url = run["navigationEndpoint"]?["urlEndpoint"]?["url"]?.ToString() ?? "";
						if (url.StartsWith("https://www.youtube.com/redirect"))
						{
							NameValueCollection qsl = HttpUtility.ParseQueryString(url.Split("?")[1]);
							url = qsl["url"] ?? qsl["q"];
						}

						str += $"<a href=\"{url}\">{run["text"]}</a>";
					}
					else if (run?["navigationEndpoint"]?["commandMetadata"] is not null)
					{
						string url = run["navigationEndpoint"]?["commandMetadata"]?["webCommandMetadata"]?["url"]
							?.ToString() ?? "";
						if (url.StartsWith("/"))
							url = "https://youtube.com" + url;
						str += $"<a href=\"{url}\">{run["text"]}</a>";
					}
				}
				else
				{
					str += run["text"];
				}
			}

			return str;
		}

		public static Thumbnail ParseThumbnails(JToken arg) => new()
		{
			Height = arg["height"]?.ToObject<long>() ?? -1,
			Url = arg["url"]?.ToString() ?? string.Empty,
			Width = arg["width"]?.ToObject<long>() ?? -1
		};

		public static async Task<JObject> GetAuthorizedPlayer(string id, HttpClient client)
		{
			HttpRequestMessage hrm = new(HttpMethod.Post,
				"https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8");
			
			byte[] buffer = Encoding.UTF8.GetBytes(
				RequestContext.BuildRequestContextJson(new Dictionary<string, object>
				{
					["videoId"] = id
				}));
			ByteArrayContent byteContent = new(buffer);
			byteContent.Headers.ContentType = new MediaTypeHeaderValue("application/json");
			hrm.Content = byteContent;
			
			if (UseAuthorization)
			{
				hrm.Headers.Add("Cookie", GenerateAuthCookie());
				hrm.Headers.Add("User-Agent", "Mozilla/5.0 (X11; Linux x86_64; rv:96.0) Gecko/20100101 Firefox/96.0");
				hrm.Headers.Add("Authorization", GenerateAuthHeader());
				hrm.Headers.Add("X-Origin", "https://www.youtube.com");
				hrm.Headers.Add("X-Youtube-Client-Name", "1");
				hrm.Headers.Add("X-Youtube-Client-Version", "2.20210721.00.00");
				hrm.Headers.Add("Accept-Language", "en-US;q=0.8,en;q=0.7");
				hrm.Headers.Add("Origin", "https://www.youtube.com");
				hrm.Headers.Add("Referer", "https://www.youtube.com/watch?v=" + id);
			}

			HttpResponseMessage ytPlayerRequest = await client.SendAsync(hrm);
			return JObject.Parse(await ytPlayerRequest.Content.ReadAsStringAsync());
		}

		internal static string GenerateAuthHeader()
		{
			if (!UseAuthorization) return "None none";
			long timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
			string hashInput = timestamp + " " + Sapisid + " https://www.youtube.com";
			string hashDigest = GenerateSha1Hash(hashInput);
			return $"SAPISIDHASH {timestamp}_{hashDigest}";
		}

		internal static string GenerateAuthCookie() => UseAuthorization ? $"SAPISID={Sapisid}; __Secure-3PAPISID={Sapisid}; __Secure-3PSID={Psid};" : ";";

		private static string GenerateSha1Hash(string input)
		{
			using SHA1Managed sha1 = new();
			byte[] hash = sha1.ComputeHash(Encoding.UTF8.GetBytes(input));
			StringBuilder sb = new(hash.Length * 2);
			foreach (byte b in hash) sb.Append(b.ToString("X2"));
			return sb.ToString();
		}

		public static string GetExtension(this Format format)
		{
			if (format.VideoCodec != "none") return "mp4";
			else
				switch (format.FormatId)
				{
					case "139":
					case "140":
					case "141":
					case "256":
					case "258":
					case "327":
						return "mp3";
					case "249":
					case "250":
					case "251":
					case "338":
						return "opus";
				}

			return "mp4";
		}

		public static void SetAuthorization(bool canUseAuthorizedEndpoints, string sapisid, string psid)
		{
			UseAuthorization = canUseAuthorizedEndpoints;
			Sapisid = sapisid;
			Psid = psid;
		}

		internal static string GetCodec(string mimetypeString, bool audioCodec)
		{
			string acodec = "";
			string vcodec = "";

			Match match = Regex.Match(mimetypeString, "codecs=\"([\\s\\S]+?)\"");

			string[] g = match.Groups[1].ToString().Split(",");
			foreach (string codec in g)
			{
				switch (codec.Split(".")[0].Trim())
				{
					case "avc1":
					case "av01":
					case "vp9":
					case "mp4v":
						vcodec = codec;
						break;
					case "mp4a":
					case "opus":
						acodec = codec;
						break;
					default:
						Console.WriteLine("Unknown codec type: " + codec.Split(".")[0].Trim());
						break;
				}
			}

			return (audioCodec ? acodec : vcodec).Trim();
		}

		public static string GetFormatName(JToken formatToken)
		{
			string format = formatToken["itag"]?.ToString() switch
			{
				"160" => "144p",
				"278" => "144p",
				"330" => "144p",
				"394" => "144p",
				"694" => "144p",
				
				"133" => "240p",
				"242" => "240p",
				"331" => "240p",
				"395" => "240p",
				"695" => "240p",
				
				"134" => "360p",
				"243" => "360p",
				"332" => "360p",
				"396" => "360p",
				"696" => "360p",

				"135" => "480p",
				"244" => "480p",
				"333" => "480p",
				"397" => "480p",
				"697" => "480p",
				
				"136" => "720p",
				"247" => "720p",
				"298" => "720p",
				"302" => "720p",
				"334" => "720p",
				"398" => "720p",
				"698" => "720p",
				
				"137" => "1080p",
				"299" => "1080p",
				"248" => "1080p",
				"303" => "1080p",
				"335" => "1080p",
				"399" => "1080p",
				"699" => "1080p",
				
				"264" => "1440p",
				"271" => "1440p",
				"304" => "1440p",
				"308" => "1440p",
				"336" => "1440p",
				"400" => "1440p",
				"700" => "1440p",
				
				"266" => "2160p",
				"305" => "2160p",
				"313" => "2160p",
				"315" => "2160p",
				"337" => "2160p",
				"401" => "2160p",
				"701" => "2160p",
				
				"138" => "4320p",
				"272" => "4320p",
				"402" => "4320p",
				"571" => "4320p",
				
				var _ => $"{formatToken["height"]}p",
			};

			return format == "p" 
				? formatToken["audioQuality"]?.ToString().ToLowerInvariant()
				: (formatToken["fps"]?.ToObject<int>() ?? 0) > 30 
					? $"{format}{formatToken["fps"]}" 
					: format;
		}
	}
}