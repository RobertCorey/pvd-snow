# PVD 311 Portal Research

## Technology Stack

| Component | Technology | Version/Details |
|---|---|---|
| Platform | Microsoft Power Pages (gov cloud) | `gov.content.powerapps.us` |
| Backend | ASP.NET WebForms | ViewState, EventValidation, `__doPostBack` |
| Form Engine | Dynamics 365 Portal Web Forms | `#liquid_form`, entity `incident` |
| jQuery | jQuery | 3.6.2 (+ jQuery Migrate 3.4) |
| CSS Framework | Bootstrap 3 | `bootstrap.min.css` |
| Maps | ArcGIS JS SDK | 4.30 (`js.arcgis.com/4.30/`) |
| Geocoding | ArcGIS World Geocode Server | `geocode.arcgis.com` |
| Telemetry | Microsoft 1DS, Google Analytics | `tb.events.data.microsoft.com`, GA4 |
| Icons | Font Awesome | Bundled via Power Pages |
| PCF Controls | Power Apps Component Framework | Toggle switches, data grids |
| Translation | GTranslate | `cdn.gtranslate.net` |

## CSS Class Stability Assessment

**SAFE** - All classes are semantic Bootstrap/Power Pages names. No CSS modules, no hash-based generated classes found.

Examples of stable patterns:
- Bootstrap: `btn btn-primary`, `form-control`, `modal fade`, `navbar`
- Power Pages: `picklist`, `lookup`, `launchentitylookup`, `clearlookupfield`
- Custom: `suggestRow`, `suggestData`, `addressIn`, `ContainerForFile`

**ONE RISK**: Close button for address fullscreen has single-letter classes: `c d e f g h i j k l m n flexbox` (id: `closeButton|addressSuggest`). Avoid relying on these.

## Authentication

### Login Flow
- **URL**: `https://311.providenceri.gov/SignIn?returnUrl=%2F`
- **Type**: Local account (email + password), no SSO, no MFA
- **CSRF**: `__RequestVerificationToken` hidden field in form
- **Form**: POST to `/SignIn?ReturnUrl=%2F`
- **Session**: httpOnly cookies (not visible to `document.cookie`), server-side session
- **After login**: Username shown as `.username` span in navbar

### Login Selectors
| Element | Selector | Type |
|---|---|---|
| Email | `#Username` | text input |
| Password | `#PasswordValue` | password input |
| Sign In button | `#submit-signin-local` | button (submit) |
| Remember Me | `#RememberMe` | checkbox |

### Auth Cookies (all HttpOnly, session-scoped)
| Cookie | Purpose |
|---|---|
| `.AspNet.ApplicationCookie` | Primary auth (598 chars) |
| `ASP.NET_SessionId` | Server session ID |
| `__RequestVerificationToken` | CSRF token |
| `ARRAffinity` / `ARRAffinitySameSite` | Azure App Service load balancer affinity |
| `Dynamics365PortalAnalytics` | Portal analytics (90-day expiry) |

### Session Notes
- Session may be short-lived — observed redirects to login between navigations
- Sign out: `GET /Account/Login/LogOff?returnUrl=%2F`
- Hosting: Azure App Service (evident from ARRAffinity cookies)

## Wizard Overview

- **Form ID**: `#liquid_form`
- **Entity**: `incident` (Dynamics 365 Case)
- **3 steps**: General Info -> Location -> Details & Submit
- **Draft created**: On Step 1 submit (entity ID populated in `EntityFormView_EntityID`)
- **Step tracking**: URL params `?stepid={guid}&sessionid={guid}`
- **Navigation**: `#NextButton` (type=button, triggers ASP.NET postback via onclick)
- **Postback time**: 5-15 seconds per step transition

### Next Button onclick Pattern
```javascript
javascript:if(typeof webFormClientValidate === 'function'){
  if(webFormClientValidate()){
    if(typeof Page_ClientValidate === 'function'){
      if(Page_ClientValidate('')){
        clearIsDirty();disableButtons();this.value = 'Processing...';
      }
    } else {
      clearIsDirty();disableButtons();this.value = 'Processing...';
    }
  } else { return false; }
} else { ... }
```

## Step 1: General Information

### Form Controls

