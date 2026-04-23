import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as https from 'https';

export interface CibpayConfig {
  baseUrl: string;
  username: string;
  password: string;
  terminal?: string;
  defaultCurrency: string;
  returnBaseUrl: string;
  pfxPath?: string;
  pfxPassword?: string;
  force3d: 0 | 1;
}

@Injectable()
export class CibpayConfigService {
  private readonly logger = new Logger(CibpayConfigService.name);
  private _httpsAgent?: https.Agent;
  private _config?: CibpayConfig;

  constructor(private readonly config: ConfigService) {}

  getConfig(): CibpayConfig {
    if (this._config) return this._config;
    this._config = {
      baseUrl: (this.config.get<string>('CIBPAY_BASE_URL') || 'https://api-preprod.cibpay.co').replace(/\/$/, ''),
      username: this.config.get<string>('CIBPAY_USERNAME') || '',
      password: this.config.get<string>('CIBPAY_PASSWORD') || '',
      terminal: this.config.get<string>('CIBPAY_TERMINAL') || undefined,
      defaultCurrency: this.config.get<string>('CIBPAY_DEFAULT_CURRENCY') || 'AZN',
      returnBaseUrl: (this.config.get<string>('CIBPAY_RETURN_BASE_URL') || this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').replace(/\/$/, ''),
      pfxPath: this.config.get<string>('CIBPAY_PFX_PATH') || undefined,
      pfxPassword: this.config.get<string>('CIBPAY_PFX_PASSWORD') || undefined,
      force3d: (this.config.get<string>('CIBPAY_FORCE_3D') ?? '1') === '1' ? 1 : 0,
    };
    return this._config;
  }

  getAuthHeader(): string {
    const { username, password } = this.getConfig();
    return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
  }

  getHttpsAgent(): https.Agent {
    if (this._httpsAgent) return this._httpsAgent;
    const { pfxPath, pfxPassword } = this.getConfig();
    if (pfxPath && fs.existsSync(pfxPath)) {
      try {
        this._httpsAgent = new https.Agent({
          pfx: fs.readFileSync(pfxPath),
          passphrase: pfxPassword,
        });
        this.logger.log(`CIBPAY: loaded client certificate from ${pfxPath}`);
      } catch (err) {
        this.logger.error(`CIBPAY: failed to load PFX at ${pfxPath}: ${(err as Error).message}`);
        this._httpsAgent = new https.Agent();
      }
    } else {
      if (pfxPath) {
        this.logger.warn(`CIBPAY: PFX_PATH set to "${pfxPath}" but file not found — requests will be sent without client cert`);
      }
      this._httpsAgent = new https.Agent();
    }
    return this._httpsAgent;
  }
}
