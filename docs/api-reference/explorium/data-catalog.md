# Explorium Data Catalog - Field Mapping

**Complete reference for all available Explorium enrichment fields and their corresponding API endpoints**

---

## Overview

This document maps the complete Explorium data catalog to API endpoints in the ExploriumClient implementation.

**Status Legend:**
- ✅ Implemented and parsed
- 🟡 Endpoint exists but fields not fully parsed
- ❌ Not yet implemented

---

## Contact/Prospect Enrichment

### 1. Contact Details ✅
**API Endpoint:** `POST /v1/prospects/contacts_information/enrich`

| Field Name (API) | Description | Type | Currently Parsed |
|-----------------|-------------|------|-----------------|
| `email` | Email address | string | ✅ |
| `personal_email` | Personal email address | string | ❌ |
| `email_validation` | Email verification status | object | ✅ (as `emailVerified`) |
| `phone_number` | Phone number | string | ✅ (as `phoneNumber`) |
| `phone_number_validation` | Phone validation status | object | ❌ |

**Email Validation Object Fields:**
- `deliverable`: boolean
- `valid_format`: boolean
- `disposable`: boolean
- `role_based`: boolean
- `catch_all`: boolean

### 2. Professional Profile ✅
**API Endpoint:** `POST /v1/prospects/profiles/enrich`

| Field Name (API) | Description | Type | Currently Parsed |
|-----------------|-------------|------|-----------------|
| `full_name` | Full name | string | ✅ (firstName + lastName) |
| `first_name` | First name | string | ✅ |
| `last_name` | Last name | string | ✅ |
| `current_job_title` | Current job title | string | ✅ (as `title`) |
| `current_company` | Current company name | string | ✅ |
| `current_company_domain` | Company domain | string | ✅ |
| `seniority_level` | Seniority level | string | ✅ (as `seniority`) |
| `department` | Department | string | ✅ |
| `linkedin_url` | LinkedIn profile URL | string | ✅ (as `linkedinUrl`) |
| `twitter_handle` | Twitter handle | string | ❌ |
| `facebook_url` | Facebook URL | string | ❌ |
| `location` | Geographic location | string | ❌ |
| `country` | Country | string | ❌ |
| `city` | City | string | ❌ |
| `state` | State/Province | string | ❌ |
| `years_of_experience` | Total years experience | integer | ❌ |
| `years_in_current_role` | Years in current role | integer | ❌ |
| `previous_companies` | Array of previous employers | array | ❌ |
| `education` | Education history | array | ❌ |
| `skills` | Professional skills | array | ❌ |
| `certifications` | Professional certifications | array | ❌ |

