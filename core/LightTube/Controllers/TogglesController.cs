using System;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace LightTube.Controllers
{
	[Route("/toggles")]
	public class TogglesController : Controller
	{
		[Route("theme")]
		public IActionResult ToggleTheme(string redirectUrl)
		{
			if (Request.Cookies.TryGetValue("theme", out string theme))
				Response.Cookies.Append("theme", theme switch
				{
					"light" => "dark",
					"dark" => "light",
					var _ => "dark"
				}, new CookieOptions
				{
					Expires = DateTimeOffset.MaxValue
				});
			else
				Response.Cookies.Append("theme", "light");

			return Redirect(redirectUrl);
		}

		[Route("compatibility")]
		public IActionResult ToggleCompatibility(string redirectUrl)
		{
			if (Request.Cookies.TryGetValue("compatibility", out string compatibility))
				Response.Cookies.Append("compatibility", compatibility switch
				{
					"true" => "false",
					"false" => "true",
					var _ => "true"
				}, new CookieOptions
				{
					Expires = DateTimeOffset.MaxValue
				});
			else
				Response.Cookies.Append("compatibility", "true");

			return Redirect(redirectUrl);
		}

		[Route("collapse_guide")]
		public IActionResult ToggleCollapseGuide(string redirectUrl)
		{
			if (Request.Cookies.TryGetValue("minmode", out string minmode))
				Response.Cookies.Append("minmode", minmode switch
				{
					"true" => "false",
					"false" => "true",
					var _ => "true"
				}, new CookieOptions
				{
					Expires = DateTimeOffset.MaxValue
				});
			else
				Response.Cookies.Append("minmode", "true");

			return Redirect(redirectUrl);
		}
	}
}