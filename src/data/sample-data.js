export const sampleStation = {
  station: {
    id: "ridge-house-01",
    name: "Ridge House",
    location: "Asheville, North Carolina",
    elevation: 2178,
    status: "online",
    updatedAt: new Date().toISOString(),
    intervalSeconds: 60,
  },
  current: {
    temperatureF: 68.4,
    feelsLikeF: 68.1,
    condition: "Partly cloudy",
    conditionCode: "partly-cloudy",
    humidity: 62,
    windMph: 7.8,
    windDirection: 238,
    windCardinal: "WSW",
    gustMph: 13.2,
    pressureInHg: 30.08,
    pressureTrend: "rising",
    precipitationIn: 0.04,
    rainTodayIn: 0.18,
    visibilityMi: 9.7,
    uvIndex: 3.2,
    dewPointF: 55.1,
    airQuality: 24,
    airQualityLabel: "Good",
    solarRadiation: 428,
  },
  today: {
    highF: 73.8,
    lowF: 52.6,
    averageF: 63.1,
    rainfallIn: 0.18,
    maxGustMph: 18.7,
    sunrise: "6:23 AM",
    sunset: "8:44 PM",
  },
  records: [
    { label: "Warmest", value: "84.2°", note: "Jul 9" },
    { label: "Strongest gust", value: "31.8 mph", note: "Jul 12" },
    { label: "Wettest day", value: "1.24 in", note: "Jul 3" },
  ],
  hourlyForecast: [
    { time: "Now", tempF: 68, condition: "partly-cloudy", rain: 12 },
    { time: "12 PM", tempF: 70, condition: "partly-cloudy", rain: 10 },
    { time: "1 PM", tempF: 72, condition: "sunny", rain: 8 },
    { time: "2 PM", tempF: 73, condition: "sunny", rain: 7 },
    { time: "3 PM", tempF: 74, condition: "partly-cloudy", rain: 11 },
    { time: "4 PM", tempF: 72, condition: "cloudy", rain: 22 },
    { time: "5 PM", tempF: 70, condition: "rain", rain: 48 },
  ],
  dailyForecast: [
    { day: "Today", highF: 74, lowF: 53, condition: "partly-cloudy", rain: 24 },
    { day: "Fri", highF: 77, lowF: 58, condition: "sunny", rain: 8 },
    { day: "Sat", highF: 79, lowF: 61, condition: "rain", rain: 54 },
    { day: "Sun", highF: 75, lowF: 59, condition: "storm", rain: 68 },
    { day: "Mon", highF: 72, lowF: 55, condition: "partly-cloudy", rain: 30 },
  ],
};

const baseTemperature = [58,57,56,55,54,54,53,54,56,59,62,65,67,69,71,72,73,72,71,70,68,65,63,61];

export function makeHistory(range = "24h") {
  const counts = { "24h": 24, "7d": 28, "30d": 30 };
  const count = counts[range] || 24;
  return Array.from({ length: count }, (_, i) => {
    const basis = baseTemperature[i % baseTemperature.length];
    const wave = range === "24h" ? 0 : Math.sin(i * 0.8) * 4;
    const date = new Date(Date.now() - (count - i - 1) * (range === "24h" ? 3600000 : 86400000));
    return {
      time: date.toISOString(),
      temperatureF: +(basis + wave).toFixed(1),
      feelsLikeF: +(basis + wave - 1.4 + Math.sin(i) * 0.8).toFixed(1),
      humidity: Math.round(76 - (basis - 53) * 1.1 + Math.sin(i) * 3),
      pressureInHg: +(30.02 + Math.sin(i / 4) * 0.07).toFixed(2),
      rainIn: i > count * 0.66 && i < count * 0.78 ? +(Math.random() * 0.05).toFixed(2) : 0,
    };
  });
}
