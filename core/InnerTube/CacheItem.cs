using System;

namespace InnerTube
{
	public class CacheItem<T>
	{
		public T Item;
		public DateTimeOffset ExpireTime;

		public CacheItem(T item, TimeSpan expiresIn)
		{
			Item = item;
			ExpireTime = DateTimeOffset.Now.Add(expiresIn);
		}
	}
}