### 3. Individual's Social Media Presence ❌
**API Endpoint:** `POST /v1/prospects/social_media/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `linkedin_followers` | LinkedIn follower count | integer |
| `linkedin_connections` | LinkedIn connection count | integer |
| `linkedin_posts_last_30_days` | Recent LinkedIn activity | integer |
| `twitter_followers` | Twitter follower count | integer |
| `twitter_following` | Twitter following count | integer |
| `twitter_tweets` | Total tweets | integer |
| `instagram_followers` | Instagram follower count | integer |
| `youtube_subscribers` | YouTube subscriber count | integer |

---

## Company/Business Enrichment

### 4. Firmographics 🟡
**API Endpoint:** `POST /v1/businesses/firmographics/enrich`

| Field Name (API) | Description | Type | Currently Parsed |
|-----------------|-------------|------|-----------------|
| `business_name` | Company name | string | ✅ (as `name`) |
| `domain` | Company domain | string | ✅ |
| `industry` | Industry classification | string | ✅ |
| `sub_industry` | Sub-industry | string | ❌ |
| `naics_code` | NAICS code | string | ❌ |
| `sic_code` | SIC code | string | ❌ |
| `employee_count` | Number of employees | integer | ✅ (as `employees`) |
| `employee_range` | Employee count range | string | ❌ |
| `annual_revenue` | Annual revenue | integer | ✅ (as `revenue`) |
| `revenue_range` | Revenue range | string | ❌ |
| `founded_year` | Year founded | integer | ❌ |
| `company_type` | Type (public/private) | string | ❌ |
| `business_model` | Business model | string | ❌ |
| `headquarters_location` | HQ location | string | ❌ |
| `headquarters_country` | HQ country | string | ❌ |
| `headquarters_city` | HQ city | string | ❌ |
| `headquarters_state` | HQ state | string | ❌ |
| `headquarters_zip` | HQ zip code | string | ❌ |
| `total_offices` | Number of offices | integer | ❌ |
| `office_locations` | Array of office locations | array | ❌ |
| `phone_number` | Company phone | string | ❌ |
| `company_description` | Description | string | ❌ |
| `tagline` | Company tagline | string | ❌ |
| `logo_url` | Company logo URL | string | ❌ |
| `website_url` | Website URL | string | ❌ |
| `linkedin_url` | Company LinkedIn | string | ❌ |
| `twitter_handle` | Company Twitter | string | ❌ |
| `facebook_url` | Company Facebook | string | ❌ |
| `crunchbase_url` | Crunchbase profile | string | ❌ |
| `stock_symbol` | Stock ticker | string | ❌ |
| `stock_exchange` | Exchange (NYSE, NASDAQ) | string | ❌ |
| `ipo_date` | IPO date | date | ❌ |
| `parent_company` | Parent company | string | ❌ |
| `subsidiaries` | Array of subsidiaries | array | ❌ |
| `competitors` | Array of competitors | array | ❌ |

### 5. Technographics 🟡
**API Endpoint:** `POST /v1/businesses/technographics/enrich`

**Technology Categories (20+):**
- Analytics & Tracking
- Advertising & Marketing
- CRM & Sales
- E-commerce
- Payment Processing
- Cloud Infrastructure
- CDN & Hosting
- Security
- Email & Communication
- Developer Tools
- Databases
- CMS
- Customer Support
- HR & Recruiting
- Finance & Accounting
- Productivity
- Design & Media
- Business Intelligence
- DevOps & Monitoring
- AI & Machine Learning

| Field Name (API) | Description | Type | Currently Parsed |
|-----------------|-------------|------|-----------------|
| `technologies` | Array of all technologies | array | ✅ (partial) |
| `analytics_tools` | Analytics platforms | array | ❌ |
| `crm_platforms` | CRM systems | array | ❌ |
| `marketing_automation` | Marketing tools | array | ❌ |
| `ecommerce_platforms` | E-commerce systems | array | ❌ |
| `payment_processors` | Payment gateways | array | ❌ |
| `cloud_providers` | Cloud infrastructure | array | ❌ |
| `cdn_providers` | CDN services | array | ❌ |
| `security_tools` | Security software | array | ❌ |
| `databases` | Database systems | array | ❌ |
| `programming_languages` | Languages used | array | ❌ |
| `frameworks` | Development frameworks | array | ❌ |
| `cms_platforms` | Content management | array | ❌ |

### 6. Funding & Acquisitions 🟡
**API Endpoint:** `POST /v1/businesses/funding_and_acquisition/enrich`

| Field Name (API) | Description | Type | Currently Parsed |
|-----------------|-------------|------|-----------------|
| `total_funding_amount` | Total raised | integer | ❌ |
| `last_funding_amount` | Most recent round | integer | ❌ |
| `last_funding_date` | Date of last round | date | ❌ |
| `funding_stage` | Current stage | string | ✅ |
| `funding_rounds` | Array of all rounds | array | ❌ |
| `investors` | Array of investors | array | ❌ |
| `lead_investors` | Lead investors | array | ❌ |
| `valuation` | Company valuation | integer | ❌ |
| `acquisition_status` | Acquired or not | boolean | ❌ |
| `acquired_by` | Acquiring company | string | ❌ |
| `acquisition_date` | Acquisition date | date | ❌ |
| `acquisition_price` | Acquisition amount | integer | ❌ |
| `acquisitions_made` | Companies acquired | array | ❌ |
| `ipo_status` | IPO status | string | ❌ |
| `ipo_date` | IPO date | date | ❌ |
| `ipo_valuation` | IPO valuation | integer | ❌ |

### 7. Webstack ❌
**API Endpoint:** `POST /v1/businesses/webstack/enrich` (NOT YET IMPLEMENTED)

**70+ Technology Detection Fields:**
- Web servers (Apache, Nginx, IIS)
- CDN (Cloudflare, Akamai, Fastly)
- SSL certificates
- DNS providers
- Email providers
- CMS platforms
- Analytics
- Advertising networks
- Social widgets
- Live chat
- A/B testing tools
- Tag managers
- And 50+ more categories

### 8. Company Hierarchy ❌
**API Endpoint:** `POST /v1/businesses/hierarchy/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `parent_company` | Ultimate parent | string |
| `immediate_parent` | Direct parent | string |
| `subsidiaries` | Child companies | array |
| `sister_companies` | Sibling entities | array |
| `ownership_percentage` | Ownership % | float |
| `hierarchy_level` | Level in tree | integer |

