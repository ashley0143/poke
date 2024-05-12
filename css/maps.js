    var bbox = "?bbox=-165.76171875000003%2C-3.864254615721396%2C30.410156250000004%2C72.44879155730672&amp;layer=mapnik"
     var iframe = document.getElementById('myFrame');
    iframe.src=`https://www.openstreetmap.org/export/embed.html${bbox}`
    iframe.addEventListener('load', function() {
      var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
      var links = iframeDocument.getElementsByTagName('a');
      for (var i = 0; i < links.length; i++) {
        links[i].addEventListener('click', function(event) {
          var url = event.target.href;
          if (url.includes('www.openstreetmap.org')) {
            event.preventDefault();
            iframe.src = url;
            window.history.pushState(null, '', url);
          } else {
            window.location.href = url;
          }
        });
      }
    });

    window.onpopstate = function(event) {
      iframe.src = window.location.href;
    };
    
       iframe.addEventListener('load', function() {
      var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
      var elements = iframeDocument.querySelectorAll('[style*="//dka575ofm4ao0.cloudfront.net"]');
      for (var i = 0; i < elements.length; i++) {
        var style = elements[i].style.backgroundImage;
        var newStyle = style.replace('//dka575ofm4ao0.cloudfront.net', 'https://p.poketube.fun/https://dka575ofm4ao0.cloudfront.net');
        elements[i].style.backgroundImage = newStyle;
      }
    });