| Field | Selector | Type | Values | Notes |
|---|---|---|---|---|
| Case Title | `#title` | text | Default: "New Case" | Hidden from user in some views |
| Constituent | `#customerid_name` | text (readonly) | Auto-populated from login | Hidden: `#customerid` = contact GUID |
| Request Type | `#casetypecode` | select | `""` Select, `"1"` Question, `"2"` Problem, `"3"` Request, `"585680001"` Comment | **Set to "2" (Problem)** |
| Case Type (display) | `#cop_casetype_name` | text (readonly) | Set via lookup modal | |
| Case Type (value) | `#cop_casetype` | hidden | GUID of selected case type | |
| Case Type (entity) | `#cop_casetype_entityname` | hidden | Always `"cop_casetype"` | |
| Notification | `#cop_methodofupdate` | select | `"585680002"` Email (default), `"585680000"` Phone, `"585680001"` Text, `"585680003"` No Contact Necessary, `"585680004"` Portal Comment | **Set to "585680003"** |
| Privacy Toggle | `#Toggle0` | button role=switch | aria-label contains "No"/"Yes" | Hidden: `#cop_private` |
| Next | `#NextButton` | input type=button | value="Next" | class: `btn btn-primary button next submit-btn` |

### Case Type Lookup Modal

**Open**: Click `button[aria-label="Case Type Launch lookup modal"]` (class: `launchentitylookup`)
**Modal**: `.modal.fade.modal-lookup.in` (Bootstrap modal)

| Element | Selector | Notes |
|---|---|---|
| Search input | `.modal.in .query.form-control` | aria-label: "To search on partial text, use the asterisk (*) wildcard character." |
| Search button | `.modal.in button[aria-label="Search Results"]` | class: `btn btn-default btn-hg` |
| Results table | `.modal.in table tbody tr` | Each row has `data-id`, `data-entity`, `data-name` |
| Row checkbox | `tr span[role="checkbox"]` | NOT a real `<input>` - it's a `<span>` with `aria-checked` |
| Select button | `.modal.in .primary.btn.btn-primary` | aria-label: "Select" |
| Cancel | `.modal.in .cancel.btn.btn-default` | aria-label: "Cancel" |
| Pagination | `.modal.in ul.pagination li button` | 13 pages, 10 per page |

**Lookup API**: `POST /_services/entity-lookup-grid-data.json/{portalId}`

### Case Type GUIDs

| PVD Snow Category | 311 Case Type | GUID | Search Term |
|---|---|---|---|
| `unshoveled_sidewalk` | Report Un-shoveled Sidewalks | `b8e7b671-7a2e-ef11-840a-001dd8039400` | `*shoveled*` |
| `missed_plowing` | Snow Plowing or Salting or Sanding Request | `5ae8b671-7a2e-ef11-840a-001dd8039400` | `*plowing*` |
| `icy_crosswalk` | Snow Plowing or Salting or Sanding Request | `5ae8b671-7a2e-ef11-840a-001dd8039400` | `*plowing*` |

## Step 2: Location

### Form Controls

| Field | Selector | Type | Notes |
|---|---|---|---|
| Address (visible) | `#addressIn` | text | class: `addressIn`, NO name attribute, JS-driven |
| Address (hidden) | `#cop_address` | hidden | Stores full formatted address |
| Street | `#cop_street1` | text | **Required for validation** (aria-label: "Street") |
| Street 2 | `#cop_street2` | text | Location Details |
| City | `#cop_city` | text | |
| State | `#cop_stateorprovidence` | text | Note: typo "providence" in field name |
| Zip | `#cop_zipofpostalcode` | text | |
| Country | `#cop_countryorregion` | text | |
| Longitude | `#cop_longitude` | text (double) | **Required** (`required: true`) |
| Latitude | `#cop_latitude` | text (double) | **Required** (`required: true`) |
| Case Type (readonly) | `#cop_casetype_name` | text | Disabled, shows selected case type |
| Previous | `#PreviousButton` | input type=button | |
| Next | `#NextButton` | input type=button | |

### ArcGIS Autocomplete Mechanism

1. User types in `#addressIn`
2. Per-keystroke requests to: `GET geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/suggest`
   - Parameters: `text`, `f=pjson`, `category=intersection,address,POI`, `location=-71.41283,41.82399`, `searchExtent` (bounding box WKID 102730)
3. Suggestions appear as: `table > tbody > tr.suggestRow > td.suggestData`
4. On click suggestion: `GET geocode.arcgis.com/.../findAddressCandidates` with `magickey` token
5. JS populates ALL hidden fields: `cop_address`, `cop_street1`, `cop_city`, `cop_stateorprovidence`, `cop_zipofpostalcode`, `cop_countryorregion`, `cop_longitude`, `cop_latitude`

### Validation Requirements
Clicking Next without selecting a suggestion triggers: "Street is a required field. longitude is a required field. Latitude is a required field."