### 9. Financial Metrics for Public Companies ❌
**API Endpoint:** `POST /v1/businesses/financial_metrics/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `market_cap` | Market capitalization | integer |
| `revenue` | Annual revenue | integer |
| `revenue_growth_yoy` | YoY revenue growth | float |
| `profit_margin` | Profit margin | float |
| `ebitda` | EBITDA | integer |
| `pe_ratio` | P/E ratio | float |
| `debt_to_equity` | Debt/equity ratio | float |
| `current_ratio` | Current ratio | float |
| `quick_ratio` | Quick ratio | float |
| `roe` | Return on equity | float |
| `roa` | Return on assets | float |
| `cash_flow` | Operating cash flow | integer |
| `free_cash_flow` | Free cash flow | integer |
| `quarterly_earnings` | Recent earnings | array |
| `dividend_yield` | Dividend yield | float |
| `beta` | Stock beta | float |
| `52_week_high` | 52-week high | float |
| `52_week_low` | 52-week low | float |
| `current_stock_price` | Current price | float |

### 10. Workforce Trends by Department 🟡
**API Endpoint:** `POST /v1/businesses/workforce_trends/enrich`

**Per Department (Engineering, Sales, Marketing, etc.):**
- Current headcount
- Headcount 3 months ago
- Headcount 6 months ago
- Growth rate (3 month)
- Growth rate (6 month)
- New hires last 30 days
- Departures last 30 days
- Open positions
- Average tenure
- Average seniority

| Field Name (API) | Description | Type | Currently Parsed |
|-----------------|-------------|------|-----------------|
| `total_employees` | Total headcount | integer | ✅ |
| `employee_growth_6m` | 6-month growth | float | ❌ |
| `engineering_headcount` | Engineering team size | integer | ❌ |
| `sales_headcount` | Sales team size | integer | ❌ |
| `marketing_headcount` | Marketing team size | integer | ❌ |
| `product_headcount` | Product team size | integer | ❌ |
| `operations_headcount` | Operations team size | integer | ❌ |
| `hr_headcount` | HR team size | integer | ❌ |
| `finance_headcount` | Finance team size | integer | ❌ |
| `customer_success_headcount` | CS team size | integer | ❌ |
| `engineering_growth_rate` | Engineering growth | float | ❌ |
| `sales_growth_rate` | Sales growth | float | ❌ |
| `new_hires_last_30_days` | Recent hires | integer | ❌ |
| `departures_last_30_days` | Recent departures | integer | ❌ |
| `open_positions` | Job openings | integer | ❌ |

### 11. Company Ratings by Employees ❌
**API Endpoint:** `POST /v1/businesses/employee_ratings/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `glassdoor_rating` | Overall rating | float |
| `glassdoor_reviews_count` | Number of reviews | integer |
| `culture_rating` | Culture score | float |
| `work_life_balance_rating` | Work-life balance | float |
| `compensation_rating` | Compensation score | float |
| `career_opportunities_rating` | Career growth | float |
| `senior_management_rating` | Leadership score | float |
| `recommend_to_friend_pct` | Recommendation % | float |
| `ceo_approval_rating` | CEO approval | float |
| `diversity_rating` | Diversity score | float |
| `recent_reviews` | Recent review text | array |
| `pros` | Common pros | array |
| `cons` | Common cons | array |

### 12. Company's Social Media Presence ❌
**API Endpoint:** `POST /v1/businesses/social_media/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `linkedin_followers` | LinkedIn followers | integer |
| `linkedin_employee_count` | Employees on LinkedIn | integer |
| `linkedin_posts_last_30_days` | Recent posts | integer |
| `linkedin_engagement_rate` | Engagement rate | float |
| `twitter_followers` | Twitter followers | integer |
| `twitter_following` | Twitter following | integer |
| `twitter_tweets` | Total tweets | integer |
| `twitter_engagement_rate` | Engagement rate | float |
| `facebook_likes` | Facebook likes | integer |
| `facebook_followers` | Facebook followers | integer |
| `instagram_followers` | Instagram followers | integer |
| `youtube_subscribers` | YouTube subscribers | integer |
| `youtube_videos` | Total videos | integer |

### 13. Strategic Insights on Public Companies ❌
**API Endpoint:** `POST /v1/businesses/strategic_insights/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `strategic_priorities` | Current priorities | array |
| `growth_strategy` | Growth approach | string |
| `market_positioning` | Market position | string |
| `competitive_advantages` | Key advantages | array |
| `target_markets` | Target markets | array |
| `expansion_plans` | Expansion strategy | array |
| `innovation_focus` | Innovation areas | array |
| `recent_initiatives` | Recent programs | array |

