const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function details(contest) {
  const lines = [contest.description, `Take part: ${window.location.origin}`].filter(Boolean);
  if (contest.meetupUrl) lines.push(`Meetup: ${contest.meetupUrl}`);
  return lines.join("\n");
}

export function googleCalendarUrl(contest) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: contest.title,
    dates: `${stamp(contest.startsAt)}/${stamp(contest.endsAt)}`,
    details: details(contest),
    location: window.location.origin,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

const icsEscape = (s) => String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\;");

export function downloadIcs(contest) {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sparx//Contest//EN",
    "BEGIN:VEVENT",
    `UID:${contest.id}@sparx`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(contest.startsAt)}`,
    `DTEND:${stamp(contest.endsAt)}`,
    `SUMMARY:${icsEscape(contest.title)}`,
    `DESCRIPTION:${icsEscape(details(contest))}`,
    `URL:${window.location.origin}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Contest starts in 30 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${contest.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}
