using System;
using System.Xml;
using Newtonsoft.Json;

namespace InnerTube.Models
{
	public class YoutubePlayer
	{
		public string Id { get; set; }
		public string Title { get; set; }
		public string Description { get; set; }
		public string[] Tags { get; set; }
		public Channel Channel { get; set; }
		public long? Duration { get; set; }
		public bool IsLive { get; set; }
		public Chapter[] Chapters { get; set; }
		public Thumbnail[] Thumbnails { get; set; }
		public Format[] Formats { get; set; }
		public Format[] AdaptiveFormats { get; set; }
		public string HlsManifestUrl { get; set; }
		public Subtitle[] Subtitles { get; set; }
		public string[] Storyboards { get; set; }
		public string ExpiresInSeconds { get; set; }
		public string ErrorMessage { get; set; }

		public string GetHtmlDescription()
		{
			return Utils.GetHtmlDescription(Description);
		}

		public XmlDocument GetXmlDocument()
		{
			XmlDocument doc = new();
			if (!string.IsNullOrWhiteSpace(ErrorMessage))
			{
				XmlElement error = doc.CreateElement("Error");
				error.InnerText = ErrorMessage;
				doc.AppendChild(error);
			}
			else
			{
				XmlElement player = doc.CreateElement("Player");
				player.SetAttribute("id", Id);
				player.SetAttribute("duration", Duration.ToString());
				player.SetAttribute("isLive", IsLive.ToString());
				player.SetAttribute("expiresInSeconds", ExpiresInSeconds);

				XmlElement title = doc.CreateElement("Title");
				title.InnerText = Title;
				player.AppendChild(title);

				XmlElement description = doc.CreateElement("Description");
				description.InnerText = Description;
				player.AppendChild(description);

				XmlElement tags = doc.CreateElement("Tags");
				foreach (string tag in Tags ?? Array.Empty<string>())
				{
					XmlElement tagElement = doc.CreateElement("Tag");
					tagElement.InnerText = tag;
					tags.AppendChild(tagElement);
				}
				player.AppendChild(tags);

				player.AppendChild(Channel.GetXmlElement(doc));

				XmlElement thumbnails = doc.CreateElement("Thumbnails");
				foreach (Thumbnail t in Thumbnails) 
				{
					XmlElement thumbnail = doc.CreateElement("Thumbnail");
					thumbnail.SetAttribute("width", t.Width.ToString());
					thumbnail.SetAttribute("height", t.Height.ToString());
					thumbnail.InnerText = t.Url;
					thumbnails.AppendChild(thumbnail);
				}
				player.AppendChild(thumbnails);

				XmlElement formats = doc.CreateElement("Formats");
				foreach (Format f in Formats ?? Array.Empty<Format>()) formats.AppendChild(f.GetXmlElement(doc));
				player.AppendChild(formats);

				XmlElement adaptiveFormats = doc.CreateElement("AdaptiveFormats");
				foreach (Format f in AdaptiveFormats ?? Array.Empty<Format>()) adaptiveFormats.AppendChild(f.GetXmlElement(doc));
				player.AppendChild(adaptiveFormats);

				XmlElement storyboards = doc.CreateElement("Storyboards");
				foreach (string s in Storyboards) 
				{
					XmlElement storyboard = doc.CreateElement("Storyboard");
					storyboard.InnerText = s;
					storyboards.AppendChild(storyboard);
				}
				player.AppendChild(storyboards);

				XmlElement subtitles = doc.CreateElement("Subtitles");
				foreach (Subtitle s in Subtitles ?? Array.Empty<Subtitle>()) subtitles.AppendChild(s.GetXmlElement(doc));
				player.AppendChild(subtitles);

				doc.AppendChild(player);
			}

			return doc;
		}
	}

	public class Chapter
	{
		[JsonProperty("title")] public string Title { get; set; }
		[JsonProperty("start_time")] public long StartTime { get; set; }
		[JsonProperty("end_time")] public long EndTime { get; set; }
	}

