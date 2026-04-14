import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import axios from 'axios';

// Port of Baku — Alat terminal geocoordinates (40.0256°N 49.4239°E)
const POB_LAT = 40.0256;
const POB_LON = 49.4239;

export interface WeatherDayResult {
  date: string;           // YYYY-MM-DD
  windSpeedMs: number;
  precipitationMm: number;
  waveHeightM: number;
  isHighRisk: boolean;    // wind > threshold || wave > threshold → block
  isWarning: boolean;     // precip > threshold (but not high risk)
  available: boolean;     // false = beyond forecast window or no API key
  reasons: string[];      // human-readable reasons for high-risk/warning
}

interface OWMForecastItem {
  dt: number;
  wind: { speed: number };
  rain?: { '3h'?: number };
  snow?: { '3h'?: number };
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async getWeatherForRange(
    startDate: Date,
    endDate: Date,
    planId?: string,
  ): Promise<WeatherDayResult[]> {
    const apiKey = this.config.get<string>('WEATHER_API_KEY') || '';
    const apiUrl = (this.config.get<string>('WEATHER_API_URL') || 'https://api.openweathermap.org/data/2.5').replace(/\/$/, '');

    // Read thresholds from SystemConfig DB (editable by admin), fall back to env/defaults
    const [windCfg, precipCfg, waveCfg] = await Promise.all([
      this.prisma.systemConfig.findUnique({ where: { key: 'WEATHER_WIND_THRESHOLD_MS' } }),
      this.prisma.systemConfig.findUnique({ where: { key: 'WEATHER_PRECIPITATION_THRESHOLD_MM' } }),
      this.prisma.systemConfig.findUnique({ where: { key: 'WEATHER_WAVE_THRESHOLD_M' } }),
    ]);
    const windThr   = windCfg   ? parseFloat(windCfg.value)   : (this.config.get<number>('app.weatherWindThresholdMs')   ?? 20);
    const precipThr = precipCfg ? parseFloat(precipCfg.value) : (this.config.get<number>('app.weatherPrecipThresholdMm') ?? 20);
    const waveThr   = waveCfg   ? parseFloat(waveCfg.value)   : (this.config.get<number>('app.weatherWaveThresholdM')    ?? 2);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // OWM free forecast covers ~5 days ahead
    const forecastCutoff = new Date(today);
    forecastCutoff.setDate(forecastCutoff.getDate() + 5);

    // --- Fetch from OpenWeatherMap 5-day/3-hour forecast ---
    const forecastByDate = new Map<string, { maxWind: number; totalPrecip: number }>();

    if (apiKey) {
      try {
        const response = await axios.get<{ list: OWMForecastItem[] }>(
          `${apiUrl}/forecast`,
          {
            params: {
              lat: POB_LAT,
              lon: POB_LON,
              appid: apiKey,
              units: 'metric',
              cnt: 40,    // max 5 days × 8 intervals = 40 entries
            },
            timeout: 8000,
          },
        );
        this.logger.log(`Weather API: fetched ${response.data.list?.length ?? 0} forecast entries for Alat`);

        for (const item of response.data.list ?? []) {
          const d = new Date(item.dt * 1000).toISOString().split('T')[0];
          const wind = item.wind?.speed ?? 0;
          const precip = (item.rain?.['3h'] ?? 0) + (item.snow?.['3h'] ?? 0);
          const cur = forecastByDate.get(d);
          if (cur) {
            cur.maxWind    = Math.max(cur.maxWind, wind);
            cur.totalPrecip += precip;
          } else {
            forecastByDate.set(d, { maxWind: wind, totalPrecip: precip });
          }
        }
      } catch (err: unknown) {
        const e = err as { response?: { status?: number; data?: unknown }; message?: string };
        if (e.response) {
          this.logger.error(`Weather API error ${e.response.status}: ${JSON.stringify(e.response.data)}`);
        } else {
          this.logger.error(`Weather API fetch failed: ${e.message}`);
        }
      }
    } else {
      this.logger.warn('Weather API key not configured — skipping forecast fetch');
    }

    // --- Build per-day results ---
    const results: WeatherDayResult[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const isPast          = current < today;
      const beyondForecast  = current > forecastCutoff;
      const forecastEntry   = forecastByDate.get(dateStr);
      const available       = !isPast && !beyondForecast && !!forecastEntry && !!apiKey;

      const windSpeedMs     = forecastEntry?.maxWind     ?? 0;
      const precipitationMm = forecastEntry?.totalPrecip ?? 0;
      const waveHeightM     = 0; // marine endpoint not available on free tier

      const reasons: string[] = [];
      if (available) {
        if (windSpeedMs    > windThr)   reasons.push(`Wind ${windSpeedMs.toFixed(1)} m/s (limit ${windThr} m/s)`);
        if (precipitationMm > precipThr) reasons.push(`Precipitation ${precipitationMm.toFixed(1)} mm (limit ${precipThr} mm)`);
        if (waveHeightM    > waveThr)   reasons.push(`Wave height ${waveHeightM.toFixed(1)} m (limit ${waveThr} m)`);
      }

      const isHighRisk = available && (windSpeedMs > windThr || waveHeightM > waveThr);
      const isWarning  = available && !isHighRisk && precipitationMm > precipThr;

      results.push({
        date: dateStr,
        windSpeedMs:    +windSpeedMs.toFixed(1),
        precipitationMm: +precipitationMm.toFixed(1),
        waveHeightM,
        isHighRisk,
        isWarning,
        available,
        reasons,
      });

      // Cache in DB if planId provided and data is available
      if (planId && available && forecastEntry) {
        try {
          await this.prisma.weatherCache.upsert({
            where: { planId_date: { planId, date: new Date(dateStr) } },
            create: {
              planId,
              date: new Date(dateStr),
              windSpeedMs:     windSpeedMs,
              precipitationMm: precipitationMm,
              waveHeightM:     waveHeightM,
              isHighRisk,
              fetchedAt:       new Date(),
            },
            update: {
              windSpeedMs:     windSpeedMs,
              precipitationMm: precipitationMm,
              waveHeightM:     waveHeightM,
              isHighRisk,
              fetchedAt:       new Date(),
            },
          });
        } catch { /* non-critical, best effort */ }
      }

      current.setDate(current.getDate() + 1);
    }

    return results;
  }
}
