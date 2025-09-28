 const $=s=>document.querySelector(s);const $$=s=>[...document.querySelectorAll(s)];
  const units=JSON.parse(localStorage.getItem('pokeweather:units')||'{}');
  let state={lat:null,lon:null,name:null,units:units.units||'metric'};
  const btnUnits=$('#btnUnits'); btnUnits.textContent=state.units==='metric'?"°C":"°F";

  const weatherText=(c)=>{
    if([0].includes(c))return"Clear sky";
    if([1].includes(c))return"Mostly clear";
    if([2].includes(c))return"Partly cloudy";
    if([3].includes(c))return"Overcast";
    if([45,48].includes(c))return"Fog";
    if([51,53,55].includes(c))return"Drizzle";
    if([56,57].includes(c))return"Freezing drizzle";
    if([61,63,65].includes(c))return"Rain";
    if([66,67].includes(c))return"Freezing rain";
    if([71,73,75].includes(c))return"Snow";
    if([77].includes(c))return"Snow grains";
    if([80,81,82].includes(c))return"Showers";
    if([85,86].includes(c))return"Snow showers";
    if([95].includes(c))return"Thunderstorm";
    if([96,99].includes(c))return"Storm & hail";return"—"}
  const weatherIcon=(c,isDay)=>{
    if(c===0)return isDay?"☀️":"🌙";
    if([1,2].includes(c))return isDay?"🌤️":"☁️";
    if([3].includes(c))return"☁️";
    if([45,48].includes(c))return"🌫️";
    if([51,53,55,80,81,82].includes(c))return"🌦️";
    if([61,63,65].includes(c))return"🌧️";
    if([66,67].includes(c))return"🌧️❄️";
    if([71,73,75,77,85,86].includes(c))return"❄️";
    if([95,96,99].includes(c))return"⛈️";return"☁️";
  };
  const fmt=(n,u='')=>n==null?'—':`${Math.round(n)}${u}`;
  const fmtTime=(s)=>new Date(s).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  const fmtDay=(s)=>new Date(s).toLocaleDateString([], {weekday:'short',month:'short',day:'numeric'});

  async function searchPlaces(q){
    if(!q) return [];
    const url=`https://nominatim.openstreetmap.org/search?format=json&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`;
    const r=await fetch(url,{headers:{'Accept-Language':navigator.language}});
    if(!r.ok) return [];
    return r.json();
  }

  function applyUnits(){
    btnUnits.textContent=state.units==='metric'?"°C":"°F";
    // Keep SSR search form in sync so non-JS round-trips preserve units
    const uHidden=document.getElementById('unitsHidden');
    if(uHidden) uHidden.value = state.units === 'metric' ? 'metric' : 'imperial';
    if(state.lat&&state.lon) loadWeather(state.lat,state.lon,state.name);
    localStorage.setItem('pokeweather:units',JSON.stringify({units:state.units}))
  }

  async function loadWeather(lat,lon,name){
    state.lat=+lat;state.lon=+lon;state.name=name||state.name||`${lat.toFixed(3)},${lon.toFixed(3)}`;
    $('#locChip').textContent=state.name;
    const tu=state.units==='metric'?"celsius":"fahrenheit";
    const wu=state.units==='metric'?"kmh":"mph";
    const url = new URL("/api/weather", location.origin);
    url.search={}.toString();
    url.searchParams.set('latitude',lat);url.searchParams.set('longitude',lon);
    url.searchParams.set('current','temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl');
    url.searchParams.set('hourly','temperature_2m,apparent_temperature,precipitation_probability,precipitation,weather_code,wind_speed_10m');
    url.searchParams.set('daily','weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max');
    url.searchParams.set('timezone','auto');url.searchParams.set('forecast_days','7');
    url.searchParams.set('temperature_unit',tu);url.searchParams.set('windspeed_unit',wu);

    $('.current').classList.add('loading');
    try{
      const res=await fetch(url.toString());
      if(!res.ok) throw new Error('Weather error');
      const data=await res.json();
      localStorage.setItem('pokeweather:last',JSON.stringify({when:Date.now(),state,data}));
      render(data);
    }catch(e){
      const cached=JSON.parse(localStorage.getItem('pokeweather:last')||'null');
      if(cached){render(cached.data);}
      else alert('Could not load weather.');
    }finally{$('.current').classList.remove('loading')}
  }

  function render(d){
    const c=d.current; const daily=d.daily; const hourly=d.hourly;
    $('#currIcon').textContent=weatherIcon(c.weather_code,c.is_day);
    $('#currTemp').textContent=fmt(c.temperature_2m,'°');
    $('#currDesc').textContent=weatherText(c.weather_code);
    $('#currFeels').textContent=fmt(c.apparent_temperature,'°');
    $('#currWind').textContent=`${fmt(c.wind_speed_10m)} ${state.units==='metric'?'km/h':'mph'} ↗ ${c.wind_direction_10m??'—'}°`;
    $('#currHum').textContent=fmt(c.relative_humidity_2m,'%');
    $('#currPress').textContent=fmt(c.pressure_msl,' hPa');
    $('#sunrise').textContent=fmtTime(daily.sunrise[0]);
    $('#sunset').textContent=fmtTime(daily.sunset[0]);
    $('#uv').textContent=(daily.uv_index_max?.[0]??'—');
    const nowIndex=hourly.time.findIndex(t=>Date.parse(t)>Date.now());
    const popNext=hourly.precipitation_probability?.[nowIndex]??hourly.precipitation_probability?.[0]??null;
    $('#pop').textContent=popNext==null?'—':popNext+"%";

    // hourly tiles
    const H=$('#hours'); H.innerHTML='';
    const start=nowIndex>0?nowIndex-1:0; const end=Math.min(start+24,hourly.time.length);
    for(let i=start;i<end;i++){
      const el=document.createElement('div');
      el.className='hour';
      const t=new Date(hourly.time[i]).toLocaleTimeString([], {hour:'2-digit'});
      el.innerHTML=`<div>${t}</div><div style="font-size:22px">${weatherIcon(hourly.weather_code[i],1)}</div><div class="t">${fmt(hourly.temperature_2m[i],'°')}</div><div style="color:var(--muted);font-size:12px">${(hourly.precipitation_probability?.[i]??0)}%</div>`;
      H.appendChild(el);
    }

    // chart
    drawChart($('#chart'), hourly.time.slice(start,end).map(t=>new Date(t)), hourly.temperature_2m.slice(start,end));

    // 7-day
    const D=$('#days'); D.innerHTML='';
    for(let i=0;i<daily.time.length;i++){
      const row=document.createElement('div'); row.className='day';
      const dt=fmtDay(daily.time[i]);
      const hi=fmt(daily.temperature_2m_max[i],'°');
      const lo=fmt(daily.temperature_2m_min[i],'°');
      row.innerHTML=`<div class="row" style="gap:10px"><div style="font-size:22px">${weatherIcon(daily.weather_code[i],1)}</div><div>${dt}</div></div><div class="row"><div class="hi">${hi}</div><div class="lo">${lo}</div></div><div style="text-align:right;color:var(--muted)">${weatherText(daily.weather_code[i])}</div>`;
      D.appendChild(row);
    }
  }

  function drawChart(canvas, xs, ys){
    const ctx=canvas.getContext('2d');
    const w=canvas.width=canvas.clientWidth*2; const h=canvas.height=canvas.clientHeight*2; ctx.scale(2,2);
    const min=Math.min(...ys), max=Math.max(...ys), pad=8; const xstep=(canvas.clientWidth-2*pad)/(ys.length-1);
    const ymap=v=>{if(max===min) return canvas.clientHeight/2; const t=(v-min)/(max-min); return canvas.clientHeight-pad - t*(canvas.clientHeight-2*pad)};
    ctx.clearRect(0,0,canvas.clientWidth,canvas.clientHeight);
    ctx.lineWidth=2; ctx.strokeStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent');
    ctx.beginPath(); ctx.moveTo(pad, ymap(ys[0]));
    for(let i=1;i<ys.length;i++){ctx.lineTo(pad+i*xstep, ymap(ys[i]));}
    ctx.stroke();
    ctx.fillStyle=getComputedStyle(document.documentElement).getPropertyValue('--accent');
    ys.forEach((v,i)=>{ctx.beginPath();ctx.arc(pad+i*xstep, ymap(v), 2.5, 0, Math.PI*2);ctx.fill()});
  }

  // Keep units in sync for SSR form and client
  btnUnits.addEventListener('click',()=>{
    state.units=state.units==='metric'?'imperial':'metric';
    applyUnits();
  });

  $('#btnTheme').addEventListener('click',()=>{
    const dark=document.documentElement.style.getPropertyValue('--bg')==='#0b0f16';
    if(dark){document.documentElement.style.setProperty('--bg','#fbfbfe');document.documentElement.style.setProperty('--fg','#0b1020');document.documentElement.style.setProperty('--muted','#5b6b87');document.documentElement.style.setProperty('--card','#ffffff');document.documentElement.style.setProperty('--ring','#0b102018');}
    else{document.documentElement.style.setProperty('--bg','#0b0f16');document.documentElement.style.setProperty('--fg','#eef3ff');document.documentElement.style.setProperty('--muted','#a7b4cc');document.documentElement.style.setProperty('--card','#0f1624');document.documentElement.style.setProperty('--ring','#ffffff22');}
  });

  $('#btnGeo').addEventListener('click',()=>{
    if(!navigator.geolocation){alert('Geolocation not supported');return}
    navigator.geolocation.getCurrentPosition(p=>{
      reverseName(p.coords.latitude,p.coords.longitude).then(n=>loadWeather(p.coords.latitude,p.coords.longitude,n));
    },e=>alert('Location denied'))
  });

  function reverseName(lat,lon){
    const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
    return fetch(u).then(r=>r.ok?r.json():null).then(j=>j?.display_name?.split(',').slice(0,2).join(', ')||`${lat.toFixed(3)},${lon.toFixed(3)}`);
  }

  const suggest=$('#suggest');
  $('#q').addEventListener('input', debounce(async(e)=>{
    const v=e.target.value.trim(); if(!v){suggest.style.display='none'; return}
    const list=await searchPlaces(v); suggest.innerHTML='';
    list.forEach(item=>{
      const b=document.createElement('button'); b.type='button';
      const label=item.display_name.split(',').slice(0,3).join(', ');
      b.textContent=label; b.addEventListener('click',()=>{selectPlace(item)});
      suggest.appendChild(b);
    });
    if(list.length){const r=$('#q').getBoundingClientRect(); suggest.style.minWidth=r.width+'px'; suggest.style.display='block'} else suggest.style.display='none';
  },300));

  function selectPlace(item){
    suggest.style.display='none';
    $('#q').value=item.display_name.split(',').slice(0,2).join(', ');
    loadWeather(item.lat,item.lon,item.display_name.split(',').slice(0,2).join(', '));
  }

  // Intercept form submit in JS mode and route smartly.
  const form = document.getElementById('searchForm');
  form.addEventListener('submit',(e)=>{
    e.preventDefault();
    goSearch();
  });

  $('#btnSearch').addEventListener('click',()=>goSearch());
  $('#q').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();goSearch()}});

  function goSearch(){
    const v=$('#q').value.trim();
    if(!v) return;

    // If user typed "lat,lon", stay fully client-side
    const latlon=v.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if(latlon){
      const lat=+latlon[1], lon=+latlon[2];
      reverseName(lat,lon).then(n=>loadWeather(lat,lon,n));
      return;
    }

    // Prefer SSR round-trip when available
    if (window.__SSR_ROUTE__) {
      const units = (state.units==='metric') ? 'metric' : 'imperial';
      const url = new URL(window.__SSR_ROUTE__, location.origin);
      url.searchParams.set('q', v);
      url.searchParams.set('units', units);
      location.href = url.toString();
      return;
    }

    // Fallback: pure client search (for static build)
    searchPlaces(v).then(list=>{
      if(list[0]) selectPlace(list[0]);
      else alert('No results');
    });
  }

  $('#btnShare').addEventListener('click',async e=>{
    e.preventDefault();
    const url=new URL(location.href);
    if(state.lat&&state.lon){url.searchParams.set('lat',state.lat);url.searchParams.set('lon',state.lon);url.searchParams.set('name',state.name)}
    try{
      if(navigator.share){
        await navigator.share({title:'PokeWeather',text:`${state.name||'Weather'}: ${$('#currTemp').textContent} ${$('#currDesc').textContent}`,url:url.toString()});
      }else{
        await navigator.clipboard.writeText(url.toString());alert('Link copied!')
      }
    }catch{}
  });

  function debounce(fn,ms){let t;return (...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}

  (function init(){
    // Sync hidden units field at boot
    const uHidden=document.getElementById('unitsHidden');
    if(uHidden) uHidden.value = state.units;

    // If server already gave us a place, hydrate immediately so UI & search are “awake”
    if (window.__SSR__ && typeof window.__SSR__.lat === "number" && typeof window.__SSR__.lon === "number") {
      try {
        localStorage.setItem('pokeweather:last', JSON.stringify({
          when: Date.now(),
          state: { lat: window.__SSR__.lat, lon: window.__SSR__.lon, name: window.__SSR__.name, units: state.units },
          data: { current: window.__SSR__.current || {}, daily: window.__SSR__.daily || {}, hourly: window.__SSR__.hourly || {} }
        }));
      } catch {}
      loadWeather(window.__SSR__.lat, window.__SSR__.lon, window.__SSR__.name);
      return;
    }

    const sp=new URLSearchParams(location.search);
    const lat=sp.get('lat'), lon=sp.get('lon'), name=sp.get('name');
    if(lat&&lon){loadWeather(+lat,+lon,name);return}
    const cached=JSON.parse(localStorage.getItem('pokeweather:last')||'null');
    if(cached){state.units=cached.state?.units||state.units; btnUnits.textContent=state.units==='metric'?"°C":"°F"; if(uHidden) uHidden.value=state.units; loadWeather(cached.state.lat,cached.state.lon,cached.state.name); return}
    if(navigator.geolocation){navigator.geolocation.getCurrentPosition(
      p=>{reverseName(p.coords.latitude,p.coords.longitude).then(n=>loadWeather(p.coords.latitude,p.coords.longitude,n))},
      ()=>{}
    )}
  })();