	public class Format
	{
		[JsonProperty("format")] public string FormatName { get; set; }
		[JsonProperty("format_id")] public string FormatId { get; set; }
		[JsonProperty("format_note")] public string FormatNote { get; set; }
		[JsonProperty("filesize")] public long? Filesize { get; set; }
		[JsonProperty("quality")] public long Quality { get; set; }
		[JsonProperty("bitrate")] public double Bitrate { get; set; }
		[JsonProperty("audio_codec")] public string AudioCodec { get; set; }
		[JsonProperty("video_codec")] public string VideoCodec { get; set; }
		[JsonProperty("audio_sample_rate")] public long? AudioSampleRate { get; set; }
		[JsonProperty("resolution")] public string Resolution { get; set; }
		[JsonProperty("url")] public string Url { get; set; }
		[JsonProperty("init_range")] public Range InitRange { get; set; }
		[JsonProperty("index_range")] public Range IndexRange { get; set; }

		public XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement format = doc.CreateElement("Format");

			format.SetAttribute("id", FormatId);
			format.SetAttribute("label", FormatName);
			format.SetAttribute("filesize", Filesize.ToString());
			format.SetAttribute("quality", Bitrate.ToString());
			format.SetAttribute("audioCodec", AudioCodec);
			format.SetAttribute("videoCodec", VideoCodec);
			if (AudioSampleRate != null)
				format.SetAttribute("audioSampleRate", AudioSampleRate.ToString());
			else
				format.SetAttribute("resolution", Resolution);

			XmlElement url = doc.CreateElement("URL");
			url.InnerText = Url;
			format.AppendChild(url);

			if (InitRange != null && IndexRange != null)
			{
				XmlElement initRange = doc.CreateElement("InitRange");
				initRange.SetAttribute("start", InitRange.Start);
				initRange.SetAttribute("end", InitRange.End);
				format.AppendChild(initRange);

				XmlElement indexRange = doc.CreateElement("IndexRange");
				indexRange.SetAttribute("start", IndexRange.Start);
				indexRange.SetAttribute("end", IndexRange.End);
				format.AppendChild(indexRange);
			}

			return format;
		}
	}

	public class Range
	{
		[JsonProperty("start")] public string Start { get; set; }
		[JsonProperty("end")] public string End { get; set; }
		
		public Range(string start, string end)
		{
			Start = start;
			End = end;
		}
	}

	public class Channel
	{
		[JsonProperty("name")] public string Name { get; set; }
		[JsonProperty("id")] public string Id { get; set; }
		[JsonProperty("subscriberCount")] public string SubscriberCount { get; set; }
		[JsonProperty("avatars")] public Thumbnail[] Avatars { get; set; }

		public XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement channel = doc.CreateElement("Channel");
			channel.SetAttribute("id", Id);
			if (!string.IsNullOrWhiteSpace(SubscriberCount)) 
				channel.SetAttribute("subscriberCount", SubscriberCount);

			XmlElement name = doc.CreateElement("Name");
			name.InnerText = Name;
			channel.AppendChild(name);

			foreach (Thumbnail avatarThumb in Avatars ?? Array.Empty<Thumbnail>())
			{
				XmlElement avatar = doc.CreateElement("Avatar");
				avatar.SetAttribute("width", avatarThumb.Width.ToString());
				avatar.SetAttribute("height", avatarThumb.Height.ToString());
				avatar.InnerText = avatarThumb.Url;
				channel.AppendChild(avatar);
			}

			return channel;
		}
	}

	public class Subtitle
	{
		[JsonProperty("ext")] public string Ext { get; set; }
		[JsonProperty("name")] public string Language { get; set; }
		[JsonProperty("url")] public string Url { get; set; }

		public XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement subtitle = doc.CreateElement("Subtitle");
			subtitle.SetAttribute("ext", Ext);
			subtitle.SetAttribute("language", Language);
			subtitle.InnerText = Url;
			return subtitle;
		}
	}

	public class Thumbnail
	{
		[JsonProperty("height")] public long Height { get; set; }
		[JsonProperty("url")] public string Url { get; set; }
		[JsonProperty("width")] public long Width { get; set; }
	}
}