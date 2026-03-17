/**
 * config-legacy.js
 * Mesmas configurações do config.js, mas sem ES Modules.
 * Compatível com iOS 10 / Safari antigo.
 */

var HA_URL   = "http://10.10.0.148:8123";
var HA_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiIwM2U4Yzk3Y2I4ZTk0YThhYmU0YmEzNDc2YzE4MjA4YiIsImlhdCI6MTc3MzM2Mzk1MywiZXhwIjoyMDg4NzIzOTUzfQ.vWqosBkPeI-k_I3z2k0J6D0YxjFfBhsf-Tap6wuHJ0M"; // seu token completo aqui

var WEATHER_ENTITY = "weather.casa_accuweather";
var RAIN_DAY_1     = "sensor.casa_accuweather_thunderstorm_probability_day_1";
var RAIN_NIGHT_1   = "sensor.casa_accuweather_thunderstorm_probability_night_1";