import { NextResponse } from "next/server";

// Orlando, FL coordinates
const LAT = 28.5383;
const LON = -81.3792;

const WMO: Record<number, string> = {
  0:"Clear", 1:"Mostly clear", 2:"Partly cloudy", 3:"Overcast",
  45:"Fog", 48:"Fog",
  51:"Light drizzle", 53:"Drizzle", 55:"Heavy drizzle",
  61:"Light rain", 63:"Rain", 65:"Heavy rain",
  71:"Light snow", 73:"Snow", 75:"Heavy snow",
  80:"Rain showers", 81:"Rain showers", 82:"Heavy showers",
  95:"Thunderstorm", 96:"Thunderstorm", 99:"Thunderstorm",
};

function wmoLabel(code: number) { return WMO[code] ?? "Unknown"; }
function wmoEmoji(code: number) {
  if (code === 0)  return "☀️";
  if (code <= 2)   return "🌤️";
  if (code <= 3)   return "☁️";
  if (code <= 48)  return "🌫️";
  if (code <= 67)  return "🌧️";
  if (code <= 77)  return "❄️";
  if (code <= 82)  return "🌦️";
  return "⛈️";
}

export async function GET() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}`
      + `&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,precipitation`
      + `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max`
      + `&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=5`;

    const res = await fetch(url, { next: { revalidate: 1800 } }); // 30min cache
    if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
    const json = await res.json();

    const c = json.current;
    const d = json.daily;

    const forecast = (d.time as string[]).map((date: string, i: number) => ({
      date,
      high: Math.round(d.temperature_2m_max[i]),
      low:  Math.round(d.temperature_2m_min[i]),
      code: d.weather_code[i] as number,
      label: wmoLabel(d.weather_code[i]),
      emoji: wmoEmoji(d.weather_code[i]),
      rain:  d.precipitation_probability_max[i] as number,
    }));

    return NextResponse.json({
      ok: true,
      current: {
        temp:       Math.round(c.temperature_2m as number),
        feelsLike:  Math.round(c.apparent_temperature as number),
        humidity:   c.relative_humidity_2m as number,
        wind:       Math.round(c.wind_speed_10m as number),
        precip:     c.precipitation as number,
        code:       c.weather_code as number,
        label:      wmoLabel(c.weather_code as number),
        emoji:      wmoEmoji(c.weather_code as number),
      },
      forecast,
      location: "Orlando, FL",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