**Critical**: Just typing text in `#addressIn` is NOT enough. Must click a suggestion to populate hidden fields.

### Direct Field Population: DOES NOT WORK
Tested setting all hidden fields (`cop_street1`, `cop_city`, `cop_longitude`, `cop_latitude`, etc.) directly via `document.getElementById().value = ...` with change/input event dispatch. Result: **500 Server Error**. The server-side validation rejects values not set through the ArcGIS autocomplete flow. Likely because ASP.NET EventValidation tracks which controls were legitimately interacted with.

**Conclusion: MUST use the autocomplete flow** (type in `#addressIn` → wait for `tr.suggestRow` → click suggestion).

## Step 3: Details & Submit

### Visible Form Controls

| Field | Selector | Type | Notes |
|---|---|---|---|
| Case Type (readonly) | `#cop_casetype_name` | text (disabled) | Shows selected case type |
| Instructions | iframe > `#cop_instructions` | text (readonly) | Loaded via quickform iframe |
| Address (readonly) | `#cop_address` | text (readonly) | From Step 2 |
| Description | `#description` | textarea | maxLength: 150,000 chars, aria-label: "Description" |
| Add Comment | button `"Add comment"` | button | Opens comment input |
| Upload button | `#UploadButton` | button | onclick: `selectAttachment()` |
| File input | `#AttachFile` | file | `multiple=true`, `accept="*/*,"`, onchange: `chooseAttachment()` |
| Previous | `#PreviousButton` | input type=button | |
| Submit | `#NextButton` | input type=button | value="Submit" (same ID as Next, text changes) |

### Conditional Fields (ALL HIDDEN for snow case types)
26 hidden selects/toggles for other case types (animal control, dumpster type, rodent, traffic lights, etc.). **None visible** for sidewalk or plowing cases.

### File Upload Mechanism

**Hidden fields controlling upload:**
| Field | Value |
|---|---|
| `AttachFile_HiddenField_Location` | `CrmDocument` |
| `AttachFile_HiddenField_FormID` | Step 3 `stepid` GUID |
| `AttachFile_HiddenField_RegardingId` | Entity (incident) GUID |
| `AttachFile_HiddenField_MaxFile` | `5` |

**Upload flow:**
1. `selectAttachment()` → triggers `#AttachFile.click()` → creates progress bar UI
2. User selects file(s) → `chooseAttachment()` fires (onchange handler)
3. `chooseAttachment()`:
   - Validates files (count, size)
   - Max 5 files, each under 13MB (13,500 KB)
   - Creates file info display elements
   - Disables upload button at max
4. Files are submitted with the form POST (not AJAX upload)

**For Playwright automation:**
```javascript
await page.setInputFiles('#AttachFile', '/path/to/photo.jpg');
// Then manually trigger chooseAttachment() or dispatch change event
```

### Submit Button
Same `#NextButton` element, but with `value="Submit"` on Step 3. Clicking triggers the same `webFormClientValidate` → `__doPostBack` flow, which creates the final case.

## ASP.NET Internals

### Hidden Fields (present on every step)
| Field | Purpose |
|---|---|
| `__VIEWSTATE` | ASP.NET view state (encrypted, changes per step) |
| `__VIEWSTATEGENERATOR` | Always `1128FCF4` |
| `__VIEWSTATEENCRYPTED` | Empty (encryption marker) |
| `__EVENTVALIDATION` | ASP.NET event validation |
| `__EVENTTARGET` | Postback target |
| `__EVENTARGUMENT` | Postback argument |
| `EntityFormView_EntityName` | Always `incident` |
| `EntityFormView_EntityID` | GUID of draft incident (populated after Step 1) |
| `EntityFormView_EntityState` | `0` |
| `EntityFormView_EntityStatus` | `585680001` (Draft) |

### ASP.NET Control Naming
All form fields use fully-qualified names:
```
ctl00$ContentContainer$WebFormControl_7036506cdf1b42a3900751d2f5898d89$EntityFormView${fieldName}
```
The `WebFormControl_7036506cdf1b42a3900751d2f5898d89` GUID appears stable (same across sessions).

## API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/SignIn?ReturnUrl=%2F` | POST | Login |
| `/my-requests/New-Request/` | GET/POST | Wizard (Step 1 load / postback) |
| `/my-requests/New-Request/?stepid=...&sessionid=...` | GET/POST | Steps 2-3 |
| `/_services/entity-lookup-grid-data.json/{portalId}` | POST | Case type lookup search |
| `/_layout/tokenhtml` | GET | Token refresh |
| `/_portal/{portalId}/EntityActivity/GetActivities` | POST | Load comments/activities |
| `geocode.arcgis.com/.../suggest` | GET | Address autocomplete |
| `geocode.arcgis.com/.../findAddressCandidates` | GET | Address resolution (after suggestion click) |