### 14. Business Challenges of Public Companies ❌
**API Endpoint:** `POST /v1/businesses/challenges/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `current_challenges` | Active challenges | array |
| `regulatory_concerns` | Regulatory issues | array |
| `competitive_threats` | Competitor threats | array |
| `operational_risks` | Operational risks | array |
| `financial_concerns` | Financial issues | array |
| `market_headwinds` | Market challenges | array |

### 15. Competitive Landscape ❌
**API Endpoint:** `POST /v1/businesses/competitive_landscape/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `direct_competitors` | Direct competitors | array |
| `indirect_competitors` | Indirect competitors | array |
| `market_share` | Market share % | float |
| `competitive_position` | Market position | string |
| `competitive_advantages` | Key advantages | array |
| `competitive_disadvantages` | Weaknesses | array |

### 16. Lookalike Companies ❌
**API Endpoint:** `POST /v1/businesses/lookalikes/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `similar_companies` | Similar companies | array |
| `similarity_score` | Match score | float |
| `matching_attributes` | Shared attributes | array |

### 17. Keyword Search on Websites ❌
**API Endpoint:** `POST /v1/businesses/website_keywords/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `keyword_mentions` | Keyword occurrences | array |
| `context` | Surrounding text | array |
| `pages` | Pages where found | array |
| `last_updated` | Last modified date | date |

