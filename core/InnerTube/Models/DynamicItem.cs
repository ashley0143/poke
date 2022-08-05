using System;
using System.Xml;
using System.Xml.Linq;

namespace InnerTube.Models
{
	public class DynamicItem
	{
		public string Id;
		public string Title;
		public Thumbnail[] Thumbnails;

		public virtual XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("DynamicItem");
			item.SetAttribute("id", Id);

			XmlElement title = doc.CreateElement("Title");
			title.InnerText = Title;
			item.AppendChild(title);

			foreach (Thumbnail t in Thumbnails ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				item.AppendChild(thumbnail);
			}

			return item;
		}
	}

	public class VideoItem : DynamicItem
	{
		public string UploadedAt;
		public long Views;
		public Channel Channel;
		public string Duration;
		public string Description;

		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Video");
			item.SetAttribute("id", Id);
			item.SetAttribute("duration", Duration);
			item.SetAttribute("views", Views.ToString());
			item.SetAttribute("uploadedAt", UploadedAt);

			XmlElement title = doc.CreateElement("Title");
			title.InnerText = Title;
			item.AppendChild(title);
			if (Channel is not null)
				item.AppendChild(Channel.GetXmlElement(doc));

			foreach (Thumbnail t in Thumbnails ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				item.AppendChild(thumbnail);
			}

			if (!string.IsNullOrWhiteSpace(Description))
			{
				XmlElement description = doc.CreateElement("Description");
				description.InnerText = Description;
				item.AppendChild(description);
			}

			return item;
		}
	}

	public class PlaylistItem : DynamicItem
	{
		public int VideoCount;
		public string FirstVideoId;
		public Channel Channel;

		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Playlist");
			item.SetAttribute("id", Id);
			item.SetAttribute("videoCount", VideoCount.ToString());
			item.SetAttribute("firstVideoId", FirstVideoId);

			XmlElement title = doc.CreateElement("Title");
			title.InnerText = Title;
			item.AppendChild(title);
			item.AppendChild(Channel.GetXmlElement(doc));

			foreach (Thumbnail t in Thumbnails ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				item.AppendChild(thumbnail);
			}

			return item;
		}
	}

	public class RadioItem : DynamicItem
	{
		public string FirstVideoId;
		public Channel Channel;

		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Radio");
			item.SetAttribute("id", Id);
			item.SetAttribute("firstVideoId", FirstVideoId);

			XmlElement title = doc.CreateElement("Title");
			title.InnerText = Title;
			item.AppendChild(title);
			item.AppendChild(Channel.GetXmlElement(doc));

			foreach (Thumbnail t in Thumbnails ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				item.AppendChild(thumbnail);
			}

			return item;
		}
	}

	public class ChannelItem : DynamicItem
	{
		public string Url;
		public string Description;
		public long VideoCount;
		public string Subscribers;

		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Channel");
			item.SetAttribute("id", Id);
			item.SetAttribute("videoCount", VideoCount.ToString());
			item.SetAttribute("subscribers", Subscribers);
			if (!string.IsNullOrWhiteSpace(Url))
				item.SetAttribute("customUrl", Url);

			XmlElement title = doc.CreateElement("Name");
			title.InnerText = Title;
			item.AppendChild(title);

			XmlElement description = doc.CreateElement("Description");
			description.InnerText = Description;
			item.AppendChild(description);

			foreach (Thumbnail t in Thumbnails ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Avatar");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				item.AppendChild(thumbnail);
			}

			return item;
		}
	}

	public class ContinuationItem : DynamicItem
	{
		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Continuation");
			item.SetAttribute("key", Id);
			return item;
		}
	}

	public class ShelfItem : DynamicItem
	{
		public DynamicItem[] Items;
		public int CollapsedItemCount;
		public BadgeItem[] Badges;

		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Shelf");
			item.SetAttribute("title", Title);
			item.SetAttribute("collapsedItemCount", CollapsedItemCount.ToString());

			foreach (Thumbnail t in Thumbnails ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				item.AppendChild(thumbnail);
			}

			if (Badges.Length > 0)
			{
				XmlElement badges = doc.CreateElement("Badges");
				foreach (BadgeItem badge in Badges) badges.AppendChild(badge.GetXmlElement(doc));
				item.AppendChild(badges);
			}

			XmlElement items = doc.CreateElement("Items");
			foreach (DynamicItem dynamicItem in Items) items.AppendChild(dynamicItem.GetXmlElement(doc));
			item.AppendChild(items);

			return item;
		}
	}

	public class HorizontalCardListItem : DynamicItem
	{
		public DynamicItem[] Items;

		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("CardList");
			item.SetAttribute("title", Title);

			foreach (DynamicItem dynamicItem in Items) item.AppendChild(dynamicItem.GetXmlElement(doc));

			return item;
		}
	}

	public class CardItem : DynamicItem
	{
		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Card");
			item.SetAttribute("title", Title);

			foreach (Thumbnail t in Thumbnails ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				item.AppendChild(thumbnail);
			}

			return item;
		}
	}

	public class PlaylistVideoItem : DynamicItem
	{
		public long Index;
		public Channel Channel;
		public string Duration;

		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Video");
			item.SetAttribute("id", Id);
			item.SetAttribute("index", Index.ToString());
			item.SetAttribute("duration", Duration);

			XmlElement title = doc.CreateElement("Title");
			title.InnerText = Title;
			item.AppendChild(title);
			item.AppendChild(Channel.GetXmlElement(doc));

			foreach (Thumbnail t in Thumbnails ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				item.AppendChild(thumbnail);
			}

			return item;
		}
	}

	public class ItemSectionItem : DynamicItem
	{
		public DynamicItem[] Contents;

		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement section = doc.CreateElement("ItemSection");
			foreach (DynamicItem item in Contents) section.AppendChild(item.GetXmlElement(doc));
			return section;
		}
	}

	public class MessageItem : DynamicItem
	{
		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement message = doc.CreateElement("Message");
			message.InnerText = Title;
			return message;
		}
	}

	public class ChannelAboutItem : DynamicItem
	{
		public string Description;
		public string Country;
		public string Joined;
		public string ViewCount;
		
		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement about = doc.CreateElement("About");
			XmlElement description = doc.CreateElement("Description");
			description.InnerText = Description;
			about.AppendChild(description);
			XmlElement country = doc.CreateElement("Location");
			country.InnerText = Country;
			about.AppendChild(country);
			XmlElement joined = doc.CreateElement("Joined");
			joined.InnerText = Joined;
			about.AppendChild(joined);
			XmlElement viewCount = doc.CreateElement("ViewCount");
			viewCount.InnerText = ViewCount;
			about.AppendChild(viewCount);
			return about;
		}
	}

	public class BadgeItem : DynamicItem
	{
		public string Style;

		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement badge = doc.CreateElement("Badge");
			badge.SetAttribute("style", Style);
			badge.InnerText = Title;
			return badge;
		}
	}

	public class StationItem : DynamicItem
	{
		public int VideoCount;
		public string FirstVideoId;
		public string Description;

		public override XmlElement GetXmlElement(XmlDocument doc)
		{
			XmlElement item = doc.CreateElement("Station");
			item.SetAttribute("id", Id);
			item.SetAttribute("videoCount", VideoCount.ToString());
			item.SetAttribute("firstVideoId", FirstVideoId);

			XmlElement title = doc.CreateElement("Title");
			title.InnerText = Title;
			item.AppendChild(title);

			XmlElement description = doc.CreateElement("Description");
			description.InnerText = Description;
			item.AppendChild(description);

			foreach (Thumbnail t in Thumbnails ?? Array.Empty<Thumbnail>()) 
			{
				XmlElement thumbnail = doc.CreateElement("Thumbnail");
				thumbnail.SetAttribute("width", t.Width.ToString());
				thumbnail.SetAttribute("height", t.Height.ToString());
				thumbnail.InnerText = t.Url;
				item.AppendChild(thumbnail);
			}

			return item;
		}
	}
}