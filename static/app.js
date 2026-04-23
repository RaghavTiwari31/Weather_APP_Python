document.addEventListener("DOMContentLoaded", () => {
    const searchBtn = document.getElementById("search-btn");
    const cityInput = document.getElementById("city-input");
    const suggestionsBox = document.getElementById("suggestions");
    const searchSpinner = document.getElementById("search-spinner");
    
    const appWrapper = document.getElementById("app-wrapper");
    const contentSection = document.getElementById("content-section");
    const weatherScrollArea = document.getElementById("weather-scroll-area");
    const loading = document.getElementById("loading");
    const errorMsg = document.getElementById("error-msg");
    const appBackground = document.getElementById("app-background");
    
    let debounceTimer;

    // Remove automatic loading of "Tokyo" to stay on landing page

    cityInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const query = cityInput.value.trim();
        
        if (query.length < 2) {
            suggestionsBox.classList.add("hidden");
            searchSpinner.classList.add("hidden");
            return;
        }
        
        searchSpinner.classList.remove("hidden");
        debounceTimer = setTimeout(() => {
            fetchSuggestions(query);
        }, 400);
    });

    cityInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && cityInput.value.trim() !== "") {
            suggestionsBox.classList.add("hidden");
            fetchWeather(null, null, cityInput.value.trim());
        }
    });

    searchBtn.addEventListener("click", () => {
        if (cityInput.value.trim() !== "") {
            suggestionsBox.classList.add("hidden");
            fetchWeather(null, null, cityInput.value.trim());
        }
    });

    // Close suggestions if clicking outside
    document.addEventListener("click", (e) => {
        if (!e.target.closest('.search-container')) {
            suggestionsBox.classList.add("hidden");
        }
    });

    async function fetchSuggestions(query) {
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            searchSpinner.classList.add("hidden");
            
            if (data.results && data.results.length > 0) {
                renderSuggestions(data.results);
            } else {
                suggestionsBox.classList.add("hidden");
            }
        } catch (err) {
            console.error(err);
            searchSpinner.classList.add("hidden");
        }
    }

    function renderSuggestions(results) {
        suggestionsBox.innerHTML = "";
        results.forEach(res => {
            const div = document.createElement("div");
            div.className = "suggestion-item";
            const admin = res.admin1 ? `${res.admin1}, ` : "";
            const country = res.country || "";
            div.innerHTML = `
                <span class="sugg-city">${res.name}</span>
                <span class="sugg-region">${admin}${country}</span>
            `;
            div.addEventListener("click", () => {
                cityInput.value = res.name;
                suggestionsBox.classList.add("hidden");
                fetchWeather(res.lat, res.lon, res.name);
            });
            suggestionsBox.appendChild(div);
        });
        suggestionsBox.classList.remove("hidden");
    }

    async function fetchWeather(lat, lon, city) {
        // Transition to weather state
        appWrapper.className = "state-weather";
        contentSection.classList.remove("hidden");
        weatherScrollArea.classList.add("hidden");
        errorMsg.classList.add("hidden");
        loading.classList.remove("hidden");
        cityInput.blur(); // dismiss keyboard on mobile

        try {
            let url = `/api/weather?`;
            if (lat && lon) {
                url += `lat=${lat}&lon=${lon}&city=${encodeURIComponent(city)}`;
            } else {
                url += `city=${encodeURIComponent(city)}`;
            }
            
            const res = await fetch(url);
            const data = await res.json();
            
            if (!res.ok) throw new Error(data.detail || "Unable to fetch weather");
            
            updateUI(data);
        } catch (err) {
            loading.classList.add("hidden");
            errorMsg.textContent = err.message;
            errorMsg.classList.remove("hidden");
        }
    }

    function updateUI(data) {
        loading.classList.add("hidden");
        weatherScrollArea.classList.remove("hidden");

        document.getElementById("city-name").textContent = data.city;
        document.getElementById("country-name").textContent = data.country || "Weather Report";
        
        // Temperature
        document.getElementById("temperature").textContent = Math.round(data.temperature);
        document.getElementById("humidity").textContent = `${data.humidity}%`;
        document.getElementById("wind").textContent = `${data.wind_speed} km/h`;
        document.getElementById("precip").textContent = `${data.precipitation || 0} mm`;

        let condition = data.condition;
        let isDay = data.is_day;
        
        let displayCondition = condition;
        if(condition === "clear" && !isDay) displayCondition = "Clear Night";
        if(condition === "clear" && isDay) displayCondition = "Sunny";
        
        document.getElementById("condition-text").textContent = displayCondition;

        updateThemeAndIcon(condition, isDay);
        updateForecast(data.forecast);
    }

    function updateThemeAndIcon(condition, isDay) {
        let bgClass = "bg-clear-day";
        if (condition === "clear" || condition === "clouds") {
            bgClass = `bg-${condition}-${isDay ? 'day' : 'night'}`;
        } else {
            bgClass = `bg-${condition}`;
        }
        appBackground.className = bgClass;
        
        // Update Card Icon
        const iconSlot = document.getElementById("weather-icon-slot");
        let iconHTML = "";
        switch (condition) {
            case "clear": iconHTML = isDay ? `<div class="icon-sun"></div>` : `<div class="icon-moon"></div>`; break;
            case "clouds": iconHTML = `<div class="icon-cloud"></div>`; break;
            case "rain": iconHTML = `<div class="icon-rain-cloud"><div class="raindrop"></div><div class="raindrop"></div><div class="raindrop"></div></div>`; break;
            case "snow": iconHTML = `<div class="icon-snow-cloud"><div class="snowflake"></div><div class="snowflake"></div><div class="snowflake"></div></div>`; break;
            case "thunderstorm": iconHTML = `<div class="icon-thunder-cloud"><div class="lightning"></div></div>`; break;
            default: iconHTML = isDay ? `<div class="icon-sun"></div>` : `<div class="icon-moon"></div>`;
        }
        iconSlot.innerHTML = iconHTML;

        // Render Background Effects layer
        renderBackgroundEffects(condition, isDay);
    }

    function renderBackgroundEffects(condition, isDay) {
        const layers = document.querySelectorAll(".bg-layer");
        layers.forEach(l => {
            l.innerHTML = "";
            l.classList.add("hidden");
        });

        if (condition === "clear" && !isDay) {
            const stars = document.getElementById("bg-layer-stars");
            stars.classList.remove("hidden");
            for(let i=0; i<50; i++) {
                let div = document.createElement("div");
                div.className = "star";
                div.style.left = `${Math.random()*100}vw`;
                div.style.top = `${Math.random()*60}vh`; // Mostly top
                div.style.width = div.style.height = `${Math.random()*3 + 1}px`;
                div.style.animationDuration = `${Math.random()*2 + 1}s`;
                stars.appendChild(div);
            }
        }
        else if (condition === "clear" && isDay) {
            // A simple static sun flare in background
            const sun = document.getElementById("bg-layer-sun");
            sun.classList.remove("hidden");
            sun.innerHTML = `<div style="position:absolute; top: -100px; right: -100px; width: 400px; height: 400px; background: radial-gradient(circle, rgba(253,224,71,0.4) 0%, rgba(255,255,255,0) 70%); border-radius: 50%;"></div>`;
        }
        else if (condition === "clouds") {
            const clouds = document.getElementById("bg-layer-clouds");
            clouds.classList.remove("hidden");
            for(let i=0; i<8; i++) {
                let div = document.createElement("div");
                div.className = "bg-cloud";
                div.style.width = `${Math.random()*150 + 100}px`;
                div.style.height = `${Math.random()*40 + 30}px`;
                div.style.top = `${Math.random()*50}vh`;
                div.style.animationDuration = `${Math.random()*30 + 20}s`;
                div.style.animationDelay = `-${Math.random()*30}s`; // Start randomly on screen
                clouds.appendChild(div);
            }
        }
        else if (condition === "rain") {
            const clouds = document.getElementById("bg-layer-clouds");
            clouds.classList.remove("hidden"); // some clouds
            for(let i=0; i<5; i++) {
                let div = document.createElement("div"); div.className = "bg-cloud"; div.style.width = "200px"; div.style.height = "50px"; div.style.background = "rgba(0,0,0,0.3)"; div.style.top = `${Math.random()*30}vh`; div.style.animationDuration=`${Math.random()*30 + 20}s`; div.style.animationDelay=`-${Math.random()*30}s`;
                clouds.appendChild(div);
            }
            const rain = document.getElementById("bg-layer-rain");
            rain.classList.remove("hidden");
            for(let i=0; i<60; i++) {
                let div = document.createElement("div");
                div.className = "bg-drop";
                div.style.left = `${Math.random()*100}vw`;
                div.style.height = `${Math.random()*20 + 20}px`;
                div.style.animationDuration = `${Math.random()*0.5 + 0.5}s`;
                div.style.animationDelay = `-${Math.random()}s`;
                rain.appendChild(div);
            }
        }
        else if (condition === "snow") {
            const snow = document.getElementById("bg-layer-snow");
            snow.classList.remove("hidden");
            for(let i=0; i<50; i++) {
                let div = document.createElement("div");
                div.className = "bg-snowflake";
                div.style.left = `${Math.random()*100}vw`;
                let size = Math.random()*5 + 2;
                div.style.width = `${size}px`; div.style.height = `${size}px`;
                div.style.animationDuration = `${Math.random()*3 + 3}s`;
                div.style.animationDelay = `-${Math.random()*3}s`;
                snow.appendChild(div);
            }
        }
        else if (condition === "thunderstorm") {
            const lightning = document.getElementById("bg-layer-lightning");
            lightning.classList.remove("hidden");
            const rain = document.getElementById("bg-layer-rain");
            rain.classList.remove("hidden");
            for(let i=0; i<80; i++) {
                let div = document.createElement("div");
                div.className = "bg-drop"; div.style.left=`${Math.random()*100}vw`; div.style.height=`30px`; div.style.background="rgba(255,255,255,0.6)"; div.style.animationDuration=`${Math.random()*0.4 + 0.4}s`;
                rain.appendChild(div);
            }
            
            // Re-trigger flash periodically
            const doFlash = () => {
                if (appBackground.className !== "bg-thunderstorm") return;
                let div = document.createElement("div");
                div.className = "flash";
                lightning.appendChild(div);
                setTimeout(()=>div.remove(), 600);
                setTimeout(doFlash, Math.random()*4000 + 2000);
            };
            doFlash();
        }
    }

    function updateForecast(forecast) {
        const list = document.getElementById("forecast-list");
        list.innerHTML = "";
        
        // forecast is array of 10 objects: date, max_temp, min_temp, condition
        forecast.forEach((day, index) => {
            const d = new Date(day.date);
            const dateStr = index === 0 ? "Today" : index === 1 ? "Tomorrow" : d.toLocaleDateString("en-US", {weekday: 'short', month: 'short', day: 'numeric'});
            
            let icon = "";
            switch(day.condition) {
                case "clear": icon = "☀️"; break;
                case "clouds": icon = "☁️"; break;
                case "rain": icon = "🌧️"; break;
                case "snow": icon = "❄️"; break;
                case "thunderstorm": icon = "⚡"; break;
                default: icon = "☀️";
            }

            const div = document.createElement("div");
            div.className = "forecast-item";
            div.innerHTML = `
                <div class="fc-date">${dateStr}</div>
                <div class="fc-icon">${icon}</div>
                <div class="fc-temps">
                    <span class="fc-max">${Math.round(day.max_temp)}°</span>
                    <span class="fc-min">${Math.round(day.min_temp)}°</span>
                </div>
            `;
            list.appendChild(div);
        });
    }
});
