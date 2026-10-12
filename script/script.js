// Get the elements from the page
let form = document.getElementById('searchForm');
let input = document.getElementById('cityInput');
let searchBtn = document.getElementById('searchBtn');
let retryBtn = document.getElementById('retryBtn');
let statusEl = document.getElementById('status');
let resultEl = document.getElementById('result');
let forecastEl = document.getElementById('forecast');

let GEO = 'https://geocoding-api.open-meteo.com/v1/search';
let WX = 'https://api.open-meteo.com/v1/forecast';

// Turn the weather code from Open-Meteo into text and an icon
function getWeatherInfo(code) {
  if (code === 0) return ['Clear sky', '☀️'];
  if (code <= 2) return ['Partly cloudy', '⛅'];
  if (code === 3) return ['Cloudy', '☁️'];
  if (code <= 48) return ['Fog', '🌫️'];
  if (code <= 67) return ['Rain', '🌧️'];
  if (code <= 77) return ['Snow', '❄️'];
  if (code <= 82) return ['Showers', '🌦️'];
  return ['Thunderstorm', '⛈️'];
}

// Fetch a URL and return the JSON. Throws if the status is not ok (404, 500...)
async function getJSON(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }
  return response.json();
}

// City name -> latitude, longitude -> forecast
async function loadWeather(city) {
  // 1. Find the city
  let geo = await getJSON(GEO + '?name=' + encodeURIComponent(city) + '&count=1');

  if (!geo.results || geo.results.length === 0) {
    throw new Error('not-found');
  }

  let place = geo.results[0];

  // 2. Get the weather for that place
  let url = WX + '?latitude=' + place.latitude
    + '&longitude=' + place.longitude
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation,weather_code'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min'
    + '&forecast_days=3&timezone=auto';
  let data = await getJSON(url);

  data.name = place.name;
  data.country = place.country;
  return data;
}

// Put the data on the page
function renderWeather(data) {
  let now = data.current;
  let info = getWeatherInfo(now.weather_code);

  document.getElementById('cityName').textContent = data.name;
  document.getElementById('country').textContent = data.country;
  document.getElementById('icon').textContent = info[1];
  document.getElementById('condition').textContent = info[0];
  document.getElementById('temp').textContent = Math.round(now.temperature_2m) + '°C';
  document.getElementById('feels').textContent = Math.round(now.apparent_temperature) + '°C';
  document.getElementById('humidity').textContent = now.relative_humidity_2m + '%';
  document.getElementById('wind').textContent = now.wind_speed_10m + ' km/h';
  document.getElementById('rain').textContent = now.precipitation + ' mm';

  // Remove the old forecast so the new city replaces it
  forecastEl.innerHTML = '';

  let days = ['Today', 'Tomorrow', 'Day 3'];

  for (let i = 0; i < data.daily.time.length; i++) {
    let dayInfo = getWeatherInfo(data.daily.weather_code[i]);
    let max = Math.round(data.daily.temperature_2m_max[i]);
    let min = Math.round(data.daily.temperature_2m_min[i]);

    let card = document.createElement('li');
    card.innerHTML = '<strong>' + days[i] + '</strong>'
      + '<div class="emoji">' + dayInfo[1] + '</div>'
      + max + '° / ' + min + '°';
    forecastEl.appendChild(card);
  }

  resultEl.style.display = 'block';
}

// Hide the old weather (used when there's an error)
function clearWeather() {
  resultEl.style.display = 'none';
}

// idle / loading / success / error
function setStatus(state, message = '') {
  statusEl.dataset.state = state;
  statusEl.textContent = message;
  searchBtn.disabled = state === 'loading';

  if (state === 'error') {
    retryBtn.style.display = 'block';
  } else {
    retryBtn.style.display = 'none';
  }
}

// Turn an error into a message a person understands
function friendly(err) {
  if (err.message === 'not-found') {
    return 'City not found. Check the spelling.';
  }
  return "Couldn't reach the server. Check your connection and try again.";
}

async function onSearch() {
  let city = input.value.trim();

  if (city === '') {
    setStatus('idle', 'Search for a city');
    return;
  }

  setStatus('loading', 'Loading ' + city + '...');

  try {
    let data = await loadWeather(city);
    renderWeather(data);
    setStatus('success', 'Done!');
  } catch (err) {
    clearWeather();
    setStatus('error', friendly(err));
  }
}

// The form runs on button click and when you press Enter
form.addEventListener('submit', function (e) {
  e.preventDefault();
  onSearch();
});

retryBtn.addEventListener('click', onSearch);

setStatus('idle', 'Search for a city');
