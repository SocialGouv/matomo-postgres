import * as http from 'http';
import * as https from 'https';
import * as url from 'url';
import * as querystring from 'querystring';

interface PiwikSettings {
  token?: string;
  apihost: string;
  apipath: string;
  apiport?: number;
}

interface PiwikApiParams {
  [key: string]: any;
  token_auth?: string;
  module?: string;
  format?: string;
}

export default class PiwikClient {
  private settings: PiwikSettings;
  private http: typeof http | typeof https;

  constructor(baseURL: string, token?: string) {
    const parsedUrl = url.parse(baseURL, true);
    this.settings = {
      apihost: parsedUrl.hostname || '',
      apipath: parsedUrl.pathname || '',
    };

    // Determine protocol and set http module
    switch (parsedUrl.protocol) {
      case 'http:':
        this.http = http;
        this.settings.apiport = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 80;
        break;
      case 'https:':
        this.http = https;
        this.settings.apiport = parsedUrl.port ? parseInt(parsedUrl.port, 10) : 443;
        break;
      default:
        this.http = http;
        this.settings.apiport = 80;
    }

    // Set token from URL query or constructor parameter
    if (parsedUrl.query && (parsedUrl.query as any).token_auth) {
      this.settings.token = (parsedUrl.query as any).token_auth;
    }
    if (token) {
      this.settings.token = token;
    }
  }

  api(vars: PiwikApiParams, cb: (err: Error | null, data: any) => void): http.ClientRequest {
    if (typeof vars !== 'object') {
      vars = {};
    }
    
    // Set default values
    vars.module = 'API';
    vars.format = 'JSON';
    
    // Set token if not provided in vars
    if (vars.token_auth == null) {
      vars.token_auth = this.settings.token;
    }
    
    // Extract token_auth for POST body
    const token_auth = vars.token_auth;
    const postData = querystring.stringify({ token_auth });
    
    // Remove token_auth from URL query params
    const queryVars = { ...vars };
    delete queryVars.token_auth;
    
    // Prepare request options
    const options = {
      host: this.settings.apihost,
      port: this.settings.apiport,
      path: this.settings.apipath + '?' + querystring.stringify(queryVars),
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };
    
    // Make HTTP POST request
    const req = this.http.request(options, (response) => {
      let data = '';
      
      // Collect data chunks
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      // Process complete response
      response.on('end', () => {
        try {
          const resObj = JSON.parse(data);
          if (resObj.result === 'error') {
            return cb(new Error(resObj.message), null);
          }
          return cb(null, resObj);
        } catch (error) {
          return cb(error instanceof Error ? error : new Error(String(error)), null);
        }
      });
    });
    
    // Handle request errors
    req.on('error', (error) => {
      cb(error, null);
    });
    
    // Write POST data and end request
    req.write(postData);
    req.end();
    
    return req;
  }
}