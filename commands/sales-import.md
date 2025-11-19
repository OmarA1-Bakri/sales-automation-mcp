# Sales Import - Import Contacts from Multiple Sources

**Command:** `/sales-import`

**Description:** Import existing contacts from CSV files, Lemlist campaigns, HubSpot CRM, or manual lists.

---

## Supported Import Sources

1. **CSV Files** - Upload or specify path to CSV file
2. **Lemlist Campaigns** - Import leads from specific campaigns or all campaigns
3. **HubSpot CRM** - Import contacts from searches, lists, or filters
4. **Manual Lists** - Paste contact data directly

---

## Usage Examples

### 1. Import from CSV File

```
/sales-import

Source: CSV File
File Path: /path/to/contacts.csv
Skip Header: Yes
Deduplicate: Yes
```

**CSV Format** (auto-detected headers):

```csv
email,first name,last name,title,company,domain,phone,linkedin
john@acme.com,John,Doe,Head of Treasury,Acme Corp,acme.com,+44...,https://linkedin.com/in/johndoe
jane@example.com,Jane,Smith,VP Finance,Example Inc,example.com,+1...,https://linkedin.com/in/janesmith
```

**Supported Header Variations:**
- Email: `email`, `e-mail`, `email address`, `work email`, `contact email`
- First Name: `first name`, `firstname`, `fname`, `given name`, `first`
- Last Name: `last name`, `lastname`, `lname`, `surname`, `family name`, `last`
- Title: `title`, `job title`, `position`, `role`, `job role`
- Company: `company`, `company name`, `organization`, `employer`
- Domain: `domain`, `company domain`, `website`, `company website`
- Phone: `phone`, `phone number`, `telephone`, `mobile`
- LinkedIn: `linkedin`, `linkedin url`, `linkedin profile`, `li url`

**Custom Field Mapping:**

If your CSV has non-standard headers, you can provide a custom mapping:

```
/sales-import

Source: CSV File
File Path: /path/to/contacts.csv
Custom Mapping:
  email: Work Email
  firstName: First
  lastName: Last
  title: Job Title
  company: Company Name
```

### 2. Import from Lemlist Campaign

```
/sales-import

Source: Lemlist
Campaign: RTGS Treasury - Q1 2025
Status: all  # Options: all, replied, contacted, not_contacted
Limit: 1000
Deduplicate: Yes
```

**What Gets Imported:**
- All lead data from campaign
- Custom fields (if mapped in Lemlist)
- Campaign status and engagement history
- LinkedIn URLs (if enriched via Lemlist)

**Import All Campaigns:**

```
/sales-import

Source: Lemlist
Import All Campaigns: Yes
Deduplicate: Yes
```

Imports leads from every Lemlist campaign and deduplicates across all campaigns.

### 3. Import from HubSpot Search

```
/sales-import

Source: HubSpot
Filter: Contacts with lifecycle stage = "Lead"
Properties: email, firstname, lastname, jobtitle, company, phone, linkedin_url
Limit: 1000
Deduplicate: Yes
```

**Advanced Filters:**

```
/sales-import

Source: HubSpot
Filters:
  - Property: lifecyclestage
    Operator: EQ
    Value: lead
  - Property: hs_lead_status
    Operator: EQ
    Value: NEW
  - Property: createdate
    Operator: GTE
    Value: 2025-01-01
Limit: 5000
```

### 4. Import from HubSpot List

```
/sales-import

Source: HubSpot List
List ID: 12345
Deduplicate: Yes
```

Imports all contacts from a specific HubSpot list.

### 5. Manual Paste

```
/sales-import

Source: Manual
Data: |
  john@acme.com,John,Doe,Head of Treasury,Acme Corp
  jane@example.com,Jane,Smith,VP Finance,Example Inc
Format: CSV (comma-separated)
```

---

## Import Workflow

The import process follows these steps:

### 1. Fetch Data

**CSV**: Read file and parse rows
**Lemlist**: API call to fetch campaign leads
**HubSpot**: Search API or list members API
**Manual**: Parse pasted data

### 2. Field Mapping

- Auto-detect CSV headers (or use custom mapping)
- Map Lemlist/HubSpot fields to standard format
- Validate required fields (email, first/last name)

### 3. Validation

Check each contact:
- ✅ Email present
- ✅ Email format valid (basic regex)
- ✅ At least first or last name present
- ⚠️ Skip contacts missing required fields

### 4. Deduplication

If enabled:
- Check for duplicate emails within import batch
- Check against existing imported contacts in database
- Check against HubSpot CRM (optional)
- Keep first occurrence, skip duplicates

### 5. Storage

- Store in local database (`imported_contacts` table)
- Track source (csv, lemlist, hubspot, manual)
- Preserve original data as JSON
- Generate import summary

### 6. Next Steps

After import, you can:
- **Enrich** contacts using `/sales-enrich`
- **Sync to HubSpot** using `/sales-sync`
- **Enroll in campaigns** using `/sales-outreach`

---

## Import Options

### Deduplication Options

**By Email:**
```
Deduplicate: Yes
Deduplicate Against: imported_contacts, hubspot
```

**By Domain (company-level):**
```
Deduplicate: Yes
Deduplicate By: domain
Max Per Company: 5
```

### Validation Options

**Require Email Verification:**
```
Require Verified Email: Yes
Verification Method: syntax  # Options: syntax, api, skip
```

**Require Minimum Data Quality:**
```
Require Fields: email, firstName, lastName, title, company
Skip If Missing: title
```

### Batch Processing

**Large Imports:**
```
Batch Size: 1000
Delay Between Batches: 2 seconds
Continue On Error: Yes
```

