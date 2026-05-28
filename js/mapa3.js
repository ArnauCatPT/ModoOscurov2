//visualizacion del mapa modo oscuro
const map = L.map('map', {
  zoomControl:false
}).setView([20, 0], 2);

L.tileLayer(
  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  {
    subdomains:'abcd',
    maxZoom:19
  }
).addTo(map);



function detectCountry(text){

  const lower = text.toLowerCase();

  for(const country of capitals){

    if(
      lower.includes(
        country.pais.toLowerCase()
      )
    ){
      return country;
    }
  }

  return null;
}


//detecto el sentimiento del tipo Alcista, Bajista, Neutral
function detectSentiment(text){

  const lower = text.toLowerCase();

  const bullishWords = ["win","rise","bull","growth","increase","pump","surge","up"];
  const bearishWords = ["lose","fall","bear","crash","drop","down","decline","recession"];

  for(const word of bullishWords){
    if(lower.includes(word)) return "bullish";
  }

  for(const word of bearishWords){
    if(lower.includes(word)) return "bearish";
  }

  return "neutral";
}



async function loadQuestions(){

  const res =
    await fetch(
      "https://gamma-api.polymarket.com/markets?active=true&limit=100"
    );

  const data =
    await res.json();

  return data.map(x => ({
    question: x.question,
    sentiment: detectSentiment(x.question) //nuevo
  }));
}


async function main(){

  const markets = await loadQuestions();

  const counts = {};

  for(const m of markets){

    const loc =
      detectCountry(m.question);

    if(!loc) continue;

    const key = loc.capital;

    if(!counts[key]){

      counts[key] = {
        ...loc,
        count:0,
        bullish:0,
        bearish:0,
        neutral:0
      };
    }

    counts[key].count++;

    counts[key][m.sentiment]++;
  }

  // guardo layers para filtrado
  const cityLayers = [];

  Object.values(counts).forEach(city => {

    // sentiment dominante
    let sentiment = "neutral";

    if(city.bullish > city.bearish &&
       city.bullish > city.neutral){
      sentiment = "bullish";
    }

    else if(
      city.bearish > city.bullish &&
      city.bearish > city.neutral
    ){

      sentiment = "bearish";
    }

    // colores
    let color = "#999";

    if(sentiment === "bullish"){
      color = "#00ff88";
    }

    if(sentiment === "bearish"){
      color = "#ff4444";
    }

    //circulo interior glow

    const glow = L.circleMarker(
      [city.latitud, city.longitud],
      {
        radius: 20 + city.count * 6,
        color: color,
        fillColor: color,
        fillOpacity:0.15,
        opacity:0
      }
    ).addTo(map);

    //circulo principal

    const marker =
      L.circleMarker(
        [city.latitud, city.longitud],
        {
          radius: 8 + city.count * 2,
          color: color,
          weight:2,
          fillColor: color,
          fillOpacity:0.9
        }
      ).addTo(map);

    // LABEL COUNTRY CODE

    const labelIcon = L.divIcon({
      className: 'country-label',
      html: `
        <div class="label-text">
          ${city.codigo || city.pais.slice(0,2).toUpperCase()}
        </div>
      `,
      iconSize: [40, 20],
      iconAnchor: [20, -10]
    });

    const label = L.marker(
      [city.latitud - 2.2, city.longitud],
      {
        icon: labelIcon
      }
    ).addTo(map);

    marker.bindPopup(`
      <div style="min-width:180px">
        <b style="font-size:16px">
          ${city.capital}
        </b>

        <br><br>

        ${city.pais}

        <br><br>

        Total mentions:
        <b>${city.count}</b>

        <br><br>

        🟢 Bullish:
        <b>${city.bullish}</b>

        <br>

        🔴 Bearish:
        <b>${city.bearish}</b>

        <br>

        ⚪ Neutral:
        <b>${city.neutral}</b>
      </div>
    `);

    cityLayers.push({
      city,
      sentiment,
      layers:[glow, marker, label]
    });

  });


//filtro
const filter = document.getElementById("marketFilter");

filter.addEventListener("change", () => {
  const value = filter.value;
  cityLayers.forEach(item => {
    let visible = false;

     if((value === "all") ||  //todos
        (value === "bullish" && item.city.bullish > 0) || //alcistas
        (value === "bearish" && item.city.bearish > 0) ||  //bajistas
        (value === "neutral" && item.city.neutral > 0)){ //neutrales
          visible = true;
        } 

    item.layers.forEach(layer => {

      if(visible){
        if(!map.hasLayer(layer)) layer.addTo(map);
      }else{
        if(map.hasLayer(layer)) map.removeLayer(layer);
      }

    });

  });

});





  document.getElementById("panel").innerHTML =
  `
    <div style="font-size:18px;font-weight:bold">
      Polymarket Global Activity
    </div>

    <div style="margin-top:8px">
      Countries detected:
      <b>${Object.keys(counts).length}</b>
    </div>
  `;
}

main();