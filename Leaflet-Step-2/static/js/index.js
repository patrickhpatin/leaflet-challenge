// Past 30 Days
// https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson

// Past 7 Days
// https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson

// Past Day
// https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson

// Store the API endpoint inside queryUrl and queryPlatesUrl 
const ALL_DAY = 0;
const ALL_WEEK = 1;
const ALL_MONTH = 2;
const queryURL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";
const queryPlatesURL = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json";

var platesData;
var earthquakeData;

// Reflect the magnitude of the earthquake in color
// Color Codes represent USGS Earthquake Magnitude Classes as defined by the USGS
// http://www.geo.mtu.edu/UPSeis/magnitude.html
function magColorCodes(mag) {
  var retVal = "";
  
  switch (true) {
      case mag < 0:  // vibs
        retVal = "#FFFFFF"
      case mag < 1:  // Tremors / Dark Grey
        retVal = "#64C8FA";
        break;
      case mag < 2:  // Minor / White
        retVal = "#0064C8";
        break;
      case mag < 3:  // Light /Green
        retVal = "#008000";
        break;
      case mag < 4:  // Moderate / Yellow
        retVal = "#FFFF00";
        break;
      case mag < 5:  // Strong / Orange
        retVal = "#FFA500";
        break;
      case mag < 6:  // Major / Red
        retVal = "#FF0000";
        break;
      case mag < 7:  // Great / Maroon
        retVal = "#800000";
        break;
      default:
        retVal = "#800000";
        break;
  };

  return retVal;
};

function plotEarthQuakeData(scope = ALL_WEEK) {
  // Reset these variables every time this code runs
  // queryURL = "";
  platesData = [];
  earthquakeData = [];

  // Call dude's github to get the tectonic plate geojason data
  d3.json(queryURL, (data) => {
    console.log(data.features);
    earthquakeData = data.features;  

    // Call the USGS API to get the earthquake geojason data
    d3.json(queryPlatesURL, (data) => {
      console.log(data.features);
      platesData = data.features;    
      createLayers();
    });
  });
};

// Your data markers should reflect the magnitude of the earthquake in their size and color. Earthquakes with higher magnitudes should appear larger and darker in color.
function amplifyDot(magnitude) {
    return magnitude * 35000;
};

// Create Features
function createLayers() {    
    // Create a new GeoJSON Layer containing the features array on the earthquakeData object
    var earthquakeLayer = L.geoJSON(earthquakeData, {
      onEachFeature: function(feature, layer) {          
        // Include popups that provide additional information about the earthquake when a marker is clicked
        layer.bindPopup(`<h3>${feature.properties.place}</h3><hr>Date: ${(new Date(feature.properties.time).toLocaleString())}<br>Magnitude: ${feature.properties.mag}`)
      },
      pointToLayer: function(feature, coords) {
        return L.circle(coords, {
            radius: amplifyDot(feature.properties.mag),
            fillColor: magColorCodes(feature.properties.mag),
            fillOpacity: 0.85,
            color: "#000000",
            weight: 0.65
        });
      }
    });

    // Create another GeoJSON layer containing the tectonic plate data
    // Lava color code = "#CC0033"
    var faultLayer = L.geoJson(platesData, {
        style: (feature) => {
            var options = {color: "#CC0033", weight: 6, opacity: 0.6};
            var coords = (feature.geometry.coordinates);
            return L.polyline(coords, options);
        }
    });

    createMap(earthquakeLayer, faultLayer);
};

function createMap(earthquakeLayer, faultLayer) {
    // Define satellite, grayscale and outdoors layers
    var satellite = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
        attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
        maxZoom: 18,
        id: "mapbox.satellite",
        accessToken: API_KEY
    });

    var rastor = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
        attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
        maxZoom: 18,
        id: "mapbox.streets",
        accessToken: API_KEY
    });

    var terrain = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
        attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
        maxZoom: 18,
        id: "mapbox.mapbox-terrain-v2",
        accessToken: API_KEY
    });

    // Our Base Map will hold our main layers (i.e. literally the map that we're plotting against)
    var baseMaps = {
      "Rastor": rastor,
      "Satellite": satellite,
      "Terrain": terrain
    };

    // These are the data layers (earthquake data and fault line data)
    var addLayers = {
        "Earthquakes": earthquakeLayer,
        "Fault Lines": faultLayer
    };

    // Create a new map
    var myMap = L.map("map", {
        center: [31.51073, 0.0],  // center of the USA [31.51073, -96.4247]
        zoom: 2.3,
        layers: [rastor, satellite, terrain, earthquakeLayer, faultLayer]
    });

    // Now add the base maps and additional layers to our map
    L.control.layers(baseMaps, addLayers).addTo(myMap);

    // Now, for our legend
    var legend = L.control({position: 'bottomright'});

    legend.onAdd = function () {    
        var div = L.DomUtil.create('div', 'info legend'),
            grades = [0, 1, 2, 3, 4, 5, 6, 7],
            labels = [];
    
        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < grades.length; i++) {
          div.innerHTML +=
              '<i style="background:' + magColorCodes(grades[i]) + '"></i> ' +
              grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
        }    
        return div;
    };
    
    legend.addTo(myMap);
};

plotEarthQuakeData(ALL_WEEK);

// .legend .micro { color: #FFFFFF;
// .legend .rex { color: #64C8FA;
// .legend .tremor { color: #0064C8;
// .legend .light { color: #008000;
// .legend .moderate { color: #FFFF00;
// .legend .strong { color: #008000;
// .legend .major { color: #FFFF00;
// .legend .great { color: #008000;