---

## Import Examples

### Example 1: Import Lemlist Responders

```
/sales-import

Source: Lemlist
Campaign: All Campaigns
Status: replied
Deduplicate: Yes
```

**Result:**
- Import only leads who replied
- Useful for creating "warm leads" segment
- Enrich and create HubSpot deals

### Example 2: Import HubSpot Marketing Qualified Leads

```
/sales-import

Source: HubSpot
Filters:
  - Property: hs_lead_status
    Operator: EQ
    Value: MQL
Limit: 5000
Deduplicate: Yes
```

**Result:**
- Import MQL contacts
- Enrich with Explorium
- Route to sales outreach

### Example 3: Import Conference Attendee List

```
/sales-import

Source: CSV File
File Path: /Downloads/fintech_summit_attendees.csv
Custom Mapping:
  email: Email Address
  firstName: First Name
  lastName: Last Name
  company: Company
Deduplicate: Yes
```

**Result:**
- Import event attendees
- Validate against ICP
- Enrich high-scoring contacts
- Enroll in post-event follow-up campaign

---

## Import Validation & Quality

### Validation Report

After import, you'll receive a detailed report:

```
✅ Import Complete

Total Records: 1,234
✅ Valid: 1,150 (93%)
⚠️ Skipped: 84 (7%)

Skipped Breakdown:
  - Missing email: 45
  - Invalid email format: 12
  - Duplicate email: 20
  - Missing name: 7

Imported by Source:
  - CSV: 850
  - Lemlist: 200
  - HubSpot: 100

Next Steps:
  1. Review skipped contacts: /sales-import-review-skipped
  2. Enrich imported contacts: /sales-enrich --source imported
  3. Sync to HubSpot: /sales-sync --source imported
```

### Quality Checks

The system automatically:
- ✅ Validates email format
- ✅ Checks for required fields
- ✅ Detects duplicates
- ✅ Normalizes phone numbers
- ✅ Validates LinkedIn URLs
- ⚠️ Flags suspicious data (e.g., role@ emails, generic names)

---

## Integration with Workflow

### Standard Post-Import Workflow

```
1. Import contacts
   /sales-import --source lemlist --campaign "Q1 Campaign"

2. Review import
   /sales-import-summary

3. Enrich imported contacts
   /sales-enrich --source imported --min-quality 0.70

4. Sync to HubSpot
   /sales-sync --source enriched --deduplicate yes

5. Enroll in new campaign
   /sales-outreach --contacts enriched --campaign "Follow-up Q2"
```

### YOLO Mode Integration

If YOLO mode is enabled, imported contacts can be automatically:
- Enriched (if data quality check passes)
- Synced to HubSpot (if not already present)
- Enrolled in campaigns (based on ICP scoring)

**Configuration** (`.sales-automation/yolo-config.yaml`):

```yaml
import:
  auto_enrich_imported: true
  min_data_quality: 0.70

  auto_sync_imported: true
  deduplicate: true

  auto_enroll_imported: false  # Requires manual approval
```

---

## Troubleshooting

### Issue: CSV Import Failed

**Symptoms:** "Failed to parse CSV" error

**Solutions:**
1. Check file encoding (should be UTF-8)
2. Ensure consistent column count across all rows
3. Escape commas in data fields (use quotes: `"Doe, John"`)
4. Remove special characters from headers

### Issue: Many Contacts Skipped

**Symptoms:** High skip rate (> 20%)

**Solutions:**
1. Review skipped contacts: `/sales-import-review-skipped`
2. Check CSV format and headers
3. Ensure email column is populated
4. Verify name columns exist

### Issue: Lemlist Import Empty

**Symptoms:** "Found 0 leads" message

**Solutions:**
1. Verify campaign ID is correct
2. Check campaign has leads enrolled
3. Confirm Lemlist API key has proper permissions
4. Try listing all campaigns first: `/lemlist_getCampaigns`

### Issue: HubSpot Import Rate Limited

**Symptoms:** "Rate limit exceeded" errors

**Solutions:**
1. Reduce batch size
2. Add delay between batches
3. Use HubSpot batch API (automatic for > 100 contacts)
4. Check HubSpot API quota: `/sales-diagnose`

---

## Advanced Usage

### Import + Enrich + Sync Pipeline

```
/sales-import-pipeline

Source: CSV
File: /path/to/leads.csv
Enrich: Yes (min quality: 0.75)
Sync to HubSpot: Yes (deduplicate: Yes)
Enroll in Campaign: No (manual review)
```

Single command that:
1. Imports from CSV
2. Enriches all contacts
3. Syncs high-quality (> 0.75) to HubSpot
4. Queues for manual campaign enrollment review

### Scheduled Imports

Configure automatic imports:

```yaml
# .sales-automation/yolo-config.yaml
scheduled_imports:
  - source: lemlist
    campaign_ids: ["all"]
    status: replied
    schedule: "0 9 * * *"  # Daily at 9am
    enrich: true
    sync_to_hubspot: true

  - source: hubspot
    filters:
      - property: lifecyclestage
        operator: EQ
        value: MQL
    schedule: "0 */6 * * *"  # Every 6 hours
    enrich: false  # Already in HubSpot
```

---

## Best Practices

1. **Start Small**: Import 10-50 contacts first to test mapping
2. **Check Deduplication**: Always enable deduplication for first import
3. **Validate Data**: Review import summary before enriching
4. **Source Tracking**: Imports are tagged with source for easy filtering
5. **Regular Imports**: Set up scheduled imports for active campaigns

---

**Ready to import?** Start with `/sales-import` and select your source! 📥
