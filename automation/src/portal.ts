import { chromium, type Browser, type BrowserContext, type Page } from 'playwright';
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { CATEGORIES, type SnowReport, type Category } from '../../shared/types.js';

const PORTAL = config.portalBaseUrl;
const STEP_TIMEOUT = 25_000; // Portal postbacks can be slow

// Persist auth state between runs
const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_PATH = join(__dirname, '..', '..', '..', 'automation', '.auth-state.json');

export class PortalSubmitter {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private loggedIn = false;

  async launch(): Promise<void> {
    this.browser = await chromium.launch({ headless: config.headless });

    // Reuse saved auth state if available
    const contextOpts: Parameters<Browser['newContext']>[0] = {
      viewport: { width: 1280, height: 900 },
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    };
    if (existsSync(AUTH_STATE_PATH)) {
      contextOpts.storageState = AUTH_STATE_PATH;
      console.log('[portal] Restoring saved auth state');
    }

    this.context = await this.browser.newContext(contextOpts);
    this.page = await this.context.newPage();
  }

  async close(): Promise<void> {
    // Save auth state before closing
    if (this.context && this.loggedIn) {
      try {
        await this.context.storageState({ path: AUTH_STATE_PATH });
        console.log('[portal] Auth state saved');
      } catch {
        // Non-fatal
      }
    }
    await this.browser?.close();
    this.browser = null;
    this.context = null;
    this.page = null;
    this.loggedIn = false;
  }

  private getPage(): Page {
    if (!this.page) throw new Error('Browser not launched');
    return this.page;
  }

  // ── Login ──────────────────────────────────────────────────