## My Requests Page

- **URL**: `/my-requests/`
- **Grid**: PCF `data_grid` control with `role="grid"`
- **Columns**: Case Title, Street, Status Reason, Created On
- **Status values**: "Draft" (created when wizard starts), presumably "Active"/"Resolved" after submission
- **Case IDs**: Format `PVD2026-XXXXX` (e.g., PVD2026-72841)
- **Lazy loaded**: Grid takes ~2-3 seconds to populate after page load
- **Search**: Supports wildcard search like the case type lookup

**Note**: Each wizard entry creates a draft immediately on Step 1 submit. These persist even if the wizard is abandoned.

## Proven Playwright Automation Patterns

### Step 1 (single run_code block, ~15s total)
```javascript
await page.locator('#casetypecode').selectOption('2'); // Problem
await page.locator('button[aria-label="Case Type Launch lookup modal"]').click();
await page.waitForSelector('.modal.in .query.form-control');
await page.locator('.modal.in .query.form-control').fill('*shoveled*');
await page.locator('.modal.in button[aria-label="Search Results"]').click();
await page.waitForSelector('.modal.in table tbody tr');
await page.locator('.modal.in table tbody tr span[role="checkbox"]').click();
await page.locator('.modal.in .primary.btn.btn-primary').click();
await page.waitForTimeout(500);
await page.locator('#cop_methodofupdate').selectOption('585680003');
await page.locator('#NextButton').click();
await page.waitForURL(/stepid/, { timeout: 20000 });
```

### Step 2 (autocomplete required, ~10s total)
```javascript
await page.locator('#addressIn').pressSequentially('100 Dorrance St', { delay: 50 });
await page.waitForSelector('tr.suggestRow', { timeout: 5000 });
await page.locator('tr.suggestRow td.suggestData').first().click();
await page.waitForTimeout(1000); // Wait for hidden fields to populate
await page.locator('#NextButton').click();
await page.waitForURL(/stepid=(?!b86b9325)/, { timeout: 20000 }); // Different stepid
```

### Step 3 (fill + upload, DO NOT click Submit in testing)
```javascript
await page.locator('#description').fill('Description text here');
await page.setInputFiles('#AttachFile', '/path/to/photo.jpg');
// Trigger chooseAttachment manually if needed:
// await page.evaluate(() => chooseAttachment());
// SUBMIT: await page.locator('#NextButton').click();
```

## Risks & Considerations

### Selector Stability
- **IDs are stable**: `#NextButton`, `#PreviousButton`, `#AttachFile`, `#UploadButton`, `#addressIn`, all `#cop_*` fields, `#casetypecode`, `#cop_methodofupdate`
- **Classes are stable**: Bootstrap standard, no CSS modules
- **aria-labels stable**: `"Case Type Launch lookup modal"`, `"Search Results"`, `"Select"`, etc.
- **Unstable elements**:
  - Close fullscreen button: single-letter classes `c d e f g h i j k l m n`
  - Toggle CSS-in-JS suffixes: `pill-112`, `container-111`, `thumb-113` — may change between loads
  - Search filter ID contains GUID: `#filter-f8ee8019-...` — avoid
- **Two lookup modals** exist in DOM (Constituent + Case Type) — distinguish by aria-label on launch button: `"Case Type Launch lookup modal"` vs `"Constituent Launch lookup modal"`
- **ASP.NET control name GUID** `7036506cdf1b42a3900751d2f5898d89` in all field names — likely stable but could change if form is reconfigured in Dynamics 365

### Timing
- Step transitions take 5-15 seconds (ASP.NET postback + full page reload)
- Address autocomplete: ~200-500ms per suggestion request
- Must wait for suggestions to appear before clicking

### Draft Records
- A draft incident is created immediately when Step 1 is submitted
- If automation fails mid-wizard, orphaned drafts remain in the system
- Consider cleanup strategy for drafts

### File Upload
- Files submitted with form POST, not AJAX
- Max 5 files, 13MB each
- `page.setInputFiles()` should work but need to trigger `chooseAttachment()` after

### Error Patterns
- react_16_8_6.js consistently returns 409 (Conflict) — pre-existing issue, not blocking
- Form validation is client-side (`webFormClientValidate`) + server-side
