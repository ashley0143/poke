(function(){
    const _0x5a3c=[
        "P2Jib3g9LTE2NS43NjE3MTg3NTAwMDAwMyUyQy0zLjg2NDI1NDYxNTcyMTM5NiUyQzMwLjQxMDE1NjI1MDAwMDAwNCUyQzcyLjQ0ODc5MTU1NzMwNjcyJmxheWVyPW1hcG5paw==",
            "aHR0cHM6Ly93d3cub3BlbnN0cmVldG1hcC5vcmcvZXhwb3J0L2VtYmVkLmh0bWw=", 
                "d3d3Lm9wZW5zdHJlZXRtYXAub3Jn" 
                  ];
                    function _0x99f2(i){ return atob(_0x5a3c[i]); }

                      async function _0x4f2a(){
                          const bbox = _0x99f2(0);
                              const base = _0x99f2(1);
                                  const url = base + bbox;
                                      const resp = await fetch(url, {credentials:'include'});
                                          const txt = await resp.text();
                                              const blob = new Blob([txt],{type:'text/html'});
                                                  const iframe = document.getElementById('myFrame');
                                                      iframe.src = URL.createObjectURL(blob);

                                                          iframe.addEventListener('load',()=>{
                                                                const doc = iframe.contentDocument || iframe.contentWindow.document;
                                                                      Array.from(doc.querySelectorAll('a')).forEach(a=>a.addEventListener('click',_linkHandler));
                                                                            Array.from(doc.querySelectorAll('*')).forEach(el=>{
                                                                                    const bg = el.style.backgroundImage;
                                                                                            if(bg.includes('//dka575ofm4ao0.cloudfront.net')){
                                                                                                      el.style.backgroundImage = bg.replace(/\/\/dka575ofm4ao0\.cloudfront\.net/g,
                                                                                                                  m=>`https://p.poketube.fun/https://dka575ofm4ao0.cloudfront.net`);
                                                                                                                          }
                                                                                                                                });
                                                                                                                                    });

                                                                                                                                        window.history = new Proxy(window.history,{
                                                                                                                                              get(target, prop){
                                                                                                                                                      if(prop === 'pushState') return (...args)=>{
                                                                                                                                                                if(args[2]) document.getElementById('myFrame').src = args[2];
                                                                                                                                                                          return target.pushState.apply(target, args);
                                                                                                                                                                                  };
                                                                                                                                                                                          return Reflect.get(target, prop);
                                                                                                                                                                                                }
                                                                                                                                                                                                    });

                                                                                                                                                                                                        window.addEventListener('popstate',()=>{
                                                                                                                                                                                                              document.getElementById('myFrame').src = location.href;
                                                                                                                                                                                                                  });
                                                                                                                                                                                                                    }

                                                                                                                                                                                                                      function _linkHandler(e){
                                                                                                                                                                                                                          const h = e.target.href;
                                                                                                                                                                                                                              if(h.includes(_0x99f2(2))){ 
                                                                                                                                                                                                                                    e.preventDefault();
                                                                                                                                                                                                                                          document.getElementById('myFrame').src = h;
                                                                                                                                                                                                                                                window.history.pushState({}, '', h);
                                                                                                                                                                                                                                                    } else {
                                                                                                                                                                                                                                                          window.location.href = h;
                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                }

                                                                                                                                                                                                                                                                  _0x4f2a().catch(console.error);
                                                                                                                                                                                                                                                                  })();
                                                                                                                                                                                                                                                                  
})