### 18. Website Content Changes ❌
**API Endpoint:** `POST /v1/businesses/website_changes/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `recent_changes` | Recent updates | array |
| `change_date` | When changed | date |
| `change_type` | Type of change | string |
| `affected_pages` | Modified pages | array |

### 19. Business Intent Topics (Bombora) ❌
**API Endpoint:** `POST /v1/businesses/intent_topics/enrich` (NOT YET IMPLEMENTED)

| Field Name (API) | Description | Type |
|-----------------|-------------|------|
| `intent_topics` | Intent signals | array |
| `topic_score` | Signal strength | integer |
| `trending_topics` | Trending research | array |
| `surge_indicators` | Buying surge | array |

---

## Events & Signals

### 20. Business Events ✅
**API Endpoint:** `POST /v1/businesses/events`

**Event Types:**
1. `company_awards` - Awards and recognition
2. `office_closing` - Office closures
3. `opens_new_office` - Office openings
4. `new_funding_round` - Funding events
5. `new_product_launch` - Product launches
6. `new_investment` - Investment activities
7. `ipo_announcement` - IPO news
8. `new_partnership` - Partnerships
9. `new_executive_hire` - Executive hires
10. `mergers_and_acquisitions` - M&A activity
11. `lawsuits_legal` - Legal proceedings
12. `outages_breaches` - Security incidents
13. `cost_cutting` - Cost reduction
14. `hiring_by_department` - Department hiring
15. `workforce_increase_decrease` - Headcount changes

| Field Name (API) | Description | Type | Currently Parsed |
|-----------------|-------------|------|-----------------|
| `event_type` | Type of event | string | ✅ (as `signals`) |
| `event_date` | When occurred | date | ❌ |
| `event_title` | Event headline | string | ❌ |
| `event_description` | Full description | string | ❌ |
| `source_url` | News source | string | ❌ |
| `confidence_score` | Confidence | float | ❌ |
| `department` | Affected dept | string | ❌ |
| `impact_level` | Impact (high/med/low) | string | ❌ |

### 21. Prospect Events ✅
**API Endpoint:** `POST /v1/prospects/events`

**Event Types:**
1. `workplace_anniversary` - Tenure milestone
2. `changed_role` - Job title change
3. `changed_workplace` - Company change
4. `new_certification` - New certification
5. `award_received` - Individual award
6. `published_content` - Content published
7. `speaking_engagement` - Conference speaking
8. `promotion` - Promoted

| Field Name (API) | Description | Type | Currently Parsed |
|-----------------|-------------|------|-----------------|
| `event_type` | Type of event | string | ❌ |
| `event_date` | When occurred | date | ❌ |
| `event_title` | Event headline | string | ❌ |
| `previous_value` | Before state | string | ❌ |
| `new_value` | After state | string | ❌ |
| `source_url` | Source | string | ❌ |

---

## Statistics & Analytics

### 22. Business Statistics ✅
**API Endpoint:** `POST /v1/businesses/stats`

Returns aggregated statistics on companies matching filters.

| Field Name (API) | Description | Type | Currently Parsed |
|-----------------|-------------|------|-----------------|
| `total_results` | Total companies | integer | ✅ |
| `industry_distribution` | Industries breakdown | object | ❌ |
| `employee_range_distribution` | Headcount ranges | object | ❌ |
| `revenue_range_distribution` | Revenue ranges | object | ❌ |
| `funding_stage_distribution` | Funding stages | object | ❌ |
| `geography_distribution` | Countries/regions | object | ❌ |
| `technology_distribution` | Tech stack breakdown | object | ❌ |

### 23. Prospect Statistics ✅
**API Endpoint:** `POST /v1/prospects/stats`

Returns aggregated statistics on contacts matching filters.

| Field Name (API) | Description | Type | Currently Parsed |
|-----------------|-------------|------|-----------------|
| `total_results` | Total contacts | integer | ✅ |
| `seniority_distribution` | Seniority levels | object | ❌ |
| `department_distribution` | Departments | object | ❌ |
| `title_distribution` | Job titles | object | ❌ |
| `company_distribution` | Companies | object | ❌ |
| `location_distribution` | Locations | object | ❌ |

---

## Autocomplete ✅
**API Endpoint:** `POST /v1/autocomplete`

| Field Name (API) | Description | Type | Currently Parsed |
|-----------------|-------------|------|-----------------|
| `field` | Field to autocomplete | string | ✅ |
| `query` | Search query | string | ✅ |
| `suggestions` | Suggested values | array | ✅ |

**Supported Fields:**
- `industry`
- `job_title`
- `company_name`
- `technology`
- `location`
- `skills`

---

## Implementation Status Summary

### ✅ Fully Implemented (5 categories)
1. Contact Details (basic fields)
2. Professional Profile (basic fields)
3. Business Events
4. Prospect Events
5. Autocomplete

### 🟡 Partially Implemented (4 categories)
1. Firmographics (endpoint exists, many fields not parsed)
2. Technographics (endpoint exists, categories not detailed)
3. Funding & Acquisitions (endpoint exists, limited parsing)
4. Workforce Trends (endpoint exists, not implemented)

### ❌ Not Implemented (14 categories)
1. Individual's Social Media Presence
2. Webstack
3. Company Hierarchy
4. Financial Metrics for Public Companies
5. Company Ratings by Employees
6. Company's Social Media Presence
7. Strategic Insights on Public Companies
8. Business Challenges
9. Competitive Landscape
10. Lookalike Companies
11. Keyword Search on Websites
12. Website Content Changes
13. Business Intent Topics (Bombora)
14. Enhanced Contact Fields (personal email, phone validation, location, etc.)

---

## Priority Implementation Recommendations

### High Priority (High Value for Sales Automation)
1. **Enhanced Professional Profile Fields** - Skills, experience, education
2. **Workforce Trends by Department** - Hiring signals, growth patterns
3. **Business Intent Topics (Bombora)** - Intent data for outreach timing
4. **Individual's Social Media Presence** - Engagement metrics for personalization
5. **Company's Social Media Presence** - Company activity for hooks

### Medium Priority (Strategic Intelligence)
6. **Financial Metrics** - For qualifying public companies
7. **Competitive Landscape** - For positioning conversations
8. **Strategic Insights** - For C-level conversations
9. **Company Ratings** - For cultural fit assessment

### Lower Priority (Nice to Have)
10. **Webstack** - Detailed tech detection
11. **Company Hierarchy** - Complex org structures
12. **Lookalike Companies** - Expansion targeting
13. **Website Keywords/Changes** - Content monitoring

---

## Next Steps

1. ✅ Document complete catalog (THIS FILE)
2. Update `_parseContactEnrichment()` to extract all professional profile fields
3. Update `_parseCompanyEnrichment()` to extract all firmographic fields
4. Implement high-priority missing endpoints (social media, workforce trends, intent)
5. Add detailed technographics parsing by category
6. Test full enrichment pipeline with real data
