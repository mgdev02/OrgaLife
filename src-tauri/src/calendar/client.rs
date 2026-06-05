use chrono::{DateTime, Datelike, Local, TimeZone};
use serde::{Deserialize, Serialize};

use crate::auth::oauth;

const CALENDAR_EVENTS_URL: &str = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: String,
    pub title: String,
    pub start: String,
    pub end: String,
    pub html_link: Option<String>,
    pub is_all_day: bool,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct EventDateTime {
    date_time: Option<String>,
    date: Option<String>,
}

pub enum CalendarRange {
    Today,
    Week,
    Month,
}

impl CalendarRange {
    pub fn parse(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "week" | "7d" => CalendarRange::Week,
            "month" | "30d" => CalendarRange::Month,
            _ => CalendarRange::Today,
        }
    }

    fn bounds(&self) -> (DateTime<Local>, DateTime<Local>) {
        let now = Local::now();
        let today_start = now
            .date_naive()
            .and_hms_opt(0, 0, 0)
            .map(|t| Local.from_local_datetime(&t).single().unwrap())
            .unwrap_or(now);

        let end = match self {
            CalendarRange::Today => today_start + chrono::Duration::days(1),
            CalendarRange::Week => {
                let days_from_mon = today_start.weekday().num_days_from_monday();
                let week_start = today_start - chrono::Duration::days(days_from_mon as i64);
                week_start + chrono::Duration::days(7)
            }
            CalendarRange::Month => today_start + chrono::Duration::days(31),
        };

        let start = match self {
            CalendarRange::Week => {
                let days_from_mon = today_start.weekday().num_days_from_monday();
                today_start - chrono::Duration::days(days_from_mon as i64)
            }
            _ => today_start,
        };

        (start, end)
    }
}

pub async fn fetch_events(range: &str) -> Result<Vec<CalendarEvent>, String> {
    let range = CalendarRange::parse(range);
    let (time_min, time_max) = range.bounds();

    let token = oauth::get_valid_access_token().await?;
    let client = reqwest::Client::new();

    #[derive(Deserialize)]
    struct EventList {
        items: Option<Vec<GoogleEvent>>,
    }

    #[derive(Deserialize)]
    struct GoogleEvent {
        id: Option<String>,
        summary: Option<String>,
        html_link: Option<String>,
        start: EventDateTime,
        end: EventDateTime,
    }

    let time_min_str = time_min.to_rfc3339();
    let time_max_str = time_max.to_rfc3339();

    let resp = client
        .get(CALENDAR_EVENTS_URL)
        .bearer_auth(&token)
        .query(&[
            ("timeMin", time_min_str.as_str()),
            ("timeMax", time_max_str.as_str()),
            ("singleEvents", "true"),
            ("maxResults", "100"),
        ])
        .send()
        .await
        .map_err(|e| format!("calendar request error: {e}"))?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("calendar API error: {body}"));
    }

    let list: EventList = resp
        .json()
        .await
        .map_err(|e| format!("calendar parse error: {e}"))?;

    let mut events = Vec::new();
    for item in list.items.unwrap_or_default() {
        let id = item.id.unwrap_or_default();
        if id.is_empty() {
            continue;
        }

        let Ok((start, end, is_all_day)) = parse_event_times(&item.start, &item.end) else {
            continue;
        };

        events.push(CalendarEvent {
            id,
            title: item
                .summary
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "(Sin título)".to_string()),
            start,
            end,
            html_link: item.html_link,
            is_all_day,
        });
    }

    events.sort_by(|a, b| a.start.cmp(&b.start));

    Ok(events)
}

fn parse_event_times(
    start: &EventDateTime,
    end: &EventDateTime,
) -> Result<(String, String, bool), String> {
    if let Some(date) = &start.date {
        let end_date = end.date.as_deref().unwrap_or(date.as_str());
        return Ok((
            format!("{date}T00:00:00"),
            format!("{end_date}T23:59:59"),
            true,
        ));
    }

    if let Some(start_dt) = &start.date_time {
        let end_dt = end.date_time.as_deref().unwrap_or(start_dt.as_str());
        return Ok((start_dt.clone(), end_dt.to_string(), false));
    }

    // Algunos eventos (p. ej. cumpleaños) solo traen `date`
    if let Some(date) = &start.date {
        let end_date = end.date.as_deref().unwrap_or(date.as_str());
        return Ok((
            format!("{date}T00:00:00"),
            format!("{end_date}T23:59:59"),
            true,
        ));
    }

    Err("evento sin fecha de inicio".to_string())
}
