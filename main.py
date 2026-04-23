from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx
import logging

app = FastAPI(title="Live Weather App")
logger = logging.getLogger(__name__)

def get_weather_condition(code: int) -> str:
    if code in [0, 1]: return "clear"
    elif code in [2, 3, 45, 48]: return "clouds"
    elif code in [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]: return "rain"
    elif code in [71, 73, 75, 77, 85, 86]: return "snow"
    elif code in [95, 96, 99]: return "thunderstorm"
    return "clear"

@app.get("/api/search")
async def search_city(q: str = Query(..., min_length=1)):
    async with httpx.AsyncClient() as client:
        geocode_url = f"https://geocoding-api.open-meteo.com/v1/search?name={q}&count=5"
        resp = await client.get(geocode_url)
        data = resp.json()
        results = []
        if "results" in data:
            for r in data["results"]:
                results.append({
                    "id": r.get("id"),
                    "name": r.get("name"),
                    "country": r.get("country"),
                    "admin1": r.get("admin1"),
                    "lat": r["latitude"],
                    "lon": r["longitude"]
                })
        return {"results": results}

@app.get("/api/weather")
async def get_weather(lat: float = None, lon: float = None, city: str = None):
    if lat is None or lon is None:
        if not city:
            raise HTTPException(status_code=400, detail="Must provide either lat/lon or city name")
        # Fallback to geocode if only city name provided
        async with httpx.AsyncClient() as client:
            geocode_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1"
            geo_response = await client.get(geocode_url)
            geo_data = geo_response.json()
            if not geo_data.get("results"):
                raise HTTPException(status_code=404, detail="City not found")
            location = geo_data["results"][0]
            lat = location["latitude"]
            lon = location["longitude"]
            city_name = location["name"]
            country = location.get("country", "")
    else:
        city_name = city or "Selected Location"
        country = ""

    async with httpx.AsyncClient() as client:
        weather_url = (
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            "&current=temperature_2m,relative_humidity_2m,is_day,precipitation,weather_code,wind_speed_10m"
            "&daily=weather_code,temperature_2m_max,temperature_2m_min"
            "&timezone=auto&forecast_days=10"
        )
        weather_response = await client.get(weather_url)
        weather_data = weather_response.json()
        
        if "current" not in weather_data or "daily" not in weather_data:
            raise HTTPException(status_code=500, detail="Weather data unavailable")
            
        current = weather_data["current"]
        daily = weather_data["daily"]
        
        forecast = []
        for i in range(len(daily["time"])):
            forecast.append({
                "date": daily["time"][i],
                "max_temp": daily["temperature_2m_max"][i],
                "min_temp": daily["temperature_2m_min"][i],
                "condition": get_weather_condition(daily["weather_code"][i]),
                "weather_code": daily["weather_code"][i]
            })

        return {
            "city": city_name,
            "country": country,
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "wind_speed": current.get("wind_speed_10m"),
            "precipitation": current.get("precipitation"),
            "is_day": current.get("is_day") == 1,
            "weather_code": current.get("weather_code"),
            "condition": get_weather_condition(current.get("weather_code", 0)),
            "forecast": forecast
        }

@app.get("/")
def serve_index():
    return FileResponse("static/index.html")

app.mount("/", StaticFiles(directory="static"), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