  async ensureLoggedIn(): Promise<void> {
    const page = this.getPage();

    // Check if saved/current cookies still work
    try {
      await page.goto(`${PORTAL}/my-requests/`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
      const username = await page.$('.username');
      if (username) {
        console.log('[portal] Already logged in (reused session)');
        this.loggedIn = true;
        return;
      }
    } catch {
      // Session expired or failed, proceed to login
    }

    console.log('[portal] Logging in...');
    await page.goto(`${PORTAL}/SignIn?returnUrl=%2F`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
    await page.fill('#Username', config.portalEmail);
    await page.fill('#PasswordValue', config.portalPassword);
    await page.click('#submit-signin-local');
    await page.waitForURL('**/', { timeout: 15_000 });
    this.loggedIn = true;
    console.log('[portal] Logged in successfully');
  }

  // ── Submit a single report ─────────────────────────────────

  async submitReport(report: SnowReport & { id: string }, dryRun = false): Promise<{ caseId?: string; dryRun: boolean }> {
    await this.ensureLoggedIn();
    const page = this.getPage();

    const mode = dryRun ? 'DRY RUN' : 'LIVE';
    console.log(`[portal] [${mode}] Submitting report ${report.id}: ${report.category} @ ${report.address}`);

    // Navigate to new request wizard
    await page.goto(`${PORTAL}/my-requests/New-Request/`, {
      waitUntil: 'domcontentloaded',
      timeout: 15_000,
    });

    // Wait for the form to be ready
    await page.waitForSelector('#casetypecode', { timeout: 10_000 });

    // ── Step 1: General Information ──
    await this.fillStep1(report.category);

    // ── Step 2: Location ──
    await this.fillStep2(report.address, report.lat, report.lng);

    // ── Step 3: Details & Submit ──
    const caseId = await this.fillStep3(report, dryRun);

    return { caseId, dryRun };
  }

  // ── Step 1 ─────────────────────────────────────────────────

  private async fillStep1(category: Category): Promise<void> {
    const page = this.getPage();
    const catConfig = CATEGORIES[category];

    console.log('[portal]   Step 1: Setting request type and case type...');

    // Set request type to "Problem"
    await page.selectOption('#casetypecode', '2');

    // Open case type lookup modal
    await page.click('button[aria-label="Case Type Launch lookup modal"]');
    await page.waitForSelector('.modal.in .query.form-control', { timeout: 10_000 });

    // Search for the case type
    await page.fill('.modal.in .query.form-control', catConfig.portalSearchTerm);
    await page.click('.modal.in button[aria-label="Search Results"]');
    await page.waitForSelector('.modal.in table tbody tr', { timeout: 10_000 });

    // Select the first result
    await page.click('.modal.in table tbody tr span[role="checkbox"]');
    await page.click('.modal.in .primary.btn.btn-primary');

    // Wait for modal to close
    await page.waitForSelector('.modal.in', { state: 'detached', timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(500);

    // Set notification preference to "No Contact Necessary"
    await page.selectOption('#cop_methodofupdate', '585680003');

    // Click Next
    await page.click('#NextButton');
    await page.waitForURL(/stepid/, { timeout: STEP_TIMEOUT });
    console.log('[portal]   Step 1 complete');
  }

  // ── Step 2 ─────────────────────────────────────────────────

  private async fillStep2(address: string, lat: number | null, lng: number | null): Promise<void> {
    const page = this.getPage();

    console.log('[portal]   Step 2: Setting location...');
    await page.waitForSelector('#addressIn', { timeout: 10_000 });

    if (lat && lng) {
      // We have exact coordinates — use ArcGIS reverse geocode to get the address
      // in the same format the portal expects, then set all fields directly
      const arcgisAddr = await this.arcgisReverseGeocode(lat, lng);

      if (arcgisAddr) {
        console.log(`[portal]   ArcGIS resolved: ${arcgisAddr.street}, ${arcgisAddr.city} ${arcgisAddr.zip}`);

        // Set the visible address input
        await page.fill('#addressIn', arcgisAddr.full);

        // Set all hidden/structured fields directly
        await page.evaluate((a) => {
          const set = (id: string, val: string) => {
            const el = document.getElementById(id) as HTMLInputElement | null;
            if (el) el.value = val;
          };
          set('cop_address', JSON.stringify(a.full));
          set('cop_street1', a.street);
          set('cop_city', a.city);
          set('cop_stateorprovidence', a.state);
          set('cop_zipofpostalcode', a.zip);
          set('cop_countryorregion', a.country);
          set('cop_latitude', a.lat);
          set('cop_longitude', a.lng);
        }, arcgisAddr);
      } else {
        // ArcGIS failed — fall back to autocomplete
        console.log('[portal]   ArcGIS reverse geocode failed, falling back to autocomplete');
        await this.fillStep2Autocomplete(address);
      }
    } else {
      // No coordinates — use autocomplete with the address string
      await this.fillStep2Autocomplete(address);
    }

    // Click Next
    await page.click('#NextButton');

    // Wait for step 3
    await page.waitForURL(/stepid/, { timeout: STEP_TIMEOUT });
    await page.waitForSelector('#description', { timeout: 10_000 });
    console.log('[portal]   Step 2 complete');
  }

  private async fillStep2Autocomplete(address: string): Promise<void> {
    const page = this.getPage();

    // Type address character by character to trigger autocomplete
    await page.locator('#addressIn').pressSequentially(address, { delay: 50 });

    // Wait for autocomplete suggestions
    await page.waitForSelector('tr.suggestRow', { timeout: 8_000 });

    // Click first suggestion to populate all hidden fields
    await page.click('tr.suggestRow td.suggestData');
    await page.waitForTimeout(1_000);
  }

  private async arcgisReverseGeocode(lat: number, lng: number): Promise<{
    full: string; street: string; city: string; state: string; zip: string; country: string; lat: string; lng: string;
  } | null> {
    try {
      const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${lng},${lat}&featureTypes=StreetAddress,StreetName,StreetInt&f=pjson`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data.address) return null;

      const a = data.address;
      return {
        full: a.LongLabel || a.Match_addr || `${a.Address}, ${a.City}, ${a.RegionAbbr}, ${a.Postal}, USA`,
        street: a.Address || a.ShortLabel || '',
        city: a.City || 'Providence',
        state: a.RegionAbbr || 'RI',
        zip: a.Postal || '',
        country: a.CountryCode || 'USA',
        lat: String(lat),
        lng: String(lng),
      };
    } catch (err) {
      console.error('[portal]   ArcGIS reverse geocode error:', err);
      return null;
    }
  }

  // ── Step 3 ─────────────────────────────────────────────────

  private async fillStep3(report: SnowReport & { id: string }, dryRun: boolean): Promise<string | undefined> {
    const page = this.getPage();

    console.log('[portal]   Step 3: Filling details...');

    // Build description text
    const descParts: string[] = [];
    if (report.description) descParts.push(report.description);
    if (report.lat && report.lng) {
      descParts.push(`Exact location: https://maps.google.com/?q=${report.lat.toFixed(6)},${report.lng.toFixed(6)}`);
    }
    descParts.push(`[Submitted via PVD Snow — ref:${report.id}]`);
    await page.fill('#description', descParts.join('\n\n'));

    // Upload photo if available
    if (report.photo) {
      await this.uploadPhoto(report.photo);
    }

    if (dryRun) {
      console.log('[portal]   DRY RUN — stopping before submit. Form is filled and ready.');
      console.log('[portal]   Browser will stay open. Close it manually or kill the process to continue.');
      // Wait indefinitely — let the operator inspect the filled form
      await page.waitForEvent('close', { timeout: 0 });
      return undefined;
    }

    // Submit
    await page.click('#NextButton');

    // Wait for navigation away from the wizard (back to my-requests or a confirmation)
    await page.waitForURL(/my-requests|New-Request/, { timeout: STEP_TIMEOUT });
    console.log('[portal]   Step 3 complete — report submitted');

    // Try to extract case ID from the my-requests page
    const caseId = await this.extractCaseId();
    return caseId;
  }

  // ── Photo upload ───────────────────────────────────────────

  private async uploadPhoto(photoSource: string): Promise<void> {
    const page = this.getPage();

    try {
      const tmpDir = join(tmpdir(), 'pvd311-photos');
      mkdirSync(tmpDir, { recursive: true });
      let tmpPath: string;

      if (photoSource.startsWith('data:')) {
        // Legacy base64 data URL
        const matches = photoSource.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          console.log('[portal]   Skipping photo upload — invalid data URL');
          return;
        }
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        tmpPath = join(tmpDir, `report-photo.${ext}`);
        writeFileSync(tmpPath, buffer);
      } else {
        // Cloud Storage URL — fetch to a temp file
        const resp = await fetch(photoSource);
        if (!resp.ok) {
          console.log(`[portal]   Skipping photo upload — fetch failed (${resp.status})`);
          return;
        }
        const buffer = Buffer.from(await resp.arrayBuffer());
        tmpPath = join(tmpDir, 'report-photo.jpg');
        writeFileSync(tmpPath, buffer);
      }

      // Use Playwright's file upload
      await page.setInputFiles('#AttachFile', tmpPath);

      // Trigger the portal's upload handler
      await page.evaluate(() => {
        if (typeof (window as any).chooseAttachment === 'function') {
          (window as any).chooseAttachment();
        }
      });

      await page.waitForTimeout(500);
      console.log('[portal]   Photo uploaded');
    } catch (err) {
      console.error('[portal]   Photo upload failed (non-fatal):', err);
    }
  }

  // ── Case ID extraction ─────────────────────────────────────

  private async extractCaseId(): Promise<string | undefined> {
    const page = this.getPage();

    try {
      // Navigate to my-requests and look for the most recent case
      await page.goto(`${PORTAL}/my-requests/`, {
        waitUntil: 'domcontentloaded',
        timeout: 15_000,
      });

      // Wait for the data grid to load
      await page.waitForSelector('[role="grid"] [role="row"]', { timeout: 10_000 });
      await page.waitForTimeout(2_000); // Grid is lazy-loaded

      // Get the first (most recent) case title cell
      const firstRow = page.locator('[role="grid"] [role="row"]').nth(1); // skip header
      const caseTitle = await firstRow.locator('[role="gridcell"]').first().textContent();

      if (caseTitle && /^PVD\d{4}-\d+$/.test(caseTitle.trim())) {
        console.log(`[portal]   Case ID: ${caseTitle.trim()}`);
        return caseTitle.trim();
      }
    } catch {
      console.log('[portal]   Could not extract case ID (non-fatal)');
    }

    return undefined;
  }
}
