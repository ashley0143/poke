using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace LightTube
{
	public class Program
	{
		public static void Main(string[] args)
		{
			Configuration.LoadConfiguration();
			InnerTube.Utils.SetAuthorization(Configuration.Instance.Credentials.CanUseAuthorizedEndpoints(),
				Configuration.Instance.Credentials.Sapisid, Configuration.Instance.Credentials.Psid);
			CreateHostBuilder(args).Build().Run();
		}

		public static IHostBuilder CreateHostBuilder(string[] args) =>
			Host.CreateDefaultBuilder(args)
				.ConfigureWebHostDefaults(webBuilder => { webBuilder.UseStartup<Startup>(); });
	}
}